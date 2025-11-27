# Sistema de Análisis Diario Automático

## 📋 Descripción General

El sistema de análisis diario automático ejecuta análisis de IA para todos los prompts activos en Supabase cada día a las 2:00 AM. Está diseñado para manejar miles de prompts de manera eficiente sin saturar las APIs de los proveedores de LLM.

## 🎯 Objetivo

- **Automatizar** el análisis diario de todos los prompts activos
- **Procesar** miles de prompts sin saturar los servicios
- **Ejecutar** análisis en todos los LLMs disponibles: Perplexity (Web Search), Google Gemini (Web Search), OpenAI (GPT-4), Anthropic Claude
- **Garantizar** que el sistema sea resiliente y maneje errores automáticamente

## 🏗️ Arquitectura

El sistema está compuesto por tres componentes principales:

### 1. Tabla de Cola (`analysis_queue`)

Almacena todos los trabajos de análisis pendientes, procesándose y completados.

**Estructura:**
- `id` - UUID único del trabajo
- `prompt_tracking_id` - Referencia al prompt a analizar
- `project_id` - Referencia al proyecto
- `status` - Estado: `pending`, `processing`, `completed`, `failed`
- `attempts` - Número de intentos realizados (máximo 3)
- `batch_id` - ID del lote diario
- `error_message` - Mensaje de error si falla
- `created_at` / `updated_at` - Timestamps

### 2. Edge Function: `trigger-daily-analysis`

**Propósito:** Se ejecuta diariamente a las 2:00 AM vía cron job para:
- Buscar todos los prompts activos (`is_active = true`)
- Insertarlos en la cola `analysis_queue`
- Iniciar el procesamiento llamando a `process-queue`

**Características:**
- Maneja paginación para miles de prompts (1000 a la vez)
- Agrupa trabajos por `batch_id` para seguimiento
- Inserta en lotes de 100 para optimizar la base de datos

### 3. Edge Function: `process-queue`

**Propósito:** Procesa los trabajos de la cola en lotes pequeños:
- Toma 5 prompts a la vez (para evitar timeouts y saturación)
- Ejecuta análisis en **todos los LLMs** para cada prompt
- Se auto-invoca recursivamente hasta procesar toda la cola
- Maneja reintentos automáticos (máximo 3 intentos por prompt)

**Características:**
- Procesamiento en lotes de 5 prompts simultáneos
- Reintento automático hasta 3 veces en caso de fallo
- Auto-continuación: se invoca a sí mismo cuando hay más trabajos pendientes
- Registro de errores para diagnóstico

## 🔄 Flujo de Ejecución

```
1. Cron Job (2:00 AM diario)
   ↓
2. trigger-daily-analysis
   ├─ Busca todos los prompts activos
   ├─ Inserta en analysis_queue (status: pending)
   └─ Invoca process-queue
       ↓
3. process-queue (procesa en lotes de 5)
   ├─ Toma 5 prompts pendientes
   ├─ Para cada prompt:
   │   └─ Invoca analyze-prompt con [perplexity, gemini, openai, claude]
   ├─ Actualiza status a 'completed' o 'failed'
   └─ Si hay más pendientes:
       └─ Se auto-invoca recursivamente
```

## 📦 Componentes del Sistema

### Archivos de Código

- `supabase/functions/trigger-daily-analysis/index.ts` - Función que dispara el análisis diario
- `supabase/functions/process-queue/index.ts` - Worker que procesa la cola
- `supabase/functions/shared/utils.ts` - Utilidades compartidas (logging, etc.)
- `supabase/migrations/20250127000001_create_analysis_queue.sql` - Migración de la tabla
- `setup-daily-analysis.sql` - Script de configuración completo

### Tablas de Base de Datos

- `analysis_queue` - Cola de trabajos de análisis
- `prompt_tracking` - Prompts a analizar (solo los activos)
- `ai_responses` - Resultados del análisis (creados por `analyze-prompt`)

## ⚙️ Configuración

### Requisitos Previos

1. **Extensiones de PostgreSQL habilitadas:**
   - `pg_cron` - Para programar tareas
   - `pg_net` - Para hacer peticiones HTTP desde la base de datos

2. **Edge Functions desplegadas:**
   ```bash
   npx supabase functions deploy trigger-daily-analysis --no-verify-jwt
   npx supabase functions deploy process-queue --no-verify-jwt
   ```

3. **Secretos configurados en Supabase:**
   - `SUPABASE_URL` - URL de tu proyecto
   - `SUPABASE_SERVICE_ROLE_KEY` - Clave de servicio (para autenticación)

### Instalación

1. **Ejecutar el script de configuración:**

   Abre `setup-daily-analysis.sql` en el SQL Editor de Supabase y:
   - Reemplaza `TU_SERVICE_ROLE_KEY` con tu Service Role Key real
   - Ejecuta todo el script

2. **Verificar la instalación:**

   ```sql
   -- Verificar que el cron job se creó
   SELECT * FROM cron.job WHERE jobname = 'daily-analysis-trigger';
   
   -- Verificar que la tabla existe
   SELECT COUNT(*) FROM analysis_queue;
   ```

## 📊 Monitoreo

### Consultas Útiles

**Estado general de la cola:**
```sql
SELECT 
    status, 
    COUNT(*) as count,
    MIN(created_at) as oldest,
    MAX(created_at) as newest
FROM analysis_queue 
GROUP BY status
ORDER BY status;
```

