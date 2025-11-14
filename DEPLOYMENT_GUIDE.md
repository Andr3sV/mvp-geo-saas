# 🚀 Guía de Despliegue - Fase 7

## ✅ Pre-requisitos

Antes de desplegar, asegúrate de tener:

- [ ] Cuenta de Supabase configurada
- [ ] API Keys de las 4 plataformas de IA
- [ ] Supabase CLI instalado (`npm install -g supabase`)
- [ ] Git configurado y cambios commiteados

---

## 📋 Checklist de Despliegue

### 1. Base de Datos ✅

**Ya completado** - La migración ya fue aplicada.

Para verificar:

```sql
-- En Supabase SQL Editor
SELECT table_name
FROM information_schema.tables
WHERE table_name IN ('ai_responses', 'analysis_jobs', 'citations_detail');
```

---

### 2. API Keys de IA 🔑

Obtén tus API keys:

#### OpenAI

1. Ve a https://platform.openai.com/api-keys
2. Crea una nueva API key
3. Copia el valor que empieza con `sk-...`

#### Google Gemini

1. Ve a https://makersuite.google.com/app/apikey
2. Crea una nueva API key
3. Copia el valor

#### Anthropic Claude

1. Ve a https://console.anthropic.com/settings/keys
2. Crea una nueva API key
3. Copia el valor que empieza con `sk-ant-...`

#### Perplexity AI

1. Ve a https://www.perplexity.ai/settings/api
2. Crea una nueva API key
3. Copia el valor que empieza con `pplx-...`

---

### 3. Configurar Variables de Entorno en Supabase 🔧

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Navega a `Settings` → `Edge Functions`
3. En la sección "Secrets", agrega:

```bash
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
CLAUDE_API_KEY=sk-ant-...
PERPLEXITY_API_KEY=pplx-...
```

4. Guarda cada variable

---

### 4. Desplegar Edge Functions 🚀

```bash
# 1. Login a Supabase (si no lo has hecho)
npx supabase login

# 2. Link a tu proyecto (si no lo has hecho)
# Obtén tu PROJECT_REF del dashboard (en la URL o en Settings)
npx supabase link --project-ref YOUR_PROJECT_REF

# 3. Deploy las funciones
npx supabase functions deploy analyze-prompt
npx supabase functions deploy process-analysis

# O todas a la vez:
npx supabase functions deploy
```

**Verificación**:

```bash
# Listar funciones desplegadas
npx supabase functions list

# Ver logs
npx supabase functions logs analyze-prompt --follow
```

---

### 5. Desplegar Frontend a Vercel 🌐

```bash
# 1. Commit todos los cambios
git add .
git commit -m "feat: Phase 7 - AI Integration complete"

# 2. Push a GitHub
git push origin main

# 3. Vercel desplegará automáticamente
# Verifica el deployment en: https://vercel.com/dashboard
```

**Nota**: Las variables de entorno de Supabase ya están configuradas en Vercel desde Phase 1.

---

## 🧪 Testing en Producción

### Test 1: Crear un Prompt

1. Ve a https://your-app.vercel.app/dashboard/prompts
2. Haz clic en "Add Prompt"
3. Crea un prompt de ejemplo:
   - **Prompt**: "What are the best project management tools for startups?"
   - **Category**: General
4. Guarda el prompt

### Test 2: Ejecutar Análisis

1. En la lista de prompts, haz clic en "Run Analysis"
2. Selecciona las plataformas de IA (puedes empezar solo con OpenAI)
3. Haz clic en "Run Analysis"
4. Deberías ver un toast: "Analysis started successfully!"

### Test 3: Ver Resultados

1. Ve a `/dashboard/analysis`
2. Deberías ver el job en estado "Running"
3. Espera 30-60 segundos
4. Refresca la página
5. El estado debería cambiar a "Completed"
6. Haz clic en "View Details" para ver las citaciones

---

## 🐛 Troubleshooting

