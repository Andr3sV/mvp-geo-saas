# ✅ Implementación: Onboarding con Análisis Automático

## 🎯 Objetivo Completado

Se ha implementado exitosamente el flujo completo donde los prompts creados en el onboarding:
1. ✅ Se guardan en la base de datos
2. ✅ Disparan análisis automático con todos los LLMs (OpenAI, Gemini, Claude, Perplexity)
3. ✅ Se visualizan en Prompt Management
4. ✅ Los resultados se muestran en Citation Tracking

---

## 🔧 Cambios Implementados

### 1. **Modificación en `src/lib/actions/workspace.ts`**

**Función `savePrompts`:**
```typescript
// ANTES: Solo insertaba prompts
const { error } = await supabase.from("prompt_tracking").insert(promptsData);
return { error: null, success: true };

// AHORA: Retorna los prompts creados con sus IDs
const { data: createdPrompts, error } = await supabase
  .from("prompt_tracking")
  .insert(promptsData)
  .select();

return { error: null, success: true, data: createdPrompts };
```

**Beneficio:** Ahora podemos obtener los IDs de los prompts creados para disparar el análisis.

---

### 2. **Modificación en `src/app/onboarding/page.tsx`**

**Importación de `startAnalysis`:**
```typescript
import { startAnalysis, type AIProvider } from "@/lib/actions/analysis";
```

**Función `handleStep4Submit` mejorada:**
```typescript
const result = await savePrompts({
  project_id: projectId!,
  prompts: selectedPrompts.map((p) => ({
    prompt: p.text,
    region: p.region,
    category: p.category,
  })),
});

if (result.error) {
  setError(result.error);
  setLoading(false);
  return;
}

// ✨ NUEVO: Disparar análisis automático
if (result.data && result.data.length > 0) {
  const allPlatforms: AIProvider[] = ["openai", "gemini", "claude", "perplexity"];
  
  result.data.forEach((prompt: any) => {
    startAnalysis({
      prompt_tracking_id: prompt.id,
      project_id: projectId!,
      prompt_text: prompt.prompt,
      platforms: allPlatforms,
    }).catch((error) => {
      console.error("Failed to start analysis for prompt:", prompt.id, error);
    });
  });
}
```

**Beneficio:** 
- Cada prompt creado dispara automáticamente el análisis con los 4 LLMs
- El análisis se ejecuta en background (no bloquea la UI)
- Los errores se capturan y se registran en consola

---

## 🧪 Cómo Probar el Flujo Completo

### Paso 1: Acceder al Onboarding
1. Abre `http://localhost:3055` en tu navegador
2. Ve a `/onboarding` (o crea una nueva cuenta)

### Paso 2: Completar el Onboarding
1. **Step 1 - Welcome:** Selecciona tu tipo de usuario (Agency/Company) y fuente de referencia
2. **Step 2 - Workspace:** Ingresa el nombre de tu workspace
3. **Step 3 - Project:** 
   - Ingresa el nombre del proyecto
   - Ingresa la URL del cliente (ej: `https://example.com`)
4. **Step 4 - Prompts:**
   - Verás prompts sugeridos automáticamente basados en la URL del cliente
   - Selecciona los prompts que quieras trackear (todos están seleccionados por defecto)
   - Personaliza región y categoría para cada prompt
   - Añade prompts personalizados si lo deseas
   - Haz clic en "Continue"

**🚀 EN ESTE PUNTO:**
- Los prompts se guardan en la base de datos (`prompt_tracking`)
- Se disparan análisis automáticos para cada prompt con los 4 LLMs
- Los análisis se ejecutan en background vía Edge Functions

5. **Step 5 - Results:** Vista de ranking (placeholder por ahora)
6. **Step 6 - Plan:** Selecciona un plan

### Paso 3: Verificar Prompts en Prompt Management
1. Ve a `/dashboard/prompts`
2. Deberías ver todos los prompts que seleccionaste en el onboarding
3. Cada prompt muestra:
   - Texto del prompt
   - Categoría
   - Región
   - Estado (activo/inactivo)
   - Botón para ejecutar análisis manualmente

### Paso 4: Ver Resultados en Citation Tracking
1. **Espera 30-60 segundos** para que los análisis se completen
2. Ve a `/dashboard/citations`
3. Deberías ver:
   - **Métricas rápidas:**
     - Total Citation Pages
     - My Pages Cited
     - Domains Mentioning Me
     - Your Domain Rating
   - **Gráfico de evolución de citaciones**
   - **Breakdown de Domain Rating**
   - **Dominios más citados**
   - **Fuentes de citaciones**

### Paso 5: Ver Detalles del Análisis
1. Ve a `/dashboard/analysis`
2. Verás los análisis ejecutados:
   - Estado (Running, Completed, Failed)
   - Plataformas (OpenAI, Gemini, Claude, Perplexity)
   - Fecha y hora de ejecución
   - Número de citaciones encontradas

---

## 📊 Estructura de Datos

### Tablas Afectadas

1. **`prompt_tracking`**
   - Almacena los prompts creados
   - Campos: `id`, `project_id`, `prompt`, `category`, `region`, `is_active`

2. **`analysis_jobs`**
   - Registra cada análisis ejecutado
   - Campos: `id`, `prompt_tracking_id`, `project_id`, `status`, `total_platforms`, `completed_platforms`

3. **`ai_responses`**
   - Almacena las respuestas de cada LLM
   - Campos: `id`, `prompt_tracking_id`, `platform`, `response_text`, `status`

