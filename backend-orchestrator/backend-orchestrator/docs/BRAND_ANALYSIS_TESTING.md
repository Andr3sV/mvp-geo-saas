# Guía de Pruebas: Sistema de Análisis de Marca con Groq

## Pasos Previos

### 1. Aplicar Migración en Supabase

1. Ve a tu proyecto en Supabase Dashboard
2. Navega a **SQL Editor**
3. Ejecuta la migración: `supabase/migrations/20251207185555_create_brand_analysis_tables.sql`
   - O usa el CLI: `supabase migration up`

4. Verifica que las tablas se crearon correctamente:
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('brand_mentions', 'brand_sentiment_attributes', 'potential_competitors');
   ```

### 2. Configurar Variable de Entorno

En Railway (o tu plataforma de despliegue):

1. Ve a la configuración del servicio `backend-orchestrator`
2. Agrega la variable de entorno:
   ```
   GROQ_API_KEY=tu_api_key_de_groq
   ```

3. **Obtener API Key de Groq:**
   - Ve a [console.groq.com](https://console.groq.com)
   - Crea una cuenta o inicia sesión
   - Ve a **API Keys**
   - Crea una nueva API key
   - Cópiala y agrégala a Railway

4. **Reinicia el servicio** para que tome la nueva variable

### 3. Verificar que el Servicio Está Corriendo

Después del deploy, verifica que el servicio esté funcionando:

```bash
curl https://tu-backend-orchestrator-url.railway.app/health
```

Deberías ver:
```json
{
  "status": "ok",
  "timestamp": "2025-12-07T..."
}
```

## Pruebas Manuales

### Prueba 1: Análisis Individual de una Respuesta

**Opción A: Usando el endpoint de Inngest directamente**

1. Primero, necesitas tener al menos una respuesta exitosa en `ai_responses`:
   ```sql
   SELECT id, project_id, response_text, status 
   FROM ai_responses 
   WHERE status = 'success' 
   AND response_text IS NOT NULL 
   LIMIT 1;
   ```

2. Usa el cliente de Inngest o curl para disparar el evento:
   ```bash
   curl -X POST https://tu-backend-orchestrator-url.railway.app/api/inngest \
     -H "Content-Type: application/json" \
     -d '{
       "name": "brand/analyze-response",
       "data": {
         "ai_response_id": "tu-ai-response-id",
         "project_id": "tu-project-id"
       }
     }'
   ```

**Opción B: Usando la UI de Inngest**

1. Ve a tu dashboard de Inngest: [app.inngest.com](https://app.inngest.com)
2. Selecciona tu app
3. Ve a **Functions** → busca `analyze-single-response`
4. Haz clic en **Trigger** → **Send Event**
5. Usa este payload:
   ```json
   {
     "name": "brand/analyze-response",
     "data": {
       "ai_response_id": "tu-ai-response-id",
       "project_id": "tu-project-id"
     }
   }
   ```

### Prueba 2: Verificar Resultados en Supabase

Después de ejecutar el análisis, verifica que los datos se guardaron:

1. **Verificar menciones de marca:**
   ```sql
   SELECT * FROM brand_mentions 
   WHERE ai_response_id = 'tu-ai-response-id'
   ORDER BY created_at DESC;
   ```

2. **Verificar sentimiento y atributos:**
   ```sql
   SELECT * FROM brand_sentiment_attributes 
   WHERE ai_response_id = 'tu-ai-response-id'
   ORDER BY created_at DESC;
   ```

3. **Verificar marcas potenciales:**
   ```sql
   SELECT * FROM potential_competitors 
   WHERE project_id = 'tu-project-id'
   ORDER BY first_detected_at DESC;
   ```

### Prueba 3: Disparar Análisis Batch

El batch se ejecuta automáticamente a las 3:00 AM. Para probarlo manualmente:

1. **Opción A: Desde Inngest Dashboard**
   - Ve a **Functions** → `analyze-brands-batch`
   - Haz clic en **Trigger** → **Run Now**

2. **Opción B: Esperar al cron**
   - El batch se ejecuta diariamente a las 3:00 AM
   - Puedes verificar los logs en Railway después de ese horario

## Verificación de Funcionamiento

### 1. Verificar Logs en Railway

Ve a Railway → Tu servicio → **Logs** y busca:

```
[INFO] [analyze-single-response] Starting brand analysis for response...
[INFO] [brand-analysis] Starting brand analysis
[INFO] [groq-client] Completion successful. Tokens: ...
[INFO] [brand-storage] Saved X brand mentions
[INFO] [brand-storage] Saved X sentiment attributes
```

### 2. Verificar que las Funciones Están Registradas

En los logs del servicio al iniciar, deberías ver:

```
✅ Functions registered: ..., analyze-brands-batch, analyze-single-response
```

### 3. Verificar Datos en Supabase

Ejecuta estas queries para ver un resumen:

```sql
-- Resumen de análisis por proyecto
SELECT 
  bsa.project_id,
  COUNT(DISTINCT bsa.ai_response_id) as responses_analyzed,
  COUNT(DISTINCT CASE WHEN bsa.brand_type = 'client' THEN bsa.id END) as client_mentions,
  COUNT(DISTINCT CASE WHEN bsa.brand_type = 'competitor' THEN bsa.id END) as competitor_mentions,
  COUNT(DISTINCT pc.id) as potential_competitors_found
FROM brand_sentiment_attributes bsa
LEFT JOIN potential_competitors pc ON pc.project_id = bsa.project_id
GROUP BY bsa.project_id;

-- Ver sentimientos detectados
SELECT 
  sentiment,
  COUNT(*) as count,
  AVG(sentiment_rating) as avg_rating
FROM brand_sentiment_attributes
GROUP BY sentiment;
```

## Troubleshooting

### Error: "Missing GROQ_API_KEY"

- Verifica que la variable de entorno esté configurada en Railway
- Reinicia el servicio después de agregar la variable
- Verifica en los logs que no haya errores al iniciar

### Error: "Failed to parse brand analysis JSON"

- Revisa los logs para ver la respuesta completa de Groq
- El modelo puede estar devolviendo JSON inválido
- Verifica que el prompt esté correctamente formateado

### No se guardan datos en las tablas

- Verifica los permisos RLS en Supabase
- Asegúrate de que el servicio use `SUPABASE_SERVICE_ROLE_KEY`
- Revisa los logs para ver errores de inserción

### El batch no encuentra respuestas

- Verifica que haya respuestas con `status = 'success'` en `ai_responses`
- Verifica que las respuestas tengan `response_text` no nulo
- El batch solo procesa respuestas que aún no han sido analizadas

## Próximos Pasos

1. **Monitorear costo de Groq:**
   - Revisa el dashboard de Groq para ver uso de tokens
   - El modelo `gpt-oss-20b` es muy económico

2. **Ajustar frecuencia del batch:**
   - Por defecto corre a las 3:00 AM
   - Puedes cambiar el cron en `analyze-brands-batch.ts`

3. **Mejorar la extracción de menciones:**
   - Actualmente usa un enfoque simplificado
   - Puedes mejorar usando índices más precisos del texto

4. **Integrar con el frontend:**
   - Crear queries para mostrar datos de análisis
   - Mostrar marcas potenciales en el dashboard