**Trabajos fallidos:**
```sql
SELECT 
    id,
    prompt_tracking_id,
    error_message,
    attempts,
    created_at
FROM analysis_queue 
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 20;
```

**Progreso del batch actual:**
```sql
SELECT 
    batch_id,
    status,
    COUNT(*) as count
FROM analysis_queue
WHERE batch_id IS NOT NULL
GROUP BY batch_id, status
ORDER BY batch_id DESC, status;
```

**Prompts en proceso (tiempo real):**
```sql
SELECT 
    q.id,
    q.prompt_tracking_id,
    pt.prompt,
    q.attempts,
    q.updated_at
FROM analysis_queue q
JOIN prompt_tracking pt ON pt.id = q.prompt_tracking_id
WHERE q.status = 'processing'
ORDER BY q.updated_at DESC;
```

### Logs de Edge Functions

Los logs están disponibles en:
- **Supabase Dashboard** → **Edge Functions** → Selecciona la función → **Logs**

Busca en los logs:
- `[INFO]` - Información general del flujo
- `[ERROR]` - Errores que requieren atención

## 🔧 Troubleshooting

### El cron job no se ejecuta

1. Verificar que el cron job está activo:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'daily-analysis-trigger';
   ```
   El campo `active` debe ser `true`.

2. Verificar que `pg_cron` está habilitado:
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_cron';
   ```

3. Revisar logs del cron job:
   ```sql
   SELECT * FROM cron.job_run_details 
   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'daily-analysis-trigger')
   ORDER BY start_time DESC 
   LIMIT 10;
   ```

### La cola no se está procesando

1. Verificar que `process-queue` puede invocarse:
   - Ve a Edge Functions → `process-queue` → **Invoke** (manualmente)
   - Si falla, revisa los logs de la función

2. Verificar prompts pendientes:
   ```sql
   SELECT COUNT(*) FROM analysis_queue WHERE status = 'pending';
   ```

3. Verificar que hay prompts activos:
   ```sql
   SELECT COUNT(*) FROM prompt_tracking WHERE is_active = true;
   ```

### Errores frecuentes

**"Analysis function error":**
- Verifica que `analyze-prompt` Edge Function está desplegada
- Revisa que los secretos de las APIs (OpenAI, Gemini, etc.) estén configurados
- Verifica los logs de `analyze-prompt` para más detalles

**"Failed to fetch prompts":**
- Verifica permisos RLS en `prompt_tracking`
- Revisa que la tabla existe y tiene datos

**"Queue is empty" pero hay prompts activos:**
- Verifica que `trigger-daily-analysis` se ejecutó correctamente
- Revisa los logs de `trigger-daily-analysis` para ver errores

### Ejecución Manual

Para probar el sistema sin esperar al cron job:

**1. Disparar el análisis manualmente:**
```sql
SELECT
  net.http_post(
      url:='https://TU_PROJECT_REF.supabase.co/functions/v1/trigger-daily-analysis',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer TU_SERVICE_ROLE_KEY"}'::jsonb,
      body:='{}'::jsonb
  );
```

**2. Procesar la cola manualmente:**
```sql
SELECT
  net.http_post(
      url:='https://TU_PROJECT_REF.supabase.co/functions/v1/process-queue',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer TU_SERVICE_ROLE_KEY"}'::jsonb,
      body:='{}'::jsonb
  );
```

## 🚀 Optimizaciones y Mejoras Futuras

### Mejoras Potenciales

1. **Ajustar el tamaño del lote:**
   - Actualmente procesa 5 prompts a la vez
   - Puede ajustarse en `process-queue/index.ts` (línea 29: `BATCH_SIZE`)

2. **Añadir delays entre lotes:**
   - Para respetar mejor los rate limits de las APIs
   - Puede añadirse un `setTimeout` antes de la auto-invocación

3. **Priorización de prompts:**
   - Agregar un campo `priority` a `analysis_queue`
   - Modificar la consulta para ordenar por prioridad

4. **Notificaciones:**
   - Enviar alertas cuando un batch falla completamente
   - Notificar cuando todos los análisis diarios están completos

5. **Métricas y Dashboard:**
   - Crear una vista para estadísticas de procesamiento
   - Tiempo promedio de procesamiento por prompt
   - Tasa de éxito/fallo por día

## 📝 Notas Importantes

- **Hora del servidor:** El cron job usa la hora del servidor de Supabase (UTC por defecto). Ajusta la expresión cron si necesitas otra zona horaria.
- **Rate Limits:** El sistema procesa en lotes pequeños para respetar los rate limits de las APIs de LLM. No aumentes demasiado el `BATCH_SIZE` sin considerar esto.
- **Costos:** El análisis de miles de prompts diariamente genera costos en las APIs de LLM. Monitorea el uso en los dashboards de cada proveedor.
- **Reintentos:** Los prompts que fallan 3 veces se marcan como `failed` y no se reintentan automáticamente. Revisa periódicamente los fallos para tomar acción manual si es necesario.

## 🔗 Referencias

- [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions)
- [pg_cron Documentation](https://github.com/citusdata/pg_cron)
- [Cron Expression Format](https://crontab.guru/)

---

**Última actualización:** Enero 2025  
**Mantenido por:** Equipo de Desarrollo