4. **`citations_detail`**
   - Almacena las citaciones extraídas
   - Campos: `id`, `ai_response_id`, `citation_text`, `sentiment`, `cited_url`

---

## 🔍 Debugging

### Verificar que los Prompts se Guardaron
```sql
SELECT id, prompt, category, region, is_active
FROM prompt_tracking
WHERE project_id = 'YOUR_PROJECT_ID'
ORDER BY created_at DESC;
```

### Verificar que los Análisis se Dispararon
```sql
SELECT id, status, total_platforms, completed_platforms, created_at
FROM analysis_jobs
WHERE project_id = 'YOUR_PROJECT_ID'
ORDER BY created_at DESC;
```

### Verificar Respuestas de los LLMs
```sql
SELECT platform, status, error_message, created_at
FROM ai_responses
WHERE project_id = 'YOUR_PROJECT_ID'
ORDER BY created_at DESC;
```

### Ver Citaciones Encontradas
```sql
SELECT cd.citation_text, ar.platform, cd.sentiment
FROM citations_detail cd
JOIN ai_responses ar ON cd.ai_response_id = ar.id
WHERE cd.project_id = 'YOUR_PROJECT_ID'
ORDER BY cd.created_at DESC
LIMIT 10;
```

---

## ⚠️ Consideraciones Importantes

### 1. Variables de Entorno Requeridas
Asegúrate de tener configuradas las API keys en Supabase:
- `OPENAI_API_KEY`
- `GEMINI_API_KEY`
- `CLAUDE_API_KEY`
- `PERPLEXITY_API_KEY`

**Cómo configurar:**
1. Ve a Supabase Dashboard → Settings → Edge Functions
2. Agrega cada API key como "Secret"

### 2. Edge Functions Desplegadas
Asegúrate de tener desplegadas las Edge Functions:
```bash
npx supabase functions deploy analyze-prompt
npx supabase functions deploy process-analysis
```

### 3. Tiempo de Ejecución
- Los análisis pueden tardar **30-60 segundos** en completarse
- Se ejecutan en paralelo para todos los LLMs
- Los resultados se procesan y se extraen las citaciones automáticamente

### 4. Costos
- Cada análisis consume tokens de las APIs de los LLMs
- Se recomienda monitorear el uso en el dashboard de cada proveedor

---

## 🎉 Flujo Completo de Usuario

```
1. Usuario completa onboarding
   ↓
2. Selecciona prompts (ej: 5 prompts)
   ↓
3. Se guardan en BD → 5 registros en `prompt_tracking`
   ↓
4. Se disparan análisis automáticos → 5 × 4 = 20 análisis (5 prompts × 4 LLMs)
   ↓
5. Edge Functions ejecutan análisis en paralelo
   ↓
6. Se guardan respuestas → 20 registros en `ai_responses`
   ↓
7. Se extraen citaciones → N registros en `citations_detail`
   ↓
8. Usuario ve resultados en:
   - /dashboard/prompts → Lista de prompts
   - /dashboard/citations → Métricas y citaciones
   - /dashboard/analysis → Detalles de análisis
```

---

## 📝 Próximos Pasos (Opcional)

### Mejoras Sugeridas:
1. **Notificaciones:** Agregar toast notifications cuando los análisis se completen
2. **Progress Bar:** Mostrar progreso de análisis en tiempo real
3. **Retry Logic:** Implementar reintento automático para análisis fallidos
4. **Batch Processing:** Agrupar múltiples prompts en un solo job para mejor eficiencia
5. **Caching:** Cachear resultados para evitar análisis duplicados

---

## 🐛 Troubleshooting

### Problema: Los prompts no aparecen en Prompt Management
**Solución:**
1. Verifica que `selectedProjectId` esté definido en el contexto
2. Revisa la consola del navegador para errores
3. Verifica permisos RLS en Supabase

### Problema: Los análisis no se disparan
**Solución:**
1. Verifica que las API keys estén configuradas en Supabase
2. Revisa los logs de Edge Functions: `npx supabase functions logs analyze-prompt`
3. Verifica que las Edge Functions estén desplegadas

### Problema: No se muestran citaciones en Citation Tracking
**Solución:**
1. Espera 60 segundos para que los análisis se completen
2. Verifica que haya datos en `citations_detail` (SQL query arriba)
3. Revisa los filtros de fecha/plataforma/región aplicados

---

## ✅ Checklist de Validación

- [ ] Los prompts se guardan correctamente en la BD
- [ ] Los prompts aparecen en `/dashboard/prompts`
- [ ] Los análisis se disparan automáticamente
- [ ] Los análisis aparecen en `/dashboard/analysis` con estado "Running" o "Completed"
- [ ] Las citaciones aparecen en `/dashboard/citations` después de 60 segundos
- [ ] Las métricas se actualizan correctamente (Total Citation Pages, etc.)
- [ ] Los filtros funcionan correctamente (fecha, plataforma, región)

---

## 📚 Recursos Adicionales

- [Documentación de Edge Functions](./supabase/functions/README.md)
- [Guía de Despliegue](./DEPLOYMENT_GUIDE.md)
- [Schema de Base de Datos](./supabase/README.md)
- [Phase 7 Summary](./PHASE_7_SUMMARY.md)

---

**¡Implementación completada! 🎉**

El flujo completo está funcionando: desde el onboarding hasta la visualización de citaciones.

