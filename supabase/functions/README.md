# Supabase Edge Functions

Este directorio contiene las Edge Functions activas.

> **Nota Importante**: 
> - **Análisis de prompts**: Migrado al servicio **Backend Orchestrator** usando Inngest.
> - **Análisis de sentimiento**: Migrado al servicio **Backend Orchestrator** usando Groq y funciones Inngest (`analyze-brands-batch`, `analyze-single-response`).
> 
> Ver [backend-orchestrator/README.md](../../backend-orchestrator/backend-orchestrator/README.md) para más información sobre el nuevo sistema.

## 📁 Estructura

```
functions/
├── shared/
│   ├── types.ts          # Tipos compartidos TypeScript
│   ├── utils.ts          # Utilidades (auth, CORS, logging)
│   └── ai-clients.ts     # Clientes para AI (legacy, no usado actualmente)
├── analyze-prompt/
│   └── index.ts          # [LEGACY] Análisis de prompts (migrado a Inngest)
├── process-analysis/
│   └── index.ts          # [LEGACY] Procesamiento de citaciones (migrado a Inngest)
├── process-queue/
│   └── index.ts          # [LEGACY] Procesamiento de cola (migrado a Inngest)
├── trigger-daily-analysis/
│   └── index.ts          # [LEGACY] Análisis diario (migrado a Inngest)
├── deno.json             # Configuración de Deno
└── README.md             # Este archivo
```

> **⚠️ Estado Actual**: Todas las funciones en este directorio son legacy y han sido migradas al Backend Orchestrator (Inngest). Estas funciones pueden ser eliminadas en el futuro.

## 🚀 Estado de las Funciones

### ✅ Sistema Actual (Backend Orchestrator + Inngest)

El procesamiento de análisis ahora se maneja completamente en el **Backend Orchestrator** con Inngest:

- **Análisis de Prompts**: 
  - `process-single-prompt` (Inngest): Genera respuestas de AI en OpenAI, Gemini, Claude, Perplexity
  - `schedule-daily-analysis` (Inngest): Programa análisis diarios
  
- **Análisis de Marcas y Sentimiento**: 
  - `analyze-brands-batch` (Inngest): Análisis batch de menciones de marcas usando Groq
  - `analyze-single-response` (Inngest): Análisis individual de respuestas usando Groq
  - Datos almacenados en: `brand_mentions`, `brand_sentiment_attributes`, `potential_competitors`

### ❌ Funciones Legacy (Eliminadas)

Las siguientes funciones han sido **eliminadas** porque ya no se usan:

- ~~`analyze-sentiment`~~: Reemplazado por `analyze-single-response` (Inngest + Groq)
- ~~`daily-sentiment-analysis`~~: Reemplazado por `analyze-brands-batch` (Inngest + Groq)
- ~~`process-sentiment-queue`~~: Ya no es necesario (procesamiento directo en Inngest)
- ~~`trigger-sentiment-analysis`~~: Ya no es necesario (eventos automáticos en Inngest)

### 🔄 Funciones Legacy (Pueden ser eliminadas)

Las siguientes funciones aún existen pero **no se usan activamente**:

- `analyze-prompt`: Migrado a `process-single-prompt` (Inngest)
- `process-analysis`: Procesamiento de citaciones ahora en Inngest
- `process-queue`: Migrado a sistema de eventos de Inngest
- `trigger-daily-analysis`: Migrado a `schedule-daily-analysis` (Inngest)

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

- **[Backend Orchestrator](../../backend-orchestrator/backend-orchestrator/README.md)** - Servicio principal de análisis usando Inngest (análisis de prompts y brand analysis)
- **[Arquitectura](../../backend-orchestrator/backend-orchestrator/docs/ARCHITECTURE.md)** - Documentación detallada de la arquitectura del sistema
- **[Optimizaciones de Queries y Performance](../../docs/QUERY_OPTIMIZATIONS.md)** - Optimizaciones para manejar grandes volúmenes de datos

### Nota sobre Migración

**Todas las funciones Edge Functions han sido migradas al servicio Backend Orchestrator con Inngest:**

- ✅ **Análisis de Prompts**: Migrado completamente (OpenAI, Gemini, Claude, Perplexity)
- ✅ **Análisis de Sentimiento**: Migrado completamente (Groq para brand analysis)
- ✅ **Procesamiento de Citaciones**: Migrado completamente (en Inngest)

El nuevo sistema ofrece:
- ⚡ Mejor confiabilidad y manejo de errores
- 🔄 Rate limiting centralizado para todas las APIs
- 📊 Monitoreo y logs mejorados en Inngest dashboard
- 🚀 Escalabilidad automática
- 💰 Mejor control de costos

Ver [backend-orchestrator/README.md](../../backend-orchestrator/backend-orchestrator/README.md) para más detalles.

### Recursos Externos

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Deno Documentation](https://deno.land/manual)
- [OpenAI API](https://platform.openai.com/docs)
- [Google AI (Gemini)](https://ai.google.dev/docs)
- [Anthropic (Claude)](https://docs.anthropic.com)
- [Perplexity API](https://docs.perplexity.ai)
