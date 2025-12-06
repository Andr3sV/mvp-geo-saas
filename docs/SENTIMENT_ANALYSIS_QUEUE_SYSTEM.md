# Sistema de Cola para Análisis de Sentimiento

## Resumen

Este documento describe el sistema de cola implementado para el análisis de sentimiento, que permite procesar miles de respuestas de forma eficiente y robusta.

## Arquitectura

```
daily-sentiment-analysis (cron job diario a las 3:00 AM)
  └── Encuentra todas las respuestas sin analizar
      └── Inserta en sentiment_analysis_queue
          └── Invoca múltiples workers process-sentiment-queue
              └── Cada worker procesa batches de 10 respuestas
                  └── Llama a analyze-sentiment para cada respuesta
                      └── Auto-invoca si hay más items pendientes
```

## Componentes

### 1. Tabla `sentiment_analysis_queue`

Almacena las respuestas pendientes de análisis de sentimiento:

- `id`: UUID único
- `ai_response_id`: Referencia a la respuesta a analizar
- `project_id`: Proyecto al que pertenece
- `status`: `pending`, `processing`, `completed`, `failed`
- `attempts`: Número de intentos (máximo 3)
- `batch_id`: Agrupa items del mismo batch diario
- `error_message`: Mensaje de error si falla
- `created_at`, `updated_at`: Timestamps

### 2. Edge Function: `daily-sentiment-analysis`

**Propósito**: Trigger diario que llena la cola

**Funcionamiento**:
1. Encuentra todas las respuestas sin analizar en todos los proyectos
2. Las inserta en `sentiment_analysis_queue` en batches de 100
3. Invoca 10 workers `process-sentiment-queue` en paralelo (fire-and-forget)

**Cron Job**: Se ejecuta diariamente a las 3:00 AM UTC

### 3. Edge Function: `trigger-sentiment-analysis`

**Propósito**: Trigger manual desde el frontend

**Funcionamiento**:
1. Encuentra respuestas sin analizar para un proyecto específico
2. Las inserta en `sentiment_analysis_queue`
3. Invoca workers en paralelo (número escalado según el tamaño de la cola)

**Uso**: Cuando el usuario hace clic en "Update Analysis" en el frontend

### 4. Edge Function: `process-sentiment-queue`

**Propósito**: Worker que procesa la cola

**Funcionamiento**:
1. Toma 10 respuestas pendientes de la cola
2. Para cada respuesta, invoca `analyze-sentiment`
3. Actualiza el estado (completed/failed)
4. Auto-invoca si hay más items pendientes (hasta 5 veces)
5. Reintenta automáticamente items fallidos (hasta 3 intentos)

**Características**:
- Procesa en batches de 10 respuestas
- Máximo 10 batches por invocación (100 respuestas)
- Auto-invocación limitada a 5 veces para evitar recursión infinita
- Resetea items atascados en "processing" por más de 10 minutos

### 5. Edge Function: `analyze-sentiment`

**Propósito**: Analiza una respuesta específica usando Gemini 2.0 Flash

**Funcionamiento**:
1. Obtiene la respuesta de `ai_responses`
2. Llama a Gemini API para análisis de sentimiento
3. Guarda resultados en `sentiment_analysis`

**Nota**: Esta función se mantiene para uso directo, pero ahora se usa principalmente a través de la cola.

## Flujo de Datos

### Análisis Diario Automático

```
1. Cron job ejecuta daily-sentiment-analysis a las 3:00 AM
   ↓
2. Encuentra todas las respuestas sin analizar
   ↓
3. Inserta en sentiment_analysis_queue (batch_id único)
   ↓
4. Invoca 10 workers process-sentiment-queue en paralelo
   ↓
5. Cada worker procesa batches de 10 respuestas
   ↓
6. Para cada respuesta, invoca analyze-sentiment
   ↓
7. analyze-sentiment llama a Gemini API y guarda resultados
   ↓
8. Worker actualiza estado en la cola
   ↓
9. Si hay más items, worker se auto-invoca (hasta 5 veces)
   ↓
10. Proceso continúa hasta que la cola esté vacía
```

### Análisis Manual (Frontend)

