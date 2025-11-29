# Supabase Edge Functions

Este directorio contiene las Edge Functions para análisis de sentimiento y procesamiento de citaciones.

> **Nota**: Las funciones de análisis diario de prompts (`trigger-daily-analysis`, `process-queue`, `analyze-prompt`) han sido migradas al nuevo servicio **Backend Orchestrator** usando Inngest. Ver [backend-orchestrator/README.md](../../backend-orchestrator/backend-orchestrator/README.md) para más información.

## 📁 Estructura

```
functions/
├── shared/
│   ├── types.ts          # Tipos compartidos TypeScript
│   ├── utils.ts          # Utilidades (auth, CORS, logging)
│   └── ai-clients.ts     # Clientes para OpenAI, Gemini, Claude, Perplexity
├── analyze-sentiment/
│   └── index.ts          # Análisis avanzado de sentimiento
├── daily-sentiment-analysis/
│   └── index.ts          # Análisis diario de sentimiento
├── process-sentiment-queue/
│   └── index.ts          # Procesamiento de cola de sentimiento
├── trigger-sentiment-analysis/
│   └── index.ts          # Dispara análisis de sentimiento
├── process-analysis/
│   └── index.ts          # Procesamiento de citaciones
├── deno.json             # Configuración de Deno
└── README.md             # Este archivo
```

## 🚀 Funciones Disponibles

### Sistema de Análisis de Sentimiento

Las funciones de análisis de sentimiento siguen usando Edge Functions:

- **`analyze-sentiment`**: Análisis avanzado de sentimiento de respuestas de IA
- **`daily-sentiment-analysis`**: Ejecuta análisis de sentimiento diariamente
- **`process-sentiment-queue`**: Procesa la cola de análisis de sentimiento
- **`trigger-sentiment-analysis`**: Dispara análisis de sentimiento manual

### Funciones de Procesamiento

### `process-analysis`

Procesa las respuestas de IA para extraer y analizar citaciones.

Procesa las respuestas de IA para extraer y analizar citaciones.

**Endpoint**: `https://your-project.supabase.co/functions/v1/process-analysis`

**Request**:

```json
{
  "job_id": "uuid",
  "ai_response_id": "uuid"
}
```

**Response**:

```json
{
  "success": true,
  "data": {
    "citations_found": 5,
    "success": true,
    "message": "Successfully processed 5 citations"
  }
}
```

## ⚙️ Configuración

### Variables de Entorno

Configura las siguientes variables de entorno en tu proyecto de Supabase:

```bash
# AI Provider API Keys
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
CLAUDE_API_KEY=sk-ant-...
PERPLEXITY_API_KEY=pplx-...

# Optional
DEBUG=false
```

**Para configurar en Supabase Dashboard**:

1. Ve a `Settings` → `Edge Functions`
2. Añade las variables de entorno
3. Reinicia las funciones

**Para configurar localmente**:
Crea un archivo `.env` en `supabase/.env`:

```bash
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
CLAUDE_API_KEY=sk-ant-...
PERPLEXITY_API_KEY=pplx-...
```

## 🧪 Testing Local

### Prerequisitos

- Supabase CLI instalado: `npm install -g supabase`
- Deno instalado: [deno.land](https://deno.land)

### Iniciar funciones localmente

```bash
# En la raíz del proyecto
supabase functions serve

# O una función específica (ejemplo: analyze-sentiment)
supabase functions serve analyze-sentiment
```

### Llamar a una función localmente

```bash
# Ejemplo: analyze-sentiment
curl -i --location --request POST 'http://localhost:54321/functions/v1/analyze-sentiment' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "ai_response_id": "uuid",
    "project_id": "uuid"
  }'
```

## 🚢 Deployment

### Deploy todas las funciones

```bash
supabase functions deploy
```

### Deploy una función específica

```bash
supabase functions deploy analyze-sentiment
supabase functions deploy process-analysis
supabase functions deploy daily-sentiment-analysis
```

### Verificar deployment

```bash
supabase functions list
```

## 📊 Monitoring

### Ver logs en tiempo real

```bash
supabase functions logs analyze-sentiment --follow
```

### Ver logs históricos

```bash
supabase functions logs analyze-sentiment --limit 100
```

## 🔐 Autenticación

Todas las funciones requieren un token de autenticación válido en el header:

```
Authorization: Bearer <supabase_user_jwt>
```

El token debe ser del usuario autenticado en tu aplicación Next.js.

## 💰 Costos Estimados

Los costos por análisis varían según la plataforma:

- **OpenAI (GPT-4)**: ~$0.002 por 1K tokens
- **Gemini Pro**: ~$0.001 por 1K tokens
- **Claude 3**: ~$0.003 por 1K tokens
- **Perplexity**: ~$0.0015 por 1K tokens

**Ejemplo**: Un prompt de 100 palabras (~150 tokens) + respuesta de 500 palabras (~750 tokens):

- Total: ~900 tokens
- Costo por plataforma: ~$0.0018 - $0.0027
- Costo total (4 plataformas): ~$0.008 - $0.012 por análisis

## 🔧 Troubleshooting

### Error: "Missing API key for provider"

Asegúrate de configurar las variables de entorno para cada proveedor de IA.

### Error: "Access denied to this project"

Verifica que el usuario tenga permisos en el proyecto mediante `project_members`.

### Error: "Rate limit exceeded"

Las funciones tienen rate limiting de 10 requests/minuto por usuario. Espera antes de reintentar.

### Error de CORS

Asegúrate de que tu frontend esté en el dominio autorizado en Supabase Dashboard.

## 📚 Recursos

### Documentación Interna

- **[Backend Orchestrator](../../backend-orchestrator/backend-orchestrator/README.md)** - Nuevo servicio de análisis de prompts usando Inngest
- **[Sistema de Análisis de Sentimiento](../../docs/SENTIMENT_ANALYSIS_QUEUE_SYSTEM.md)** - Documentación del sistema de análisis de sentimiento
- **[Optimizaciones de Queries y Performance](../../docs/QUERY_OPTIMIZATIONS.md)** - Optimizaciones para manejar grandes volúmenes de datos

### Nota sobre Migración

Las funciones de análisis de prompts (`trigger-daily-analysis`, `process-queue`, `analyze-prompt`) han sido migradas al nuevo servicio **Backend Orchestrator** que usa Inngest para orquestación. Este servicio ofrece mejor confiabilidad, rate limiting, y monitoreo. Ver [backend-orchestrator/README.md](../../backend-orchestrator/backend-orchestrator/README.md) para más detalles.

### Recursos Externos

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Deno Documentation](https://deno.land/manual)
- [OpenAI API](https://platform.openai.com/docs)
- [Google AI (Gemini)](https://ai.google.dev/docs)
- [Anthropic (Claude)](https://docs.anthropic.com)
- [Perplexity API](https://docs.perplexity.ai)
