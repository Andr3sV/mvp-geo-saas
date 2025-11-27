# Sistema de Análisis Diario Automático - Resumen Ejecutivo

## 🎯 ¿Qué es?

Sistema automatizado que ejecuta análisis de IA para **todos los prompts activos** cada día a las **2:00 AM**, procesando miles de prompts sin saturar los servicios.

## ⚡ Inicio Rápido

### Instalación (Una vez)

1. **Desplegar funciones:**
   ```bash
   npx supabase functions deploy trigger-daily-analysis --no-verify-jwt
   npx supabase functions deploy process-queue --no-verify-jwt
   ```

2. **Configurar base de datos:**
   - Abre `setup-daily-analysis.sql`
   - Reemplaza `TU_SERVICE_ROLE_KEY` con tu clave real
   - Ejecuta el script completo en el SQL Editor de Supabase

### Verificar que funciona

```sql
-- Ver que el cron job está activo
SELECT * FROM cron.job WHERE jobname = 'daily-analysis-trigger';

-- Ver estado de la cola
SELECT status, COUNT(*) FROM analysis_queue GROUP BY status;
```

## 📊 Monitoreo Rápido

```sql
-- Estado general
SELECT status, COUNT(*) as count FROM analysis_queue GROUP BY status;

-- Trabajos fallidos
SELECT * FROM analysis_queue WHERE status = 'failed' ORDER BY created_at DESC LIMIT 10;
```

## 📚 Documentación Completa

Para más detalles, consulta: **[docs/DAILY_ANALYSIS_SYSTEM.md](./docs/DAILY_ANALYSIS_SYSTEM.md)**

Incluye:
- Arquitectura detallada
- Guía de troubleshooting
- Queries de monitoreo avanzadas
- Ejecución manual para pruebas
- Mejoras futuras

## 🔧 Componentes

- **`trigger-daily-analysis`** - Se ejecuta diariamente, busca prompts activos y los encola
- **`process-queue`** - Procesa la cola en lotes de 5 prompts con todos los LLMs
- **`analysis_queue`** - Tabla que almacena los trabajos de análisis

## ⚠️ Notas Importantes

- El cron job usa hora UTC del servidor de Supabase
- Procesa en lotes de 5 para evitar saturación
- Los LLMs analizados: Perplexity, Gemini, OpenAI, Claude
- Reintenta hasta 3 veces automáticamente en caso de fallo