```
1. Usuario hace clic en "Update Analysis"
   ↓
2. Frontend llama a triggerSentimentAnalysis()
   ↓
3. triggerSentimentAnalysis invoca trigger-sentiment-analysis
   ↓
4. trigger-sentiment-analysis encuentra respuestas sin analizar del proyecto
   ↓
5. Inserta en sentiment_analysis_queue
   ↓
6. Invoca workers (número escalado según tamaño)
   ↓
7. Workers procesan igual que en análisis diario
```

## Ventajas del Sistema de Cola

1. **Escalabilidad**: Puede procesar miles de respuestas sin problemas
2. **Robustez**: Reintentos automáticos y manejo de errores
3. **Eficiencia**: Procesamiento en paralelo con múltiples workers
4. **Monitoreo**: Estado visible en la tabla `sentiment_analysis_queue`
5. **Sin Timeouts**: Auto-invocación evita límites de tiempo de Edge Functions
6. **Resiliencia**: Resetea items atascados automáticamente

## Configuración

### 1. Ejecutar Migración SQL

```sql
-- Ejecutar en Supabase SQL Editor
-- Ver: supabase/migrations/20250129000001_create_sentiment_analysis_queue.sql
```

### 2. Configurar Cron Job

```sql
-- Ejecutar en Supabase SQL Editor
-- Ver: setup-sentiment-analysis-cron.sql
-- IMPORTANTE: Reemplazar TU_PROJECT_REF y TU_SERVICE_ROLE_KEY
```

### 3. Desplegar Edge Functions

```bash
# Desde el directorio del proyecto
npx supabase functions deploy daily-sentiment-analysis
npx supabase functions deploy trigger-sentiment-analysis
npx supabase functions deploy process-sentiment-queue
```

## Monitoreo

### Ver Estado de la Cola

```sql
-- Ver items pendientes
SELECT COUNT(*) FROM sentiment_analysis_queue WHERE status = 'pending';

-- Ver items en procesamiento
SELECT COUNT(*) FROM sentiment_analysis_queue WHERE status = 'processing';

-- Ver items fallidos
SELECT COUNT(*) FROM sentiment_analysis_queue WHERE status = 'failed';

-- Ver progreso por batch
SELECT 
  batch_id,
  status,
  COUNT(*) as count
FROM sentiment_analysis_queue
GROUP BY batch_id, status
ORDER BY batch_id DESC;
```

### Ver Logs

- **Supabase Dashboard** → Edge Functions → Logs
- Filtrar por función: `daily-sentiment-analysis`, `trigger-sentiment-analysis`, `process-sentiment-queue`

## Troubleshooting

### Items Atascados en "processing"

El sistema automáticamente resetea items en "processing" por más de 10 minutos. Si persisten:

```sql
-- Reset manual
UPDATE sentiment_analysis_queue
SET status = 'pending', updated_at = NOW()
WHERE status = 'processing' 
  AND updated_at < NOW() - INTERVAL '10 minutes';
```

### Items Fallidos

Items con `status = 'failed'` y `attempts >= 3` no se reintentarán automáticamente. Para reintentar:

```sql
-- Reset para reintentar
UPDATE sentiment_analysis_queue
SET status = 'pending', attempts = 0, error_message = NULL
WHERE status = 'failed' AND attempts >= 3;
```

### Procesamiento Lento

Si el procesamiento es lento:

1. Verificar que los workers se están invocando (logs)
2. Verificar que `analyze-sentiment` no tiene errores
3. Aumentar `NUM_WORKERS` en `daily-sentiment-analysis` y `trigger-sentiment-analysis`
4. Verificar límites de rate de Gemini API

## Comparación con Sistema Anterior

### Antes (Sin Cola)
- ❌ Límite de 50 respuestas por invocación
- ❌ Procesamiento secuencial (lento)
- ❌ No había paginación automática
- ❌ Timeouts frecuentes
- ❌ No había reintentos automáticos

### Ahora (Con Cola)
- ✅ Sin límite de respuestas (procesa todas)
- ✅ Procesamiento en paralelo (rápido)
- ✅ Paginación automática con auto-invocación
- ✅ Sin timeouts (auto-invocación)
- ✅ Reintentos automáticos (hasta 3 intentos)