### Error: "Missing API key for provider: openai"

**Problema**: La API key no está configurada en Supabase.

**Solución**:

1. Ve a Supabase Dashboard → Settings → Edge Functions
2. Verifica que `OPENAI_API_KEY` esté configurado
3. Re-despliega la función: `npx supabase functions deploy analyze-prompt`

### Error: "Failed to invoke function"

**Problema**: La función no está desplegada o hay un error en el código.

**Solución**:

```bash
# Ver logs de errores
npx supabase functions logs analyze-prompt

# Re-desplegar
npx supabase functions deploy analyze-prompt
```

### Error: "Rate limit exceeded"

**Problema**: Has excedido el límite de 10 análisis por minuto.

**Solución**: Espera 1 minuto antes de ejecutar otro análisis.

### Error: "Invalid authentication token"

**Problema**: El token de sesión expiró.

**Solución**: Cierra sesión y vuelve a iniciar sesión.

### Análisis se queda en "Running" indefinidamente

**Problema**: Puede haber un error en la Edge Function.

**Solución**:

1. Ve a Supabase Dashboard → Edge Functions → Logs
2. Busca errores en `analyze-prompt`
3. Verifica que todas las API keys sean válidas
4. Prueba con una sola plataforma primero

---

## 💡 Tips de Optimización

### Reducir Costos

1. **Usa solo OpenAI al principio** para testing
2. **Limita el número de análisis** durante desarrollo
3. **Monitorea el dashboard de costos** de cada proveedor

### Mejorar Performance

1. **Las funciones procesan en paralelo** - no hay que esperar
2. **Rate limiting** previene abuse
3. **Los resultados se cachean** en la base de datos

### Monitoreo

```bash
# Ver logs en tiempo real
npx supabase functions logs analyze-prompt --follow

# Ver estadísticas
# Ve a Supabase Dashboard → Database → analysis_jobs
# Filtra por project_id
```

---

## 📊 Métricas a Monitorear

Una vez en producción, monitorea:

1. **Supabase Dashboard → Database**

   - Total de `analysis_jobs`
   - Total de `ai_responses`
   - Total de `citations_detail`

2. **Supabase Dashboard → Edge Functions**

   - Invocaciones por función
   - Errores
   - Latencia promedio

3. **API Provider Dashboards**
   - OpenAI: https://platform.openai.com/usage
   - Claude: https://console.anthropic.com/settings/billing
   - Gemini: https://makersuite.google.com/
   - Perplexity: https://www.perplexity.ai/settings/api

---

## ✅ Checklist Final

Antes de considerar el deployment completo:

- [ ] Migración de base de datos aplicada
- [ ] 4 API keys configuradas en Supabase
- [ ] Edge Functions desplegadas (`analyze-prompt`, `process-analysis`)
- [ ] Frontend desplegado en Vercel
- [ ] Test end-to-end completado exitosamente
- [ ] Al menos 1 análisis ejecutado y completado
- [ ] Citaciones visibles en `/dashboard/analysis`
- [ ] No hay errores en logs de Supabase
- [ ] Dashboard de costos revisado

---

## 🎉 ¡Listo!

Una vez completados todos los pasos, tu aplicación está lista para producción con:

✅ Integración real con 4 plataformas de IA
✅ Análisis automático de citaciones
✅ Tracking de costos y métricas
✅ Dashboard completo de reportes

---

## 📚 Documentación Adicional

- [PHASE_7_SUMMARY.md](./PHASE_7_SUMMARY.md) - Documentación técnica completa
- [supabase/functions/README.md](./supabase/functions/README.md) - Documentación de Edge Functions
- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)

---

## 🆘 Soporte

Si encuentras problemas:

1. Revisa los logs de Edge Functions
2. Verifica las API keys
3. Consulta la documentación de cada provider
4. Revisa [PHASE_7_SUMMARY.md](./PHASE_7_SUMMARY.md) → Troubleshooting
