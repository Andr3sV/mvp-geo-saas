# Optimizaciones de Queries y Performance

Este documento describe las optimizaciones implementadas para mejorar el rendimiento de las consultas y manejar grandes volúmenes de datos.

## 📊 Índice

- [Problema del Límite de Paginación en Mentions Evolution](#problema-del-límite-de-paginación-en-mentions-evolution)
- [Optimización de Total Citation Pages](#optimización-de-total-citation-pages)
- [Mejores Prácticas](#mejores-prácticas)

---

## Problema del Límite de Paginación en Mentions Evolution

### 🐛 Problema Identificado

El gráfico "Mentions Evolution" en la sección "Share of Voice" mostraba volúmenes limitados de menciones (por ejemplo, solo 734 en lugar de miles) debido a:

1. **Límites de paginación de Supabase**: El query traía todos los registros de `citations_detail` con un límite de 50,000, pero con joins complejos esto no escalaba correctamente
2. **Conteo en JavaScript**: Después de traer los datos, se contaban las menciones por día en el cliente, lo cual era ineficiente y propenso a errores
3. **Problemas con joins anidados**: Los queries con múltiples `inner` joins no respetaban completamente los límites establecidos

### ✅ Solución Implementada

**Fecha**: Enero 2025  
**Archivo SQL**: `supabase/migrations/20250127000003_add_daily_mentions_function.sql`  
**Archivo TypeScript**: `src/lib/queries/share-of-voice.ts`

#### 1. Función SQL Optimizada

Se creó una función SQL `get_daily_mentions_evolution()` que:

- **Agrega directamente en la base de datos** usando `COUNT(*)` y `GROUP BY DATE()`
- **Maneja grandes volúmenes** sin límites artificiales de paginación
- **Aplica todos los filtros** (proyecto, fecha, plataforma, región) en SQL
- **Retorna solo los datos agregados** necesarios para el gráfico

```sql
CREATE OR REPLACE FUNCTION get_daily_mentions_evolution(
  p_project_id UUID,
  p_competitor_id UUID DEFAULT NULL,
  p_from_date TIMESTAMPTZ DEFAULT NULL,
  p_to_date TIMESTAMPTZ DEFAULT NULL,
  p_platform TEXT DEFAULT NULL,
  p_region TEXT DEFAULT NULL
)
RETURNS TABLE (
  date DATE,
  brand_mentions BIGINT,
  competitor_mentions BIGINT
)
```

**Características técnicas:**
- Usa `WITH` clauses (CTEs) para optimizar la consulta
- Genera serie de fechas con `generate_series()` para asegurar todos los días
- Hace `LEFT JOIN` con las agregaciones para mantener días sin menciones (con 0)
- Aplica filtros de plataforma y región directamente en los JOINs

#### 2. Actualización del Código TypeScript

Se reemplazó el código que:

**Antes:**
```typescript
// ❌ Traía TODOS los registros y contaba en JavaScript
const { data: brandMentions } = await supabase
  .from("citations_detail")
  .select(`id, created_at, ai_responses!inner(...)`)
  .limit(50000);

// Contaba en JavaScript (ineficiente)
const brandCount = brandMentions?.filter((m) => {
  const mentionDate = format(new Date(m.created_at), "yyyy-MM-dd");
  return mentionDate === dayStr;
}).length || 0;
```

**Después:**
```typescript
// ✅ Usa función SQL que agrega directamente
const { data: dailyMentions } = await supabase.rpc("get_daily_mentions_evolution", {
  p_project_id: projectId,
  p_competitor_id: competitorId || null,
  p_from_date: startDate.toISOString(),
  p_to_date: endDate.toISOString(),
  p_platform: platform && platform !== "all" ? platform : null,
  p_region: region && region !== "GLOBAL" ? region : null,
});
```

### 📈 Resultados

- ✅ **Eliminación de límites artificiales**: Ahora muestra todos los volúmenes reales
- ✅ **Mejor performance**: La agregación en SQL es mucho más rápida que el conteo en JavaScript
- ✅ **Escalabilidad**: Maneja miles o millones de menciones sin problemas
- ✅ **Menor transferencia de datos**: Solo se transfieren los datos agregados necesarios

### 🔧 Archivos Modificados

1. **`supabase/migrations/20250127000003_add_daily_mentions_function.sql`**
   - Nueva función SQL para agregación eficiente

2. **`src/lib/queries/share-of-voice.ts`**
   - Función `getShareOfVoiceOverTime()` refactorizada
   - Eliminado código de conteo en JavaScript
   - Implementado uso de RPC function

### 🚀 Despliegue

Para aplicar esta optimización:

1. **Ejecutar la migración SQL:**
   ```bash
   # Opción 1: Desde SQL Editor de Supabase
   # Copia y ejecuta el contenido de:
   # supabase/migrations/20250127000003_add_daily_mentions_function.sql

   # Opción 2: Desde terminal
   npx supabase db push
   ```

2. **Verificar que la función existe:**
   ```sql
   SELECT proname, proargtypes 
   FROM pg_proc 
   WHERE proname = 'get_daily_mentions_evolution';
   ```

3. **Probar el gráfico:**
   - Ve a Share of Voice → Mentions Evolution
   - Verifica que ahora muestra los volúmenes reales de menciones

---

## Optimización de Total Citation Pages

### 🐛 Problema Identificado

La métrica "Total Citation Pages" estaba limitada a un número fijo (por ejemplo, 310) debido a que:

1. Se contaba `COUNT(DISTINCT ai_response_id)` en JavaScript después de traer todos los datos
2. Los límites de paginación de Supabase afectaban el conteo

### ✅ Solución Implementada

**Fecha**: Enero 2025  
**Archivo SQL**: `supabase/migrations/20250123000001_add_count_citation_pages_function.sql`

Se creó una función SQL `count_distinct_citation_pages()` que:

- Ejecuta `COUNT(DISTINCT)` directamente en la base de datos
- Aplica todos los filtros antes de contar
- Retorna solo el número final

```sql
CREATE OR REPLACE FUNCTION count_distinct_citation_pages(
  p_project_id UUID,
  p_from_date TIMESTAMPTZ DEFAULT NULL,
  p_to_date TIMESTAMPTZ DEFAULT NULL,
  p_platform TEXT DEFAULT NULL,
  p_region TEXT DEFAULT NULL
)
RETURNS INTEGER
```

**Uso en TypeScript:**
```typescript
const { data: count } = await supabase.rpc("count_distinct_citation_pages", {
  p_project_id: projectId,
  p_from_date: fromDate?.toISOString(),
  p_to_date: toDate?.toISOString(),
  p_platform: platform && platform !== "all" ? platform : null,
  p_region: region && region !== "GLOBAL" ? region : null,
});
```

---

## Mejores Prácticas

### 🎯 Cuándo Usar Funciones SQL vs. Queries del Cliente

**Usa funciones SQL (RPC) cuando:**

✅ Necesitas agregaciones complejas (`COUNT`, `SUM`, `AVG`, etc.)  
✅ Trabajas con grandes volúmenes de datos (miles o millones de registros)  
✅ El resultado final es mucho menor que los datos intermedios  
✅ Necesitas operaciones que no están disponibles en el cliente (como `generate_series`)  
✅ Quieres aplicar lógica de negocio en la base de datos

**Usa queries del cliente cuando:**

✅ Necesitas datos individuales para mostrar en tablas  
✅ El volumen de datos es pequeño (< 1,000 registros)  
✅ Necesitas manipular los datos en el cliente antes de mostrar  
✅ Los datos necesarios son exactamente los que retorna el query

### 📋 Checklist para Optimizaciones

Antes de crear una optimización, considera:

- [ ] ¿El query está trayendo más datos de los necesarios?
- [ ] ¿Se puede hacer la agregación en SQL en lugar de JavaScript?
- [ ] ¿Hay límites de paginación que afectan los resultados?
- [ ] ¿El query usa joins complejos que podrían optimizarse?
- [ ] ¿Se puede usar una función SQL para simplificar el código?

### 🔍 Cómo Identificar Problemas de Performance

**Síntomas comunes:**

1. **Datos incompletos o limitados**: Números que parecen estar "cortados"
2. **Queries lentos**: Tiempos de carga largos en el frontend
3. **Alto uso de memoria**: La aplicación consume mucha memoria
4. **Timeouts**: Errores de timeout en las consultas

**Diagnóstico:**

1. Revisa los logs de Supabase para ver tiempos de ejecución
2. Verifica cuántos registros está trayendo cada query
3. Usa `EXPLAIN ANALYZE` en SQL para ver el plan de ejecución
4. Compara los datos en la BD vs. los mostrados en el frontend

### 🛠️ Herramientas Útiles

**Para debugging de queries:**

```sql
-- Ver plan de ejecución de una función
EXPLAIN ANALYZE
SELECT * FROM get_daily_mentions_evolution(
  'project-id'::UUID,
  NULL,
  '2025-01-01'::TIMESTAMPTZ,
  '2025-01-31'::TIMESTAMPTZ,
  NULL,
  NULL
);

-- Contar registros en una tabla
SELECT COUNT(*) FROM citations_detail WHERE project_id = 'project-id';

-- Ver tamaño de las tablas
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## 📚 Referencias

- [Supabase RPC Functions](https://supabase.com/docs/guides/database/functions)
- [PostgreSQL Performance Tips](https://www.postgresql.org/docs/current/performance-tips.html)
- [Optimizing Queries in Supabase](https://supabase.com/docs/guides/database/query-optimization)

---

**Última actualización**: Enero 2025  
**Mantenido por**: Equipo de Desarrollo

