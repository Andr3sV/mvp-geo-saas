# Sistema de Cola Robusto para Análisis Diario

## 🎯 Objetivo
Procesar 10,000+ prompts diarios de forma confiable, con recuperación automática de errores y sin items stuck.

## 🏗️ Arquitectura Mejorada

### Componentes

1. **trigger-daily-analysis**
   - Llena la cola rápidamente
   - Dispara 20 workers en paralelo
   - No espera respuestas (fire and forget)

2. **process-queue** (Workers)
   - Procesa lotes de 5 prompts
   - Hasta 20 lotes por invocación (100 prompts)
   - Auto-invocación limitada (hasta 5 veces)
   - **Auto-resetea items stuck** al inicio
   - **Retry automático** de items failed (< 3 intentos)

3. **cleanup_stuck_queue_items** (Función SQL + Cron)
   - Se ejecuta cada hora automáticamente
   - Resetea items stuck en "processing" > 15 minutos
   - Asegura que nada quede atascado

## 🔄 Flujo de Procesamiento

```
Cron (2:00 AM UTC)
  ↓
trigger-daily-analysis
  ↓
Llena cola (10,000 prompts)
  ↓
Dispara 20 workers
  ↓
process-queue (cada worker)
  ↓
1. Resetea items stuck
2. Procesa lotes de 5 prompts
3. Retry automático de failed items
4. Auto-invocación si quedan items
  ↓
cleanup_stuck_queue_items (cada hora)
  ↓
Resetea cualquier item stuck
```

## 🛡️ Mecanismos de Recuperación

### 1. Auto-reset de Items Stuck
- **En process-queue**: Resetea items stuck > 10 minutos al inicio
- **Cron job**: Resetea items stuck > 15 minutos cada hora
- **Resultado**: Items nunca quedan atascados permanentemente

### 2. Retry Automático
- Items failed con < 3 intentos se reintentan automáticamente
- Se procesan después de los pending
- Límite de 3 intentos para evitar loops infinitos

### 3. Manejo de Errores Mejorado
- Captura detalles completos de errores
- Logs detallados para debugging
- Diferencia entre errores temporales y permanentes

## 📊 Monitoreo

### Ver Estado de la Cola
```sql
SELECT 
    status,
    COUNT(*) as cantidad,
    ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM analysis_queue), 2) as porcentaje
FROM analysis_queue
GROUP BY status
ORDER BY 
    CASE status
        WHEN 'pending' THEN 1
        WHEN 'processing' THEN 2
        WHEN 'completed' THEN 3
        WHEN 'failed' THEN 4
    END;
```

### Ver Items Stuck
```sql
SELECT 
    COUNT(*) as stuck_items,
    MIN(updated_at) as mas_antiguo
FROM analysis_queue
WHERE status = 'processing'
  AND updated_at < NOW() - INTERVAL '10 minutes';
```

### Ver Items Failed (para revisar)
```sql
SELECT 
    id,
    prompt_tracking_id,
    attempts,
    error_message,
    updated_at
FROM analysis_queue
WHERE status = 'failed'
ORDER BY updated_at DESC
LIMIT 20;
```

## ⚙️ Configuración

### Variables Ajustables

En `trigger-daily-analysis/index.ts`:
- `NUM_WORKERS = 20` - Número de workers paralelos

En `process-queue/index.ts`:
- `BATCH_SIZE = 5` - Prompts por lote
- `MAX_BATCHES_PER_INVOCATION = 20` - Lotes por invocación
- `MAX_AUTO_INVOCATIONS = 5` - Auto-invocaciones por worker

### Ajustar para Más Capacidad

Si necesitas procesar más de 10,000 prompts:
1. Aumenta `NUM_WORKERS` (ej: 30-50)
2. Aumenta `MAX_BATCHES_PER_INVOCATION` (ej: 30)
3. Aumenta `MAX_AUTO_INVOCATIONS` (ej: 10)

## 🚨 Troubleshooting

### Si hay muchos items stuck
1. Verifica que el cron de cleanup está activo:
```sql
SELECT * FROM cron.job WHERE jobname = 'cleanup-stuck-queue-items';
```

2. Ejecuta cleanup manualmente:
```sql
SELECT * FROM cleanup_stuck_queue_items();
```

### Si hay muchos items failed
1. Revisa los errores:
```sql
SELECT DISTINCT error_message, COUNT(*) 
FROM analysis_queue 
WHERE status = 'failed'
GROUP BY error_message
ORDER BY COUNT(*) DESC;
```

2. Si son errores de API (rate limits, timeouts), considera:
   - Aumentar delays entre lotes
   - Reducir número de workers
   - Procesar en horarios de menor carga

### Si el procesamiento es muy lento
1. Aumenta `NUM_WORKERS`
2. Aumenta `MAX_BATCHES_PER_INVOCATION`
3. Verifica que no hay rate limits de las APIs

## ✅ Checklist de Implementación

- [x] trigger-daily-analysis con fire-and-forget
- [x] process-queue con auto-reset de stuck items
- [x] Retry automático de failed items
- [x] Función SQL cleanup_stuck_queue_items
- [x] Cron job para cleanup automático
- [ ] Monitoreo y alertas (opcional)
- [ ] Dashboard de estado (opcional)

## 📈 Métricas Esperadas

Con 10,000 prompts:
- **Tiempo total**: 2-4 horas (depende de APIs)
- **Tasa de éxito**: > 95% (con retry)
- **Items stuck**: 0 (con cleanup automático)
- **Items failed permanentes**: < 1% (después de 3 intentos)

