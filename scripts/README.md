# Scripts

## run-analysis-for-project.js

Script para ejecutar análisis automáticos para todos los prompts de un proyecto.

### Uso

```bash
node scripts/run-analysis-for-project.js <project_id>
```

### Ejemplo

```bash
node scripts/run-analysis-for-project.js a915d1f3-8a07-4b5b-a767-17bd2a28d684
```

### Requisitos

- El archivo `.env.local` debe existir en la raíz del proyecto con:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

### Funcionamiento

1. Obtiene todos los prompts activos del proyecto especificado
2. Ejecuta análisis para cada prompt con todas las plataformas (OpenAI, Gemini, Claude, Perplexity)
3. Procesa los prompts en lotes de 5 para evitar sobrecargar el sistema
4. Muestra un resumen al final con el número de éxitos y errores

### Notas

- Los análisis se ejecutan en segundo plano y pueden tardar 30-60 segundos en completarse
- Revisa los logs de Supabase Edge Functions para monitorear el progreso
- El script usa `SUPABASE_SERVICE_ROLE_KEY` para bypass RLS y poder acceder a todos los prompts
