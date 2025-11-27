# Supabase Edge Functions

Este directorio contiene las Edge Functions para el análisis de IA y procesamiento de citaciones.

## 📁 Estructura

```
functions/
├── shared/
│   ├── types.ts          # Tipos compartidos TypeScript
│   ├── utils.ts          # Utilidades (auth, CORS, logging)
│   └── ai-clients.ts     # Clientes para OpenAI, Gemini, Claude, Perplexity
├── analyze-prompt/
│   └── index.ts          # Función principal de análisis
├── process-analysis/
│   └── index.ts          # Procesamiento de citaciones
├── trigger-daily-analysis/
│   └── index.ts          # Dispara análisis diario automático (2:00 AM)
├── process-queue/
│   └── index.ts          # Worker que procesa la cola de análisis
├── analyze-sentiment/
│   └── index.ts          # Análisis avanzado de sentimiento
├── deno.json             # Configuración de Deno
└── README.md             # Este archivo
```

## 🚀 Funciones Disponibles

### Sistema de Análisis Diario Automático

#### `trigger-daily-analysis` ⚡

Se ejecuta automáticamente cada día a las 2:00 AM para buscar todos los prompts activos y agregarlos a la cola de análisis.

**📚 Documentación completa:** Ver [docs/DAILY_ANALYSIS_SYSTEM.md](../../docs/DAILY_ANALYSIS_SYSTEM.md)

#### `process-queue` 🔄

Worker que procesa la cola de análisis en lotes pequeños (5 prompts a la vez), ejecutando análisis en todos los LLMs disponibles.

**Características:**

- Procesa en lotes de 5 para evitar saturación
- Auto-continúa hasta procesar toda la cola
- Reintenta automáticamente hasta 3 veces en caso de fallo
- Ejecuta análisis en: Perplexity, Gemini, OpenAI, Claude

---

### Funciones de Análisis

### 1. `analyze-prompt`

Ejecuta un prompt en múltiples plataformas de IA en paralelo.

**Endpoint**: `https://your-project.supabase.co/functions/v1/analyze-prompt`

**Request**:

```json
{
  "prompt_tracking_id": "uuid",
  "project_id": "uuid",
  "prompt_text": "What are the best project management tools?",
  "platforms": ["openai", "gemini", "claude", "perplexity"]
}
```

**Response**:

```json
{
  "success": true,
  "data": {
    "job_id": "uuid",
    "status": "completed",
    "message": "Analysis completed. 4/4 platforms completed successfully."
  }
}
```

### 2. `process-analysis`

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

# O una función específica
supabase functions serve analyze-prompt
```

### Llamar a una función localmente

```bash
curl -i --location --request POST 'http://localhost:54321/functions/v1/analyze-prompt' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "prompt_tracking_id": "uuid",
    "project_id": "uuid",
    "prompt_text": "What are the best project management tools?"
  }'
```

## 🚢 Deployment

### Deploy todas las funciones

```bash
supabase functions deploy
```

### Deploy una función específica

```bash
supabase functions deploy analyze-prompt
supabase functions deploy process-analysis
```

### Verificar deployment

```bash
supabase functions list
```

## 📊 Monitoring

### Ver logs en tiempo real

```bash
supabase functions logs analyze-prompt --follow
```

### Ver logs históricos

```bash
supabase functions logs analyze-prompt --limit 100
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

- **[Sistema de Análisis Diario Automático](../../docs/DAILY_ANALYSIS_SYSTEM.md)** - Documentación completa del sistema de análisis automatizado
- **[Guía de Inicio Rápido](../../docs/DAILY_ANALYSIS_QUICKSTART.md)** - Configuración rápida del análisis diario
- **[Optimizaciones de Queries y Performance](../../docs/QUERY_OPTIMIZATIONS.md)** - Optimizaciones para manejar grandes volúmenes de datos

### Recursos Externos

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Deno Documentation](https://deno.land/manual)
- [OpenAI API](https://platform.openai.com/docs)
- [Google AI (Gemini)](https://ai.google.dev/docs)
- [Anthropic (Claude)](https://docs.anthropic.com)
- [Perplexity API](https://docs.perplexity.ai)
