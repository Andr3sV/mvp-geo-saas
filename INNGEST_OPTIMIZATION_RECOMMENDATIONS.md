# Recomendaciones para Optimizar Uso de Inngest

## Situación Actual
- **Uso actual**: 55,407 ejecuciones (110% del límite gratuito de 50,000)
- **Límite**: 50,000 ejecuciones/mes
- **Impacto**: Todas las funciones de Inngest dejarán de ejecutarse si se supera el límite

## Funciones que Usan Inngest

### 1. `processPrompt` (Más crítico)
- **Cuándo se ejecuta**:
  - Cuando se crea un prompt nuevo (inmediato)
  - Diariamente a la 1 AM para todos los prompts activos (cron job)
- **Configuración actual**: `retries: 3` (cada fallo genera hasta 4 ejecuciones)
- **Concurrencia**: 5 prompts simultáneos
- **Impacto**: ALTO - Esta es probablemente la función más utilizada

### 2. `scheduleAnalysis` (Cron diario)
- **Cuándo se ejecuta**: Diariamente a la 1 AM
- **Acción**: Dispara múltiples eventos `analysis/process-prompt`
- **Impacto**: MEDIO - Solo 1 ejecución diaria, pero dispara muchas otras

### 3. `analyzeBrandWebsite`
- **Cuándo se ejecuta**: Cuando se crea un proyecto nuevo
- **Impacto**: BAJO - Solo cuando se crean proyectos nuevos

### 4. `aggregateDailyStats`, `aggregateProjectStats`
- **Cuándo se ejecuta**: Programado o manualmente
- **Impacto**: MEDIO-BAJO

### 5. Otras funciones
- `analyzeSingleResponse`
- `scheduleSentimentEvaluation`
- `processSingleSentimentEvaluation`
- `analyzeBrandsBatch`

## Recomendaciones de Optimización

### 1. Reducir Reintentos en `processPrompt`
**Archivo**: `backend-orchestrator/src/inngest/functions/process-prompt.ts`

**Cambio propuesto**:
```typescript
retries: 3  // Actual
// Cambiar a:
retries: 1  // Reducir a 1 reintento
```

**Ahorro estimado**: Si hay ~20% de fallos, esto podría reducir ~15-20% de ejecuciones relacionadas con reintentos.

### 2. Ajustar Frecuencia del Cron Job
**Archivo**: `backend-orchestrator/src/inngest/functions/schedule-analysis.ts`

**Cambio propuesto**:
```typescript
{ cron: "0 1 * * *" }  // Actual: Diario a la 1 AM
// Opciones:
{ cron: "0 2 * * 0" }  // Semanal: Domingos a las 2 AM
{ cron: "0 1 * * 1,4" }  // 2 veces por semana: Lunes y Jueves
```

**Consideración**: Esto afectaría la frecuencia de actualización de datos, pero reduciría significativamente las ejecuciones.

### 3. Mejorar Detección de Duplicados
El código ya verifica si hay respuestas exitosas del día actual antes de procesar. Asegurar que esto funciona correctamente.

### 4. Consolidar Funciones de Agregación
Revisar si `aggregateDailyStats`, `aggregateProjectStats` y `backfillProjectStats` se pueden consolidar o ejecutar con menos frecuencia.

### 5. Monitoreo y Alertas
Implementar alertas cuando se acerque al límite (ej: 80% del límite).

## Acción Inmediata Requerida

**URGENTE**: Actualizar el plan de Inngest para evitar interrupciones en el servicio.

1. Ir a https://app.inngest.com/settings/billing
2. Revisar los planes disponibles
3. Considerar el plan que mejor se ajuste a tus necesidades

## Planes de Inngest (Información General)

- **Free**: 50,000 ejecuciones/mes (actual)
- **Pro**: Generalmente incluye más ejecuciones y características adicionales
- Revisar precios actualizados en el dashboard de Inngest

## Cálculo Estimado de Uso

Con ~55,000 ejecuciones este mes:
- Si tienes 100 prompts activos procesándose diariamente: ~100 ejecuciones/día × 4 plataformas = ~400 ejecuciones/día solo del cron
- 400 ejecuciones/día × 30 días = ~12,000 ejecuciones/mes solo del cron diario
- El resto viene de:
  - Procesamiento inmediato cuando se crean prompts
  - Reintentos por fallos
  - Análisis de sitios web
  - Otras funciones

## Próximos Pasos

1. ✅ **Actualizar plan de Inngest** (URGENTE)
2. ⏱️ Implementar optimizaciones sugeridas
3. 📊 Monitorear uso después de optimizaciones
4. 🔄 Ajustar según necesidades

