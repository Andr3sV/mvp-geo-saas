# Configuración del Cron Job para Análisis de Sentimientos Diario

## 📋 Pasos para configurar en Supabase Dashboard

### 1. Acceder a Cron Jobs

1. Ve a tu proyecto en Supabase Dashboard: https://supabase.com/dashboard/project/sqvhxqbjxetibedzzkyo
2. En el menú lateral, ve a **Database** → **Cron Jobs**
3. Haz clic en **"Create a new cron job"**

### 2. Configurar el Cron Job

**Nombre del Job:**

```
daily-sentiment-analysis
```

**Descripción:**

```
Ejecuta análisis de sentimientos automático diariamente a las 2 AM para todas las respuestas nuevas de AI
```

**Schedule (Cron Expression):**

```
0 2 * * *
```

Esto significa: A las 2:00 AM todos los días

**SQL Command:**

```sql
SELECT
  net.http_post(
    url:='https://sqvhxqbjxetibedzzkyo.supabase.co/functions/v1/daily-sentiment-analysis',
    headers:=jsonb_build_object(
      'Content-Type','application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body:='{}'::jsonb
  ) as request_id;
```

### 3. Configuración usando Migración SQL (RECOMENDADO)

La forma más fácil es ejecutar la migración que ya creamos:

1. Ve a **Database** → **Migrations** en Supabase Dashboard
2. Busca la migración `20250117000004_enable_pg_cron.sql`
3. Haz clic en **"Run migration"**

O ejecuta manualmente en el SQL Editor:

```sql
-- Habilitar extensión pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Dar permisos
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Crear el cron job
SELECT cron.schedule(
  'daily-sentiment-analysis',
  '0 2 * * *',
  $$
  SELECT
    net.http_post(
      url:='https://sqvhxqbjxetibedzzkyo.supabase.co/functions/v1/daily-sentiment-analysis',
      headers:=jsonb_build_object(
        'Content-Type','application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body:='{}'::jsonb
    ) as request_id;
  $$
);
```

**IMPORTANTE**: Si estás en Supabase Cloud, es posible que `pg_cron` no esté disponible en todos los planes. En ese caso, usa la Opción 1 (Database → Cron Jobs en el Dashboard).

### 4. Verificar que el Cron Job está activo

```sql
-- Ver todos los cron jobs
SELECT * FROM cron.job;

-- Ver el historial de ejecuciones
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'daily-sentiment-analysis')
ORDER BY start_time DESC
LIMIT 10;
```

### 5. Probar manualmente (opcional)

Puedes probar la función manualmente antes de esperar a las 2 AM:

```bash
curl -X POST 'https://sqvhxqbjxetibedzzkyo.supabase.co/functions/v1/daily-sentiment-analysis' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json'
```

O desde el Supabase Dashboard:

1. Ve a **Edge Functions** → **daily-sentiment-analysis**
2. Haz clic en **"Invoke function"**
3. Deja el body vacío `{}`
4. Haz clic en **"Send request"**

## 🎯 Cómo Funciona

### Proceso Automático:

1. **2:00 AM cada día**: El cron job se ejecuta automáticamente
2. **Busca proyectos**: Obtiene todos los proyectos activos
3. **Identifica pendientes**: Para cada proyecto, encuentra respuestas sin analizar
4. **Analiza solo nuevas**: Llama a `analyze-sentiment` con `force_reanalysis: false`
5. **Evita duplicados**: No re-analiza respuestas que ya tienen sentimientos
6. **Registra resultados**: Guarda logs de éxito/fallo por proyecto

### Análisis Manual:

- El usuario puede hacer clic en "Analyze New Responses" cuando quiera
- Usa la misma lógica: solo analiza respuestas pendientes
- No interfiere con el análisis automático
- Las respuestas analizadas manualmente NO se vuelven a analizar

## 📊 Monitoreo

### Ver logs de ejecución:

```sql
SELECT
  jobname,
  start_time,
  end_time,
  status,
  return_message
FROM cron.job_run_details
WHERE jobname = 'daily-sentiment-analysis'
ORDER BY start_time DESC
LIMIT 20;
```

### Ver logs de la Edge Function:

1. Ve a **Edge Functions** → **daily-sentiment-analysis**
2. Haz clic en **"Logs"**
3. Verás detalles de cada ejecución

## 🔧 Mantenimiento

### Pausar el cron job:

```sql
SELECT cron.unschedule('daily-sentiment-analysis');
```

### Reactivar el cron job:

Vuelve a ejecutar el comando `cron.schedule` del paso 3

### Cambiar horario:

```sql
-- Primero eliminar el job existente
SELECT cron.unschedule('daily-sentiment-analysis');

-- Crear con nuevo horario (ejemplo: 3 AM)
SELECT cron.schedule(
  'daily-sentiment-analysis',
  '0 3 * * *',  -- nueva hora
  $$ ... mismo SQL ... $$
);
```

## ⚠️ Notas Importantes

1. **Zona horaria**: El cron usa UTC por defecto. Si quieres 2 AM en tu zona horaria local, ajusta la hora en consecuencia.
2. **Service Role Key**: Asegúrate de que la variable `app.settings.service_role_key` esté configurada en Supabase.
3. **Límites**: Supabase tiene límites en el plan gratuito para cron jobs. Verifica tu plan.
4. **Timeout**: La Edge Function tiene un timeout de 150 segundos. Si tienes muchos proyectos, considera procesar en lotes.

## 🎉 Resultado Esperado

Cada día a las 2 AM:

- ✅ Se analizan automáticamente todas las respuestas nuevas
- ✅ No se duplican análisis
- ✅ Los usuarios ven datos actualizados sin intervención manual
- ✅ El botón manual sigue disponible para análisis inmediatos
