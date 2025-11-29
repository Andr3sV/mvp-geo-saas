# Diagnóstico: Sistema de Sentiment Analysis

## Problemas Identificados

### 1. **Límite de Batch Muy Pequeño**
- `analyze-sentiment` procesa solo **50 respuestas por invocación** (línea 102)
- Con miles de respuestas, esto requiere cientos de invocaciones
- No hay mecanismo para procesar automáticamente el siguiente batch

### 2. **Procesamiento Secuencial**
- `analyze-sentiment` procesa respuestas una por una en un loop `for` (línea 121)
- Cada respuesta espera a que la anterior termine antes de continuar
- Con llamadas a Gemini API, esto es extremadamente lento

### 3. **No Hay Sistema de Cola**
- A diferencia del sistema de análisis diario de prompts (que usa `analysis_queue`), el sentiment analysis no tiene cola
- `daily-sentiment-analysis` invoca `analyze-sentiment` una vez por proyecto, pero solo procesa 50 respuestas
- No hay mecanismo para continuar procesando el resto de respuestas

### 4. **Falta de Paginación**
- `analyze-sentiment` no implementa paginación para procesar todas las respuestas
- Una vez que procesa 50, se detiene y no continúa con las siguientes

### 5. **Problemas con Timeouts**
- Edge Functions tienen un límite de tiempo (típicamente 60 segundos)
- Procesar 50 respuestas secuencialmente puede exceder este límite
- No hay manejo de timeouts o reanudación

### 6. **daily-sentiment-analysis es Ineficiente**
- Invoca `analyze-sentiment` una vez por proyecto
- No espera a que termine completamente antes de continuar
- No maneja el caso donde hay más de 50 respuestas sin analizar

## Arquitectura Actual

```
daily-sentiment-analysis (cron job)
  └── Para cada proyecto:
      └── Invoca analyze-sentiment una vez
          └── Procesa máximo 50 respuestas
              └── Loop secuencial (lento)
                  └── Llama a Gemini API por cada respuesta
```

## Solución Propuesta

### Opción 1: Sistema de Cola Similar a Análisis Diario (RECOMENDADO)

Crear un sistema de cola similar al de `analysis_queue`:

1. **Crear tabla `sentiment_analysis_queue`**:
   - `id`, `ai_response_id`, `project_id`, `status`, `attempts`, `created_at`, `updated_at`, `error_message`, `batch_id`

2. **Modificar `daily-sentiment-analysis`**:
   - En lugar de invocar `analyze-sentiment` directamente, insertar todas las respuestas sin analizar en la cola
   - Invocar múltiples workers `process-sentiment-queue` en paralelo

3. **Crear `process-sentiment-queue` Edge Function**:
   - Similar a `process-queue` pero para sentiment analysis
   - Procesa batches de respuestas en paralelo
   - Auto-invoca si hay más items pendientes

4. **Modificar `analyze-sentiment`**:
   - Mantener para uso manual (una respuesta específica)
   - O eliminar y usar solo el sistema de cola

### Opción 2: Mejoras Incrementales (MÁS RÁPIDO)

1. **Aumentar el límite de batch** de 50 a 500
2. **Procesar en paralelo** usando `Promise.all()` en lugar de loop secuencial
3. **Implementar paginación** en `analyze-sentiment` para continuar procesando
4. **Modificar `daily-sentiment-analysis`** para invocar múltiples veces hasta que no queden respuestas

## Comparación con Sistema de Análisis Diario

El sistema de análisis diario de prompts funciona bien porque:
- ✅ Usa una cola (`analysis_queue`)
- ✅ Tiene workers que procesan en paralelo (`process-queue`)
- ✅ Auto-invoca workers adicionales si hay más items
- ✅ Maneja errores y reintentos
- ✅ Procesa en batches pequeños pero eficientes

El sistema de sentiment analysis NO tiene:
- ❌ Sistema de cola
- ❌ Workers paralelos
- ❌ Auto-invocación
- ❌ Manejo robusto de errores
- ❌ Procesamiento eficiente

## Recomendación

**Implementar Opción 1** (Sistema de Cola) porque:
1. Ya tenemos un patrón probado y funcionando (análisis diario)
2. Escala mejor con miles de respuestas
3. Es más robusto ante errores
4. Permite monitoreo del progreso
5. Puede procesar en background sin timeouts

## Próximos Pasos

1. Crear migración SQL para `sentiment_analysis_queue`
2. Crear `process-sentiment-queue` Edge Function
3. Modificar `daily-sentiment-analysis` para usar la cola
4. Actualizar cron job si es necesario
5. Probar con un proyecto que tenga miles de respuestas

