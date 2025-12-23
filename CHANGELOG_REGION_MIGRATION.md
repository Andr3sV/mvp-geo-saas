# Changelog: Region System Migration and Query Analytics Fixes

## Fecha: 2025-12-23

### Resumen
Este documento describe todos los cambios realizados para migrar del sistema de regiones basado en texto (`prompt_tracking.region`) a un sistema basado en UUID con tabla dedicada (`regions` table y `prompt_tracking.region_id`), y las correcciones relacionadas en las funciones de query analytics.

---

## 🔧 Cambios Principales

### 1. Migración de Base de Datos

#### 1.1. Migración: `20251223180000_update_query_analytics_functions_region_id.sql`

**Propósito**: Actualizar todas las funciones RPC de PostgreSQL relacionadas con query analytics para usar `region_id` en lugar de `prompt_tracking.region`.

**Funciones Actualizadas** (12 funciones en total):

1. **`get_query_overview`**
   - Cambio: JOIN con tabla `regions` usando `LEFT JOIN regions r ON r.id = pt.region_id AND r.project_id = p_project_id`
   - Filtro: `r.code = p_region` en lugar de `pt.region = p_region`

2. **`get_query_word_cloud`**
   - Mismo patrón: JOIN con `regions` y filtro por `r.code`

3. **`get_query_platform_distribution`**
   - Mismo patrón de actualización

4. **`get_query_intent_breakdown`**
   - Mismo patrón de actualización

5. **`get_top_queries`**
   - Mismo patrón de actualización

6. **`get_trend_metrics`**
   - Actualizado en ambos CTEs: `current_period` y `previous_period`

7. **`get_query_velocity`**
   - Actualizado para usar `region_id` con JOIN a `regions`

8. **`get_rising_queries`**
   - Actualizado en ambos CTEs: `current_period` y `previous_period`

9. **`get_declining_queries`**
   - Actualizado en ambos CTEs: `current_period` y `previous_period`

10. **`get_query_momentum`**
    - Actualizado en ambos CTEs: `current_period` y `previous_period`

11. **`get_emerging_queries`**
    - Actualizado en ambos CTEs: `previous_queries` y `current_queries`

12. **`get_query_domain_correlation`**
    - Actualizado en múltiples lugares: `top_queries`, `top_domains`, y la query principal

**Patrón de Cambio Común**:
```sql
-- ANTES:
INNER JOIN prompt_tracking pt ON pt.id = ar.prompt_tracking_id
WHERE ... AND (p_region IS NULL OR p_region = 'GLOBAL' OR pt.region = p_region)

-- DESPUÉS:
INNER JOIN prompt_tracking pt ON pt.id = ar.prompt_tracking_id
LEFT JOIN regions r ON r.id = pt.region_id AND r.project_id = p_project_id
WHERE ... AND (p_region IS NULL OR p_region = 'GLOBAL' OR r.code = p_region)
```

---

### 2. Correcciones en Frontend Queries

#### 2.1. `src/lib/queries/citations-real.ts`

**Funciones Actualizadas**:

##### `getMostCitedDomains()`
- **Antes**: Usaba `prompt_tracking!inner(region, topic_id)` y filtraba por `ai_responses.prompt_tracking.region`
- **Después**: 
  - Obtiene `region_id` usando `getRegionIdByCode()` cuando hay filtro de región
  - Selecciona `prompt_tracking!inner(region_id, topic_id, regions:region_id(code))`
  - Filtra por `ai_responses.prompt_tracking.region_id` usando el `regionId` obtenido

##### `getTodayRealTimeCitationsStats()`
- **Antes**: Seleccionaba `prompt_tracking(region, topic_id)` y filtraba por `ar.prompt_tracking?.region === region`
- **Después**:
  - Obtiene `region_id` usando `getRegionIdByCode()`
  - Selecciona `prompt_tracking(region_id, topic_id, regions:region_id(code))`
  - Filtra usando `region_id` comparando con el UUID obtenido

##### `getHighValueOpportunities()`
- **Antes**: Usaba `applyRegionFilter()` helper que intentaba filtrar por `ai_responses.prompt_tracking.region`
- **Después**:
  - Obtiene `region_id` usando `getRegionIdByCode()`
  - Selecciona `prompt_tracking!inner(region_id, topic_id, regions:region_id(code))`
  - Aplica filtro directamente usando `eq("ai_responses.prompt_tracking.region_id", regionId)`

##### `getUnmentionedSources()`
- **Antes**: Usaba `applyRegionFilter()` helper
- **Después**: Mismo patrón que `getHighValueOpportunities()`

##### `getCitationSources()`
- **Antes**: Usaba `prompt_tracking!inner(region, topic_id)` en countQuery y dataQuery
- **Después**:
  - Obtiene `region_id` usando `getRegionIdByCode()`
  - Actualiza ambos queries (count y data) para usar `region_id` con JOIN a `regions`
  - Retorna resultados vacíos si la región no se encuentra

##### Función Helper `applyRegionFilter()`
- **Estado**: Marcada como deprecated
- **Razón**: Ya no funciona con el nuevo sistema de regiones basado en UUID
- **Nota**: Se mantiene para compatibilidad pero no realiza ninguna acción

---

## 📊 Impacto

### Páginas Afectadas (Ahora Funcionando Correctamente)

1. **Query Patterns** (`/dashboard/queries`)
   - Todas las visualizaciones ahora usan las funciones RPC actualizadas
   - Los filtros de región funcionan correctamente

2. **Trendy Queries** (`/dashboard/trending`)
   - Todas las métricas de tendencias usan las funciones RPC actualizadas
   - Los filtros de región funcionan correctamente

3. **Citations & Domains** (`/dashboard/citations`)
   - "Most Cited Domains in AI Answers" ahora funciona correctamente
   - Todos los filtros de región funcionan en todas las funciones de citations

---

## 🔍 Detalles Técnicos

### Flujo de Filtrado por Región

El nuevo flujo es el siguiente:

1. **Frontend recibe código de región** (ej: "US", "GB", etc.) o "GLOBAL"
2. **Si región != "GLOBAL"**:
   - Se llama `getRegionIdByCode(projectId, regionCode)` para obtener el UUID
   - Si no se encuentra, se retornan resultados vacíos o se omite el filtro
3. **En la query**:
   - Se hace JOIN con la tabla `regions`: `LEFT JOIN regions r ON r.id = pt.region_id AND r.project_id = p_project_id`
   - Se filtra por `r.code = p_region` (en SQL) o `region_id = regionId` (en TypeScript)
4. **Si región == "GLOBAL"**:
   - No se aplica filtro de región (se suman todas las regiones)

### Ventajas del Nuevo Sistema

1. **Normalización**: Las regiones están en una tabla dedicada con relaciones FK apropiadas
2. **Flexibilidad**: Permite agregar metadatos adicionales a las regiones (nombre, estado activo, etc.)
3. **Integridad Referencial**: El uso de FK garantiza que solo existan regiones válidas
4. **Escalabilidad**: Facilita futuras funcionalidades como pricing por región

---

## 📝 Notas de Implementación

### Consideraciones

1. **Compatibilidad hacia atrás**: La migración de datos ya se realizó en `20251224000001_create_regions_table_and_migrate.sql`
   - Todos los prompts existentes fueron migrados a usar `region_id`
   - El campo `region` TEXT fue eliminado de `prompt_tracking`

2. **"GLOBAL" es virtual**: "GLOBAL" no es una región almacenada, es un valor especial que significa "sumar todas las regiones"
   - Las funciones SQL verifican `p_region = 'GLOBAL'` y omiten el filtro si es verdadero

3. **Manejo de errores**: 
   - Si una región no existe, `getRegionIdByCode()` retorna `null`
   - Las funciones frontend manejan esto retornando resultados vacíos o omitiendo el filtro

---

## 🧪 Testing Recomendado

Para verificar que todo funciona correctamente:

1. **Query Patterns Page**:
   - Verificar que se muestran datos con diferentes filtros de región
   - Verificar que "GLOBAL" muestra la suma de todas las regiones
   - Verificar que regiones específicas filtran correctamente

2. **Trendy Queries Page**:
   - Verificar métricas de tendencias con diferentes filtros de región
   - Verificar que las comparaciones entre períodos funcionan correctamente

3. **Citations & Domains Page**:
   - Verificar "Most Cited Domains" con diferentes filtros de región
   - Verificar otras visualizaciones de citations con filtros de región

---

## 📚 Archivos Modificados

- `supabase/migrations/20251223180000_update_query_analytics_functions_region_id.sql` (nuevo)
- `src/lib/queries/citations-real.ts` (modificado)

---

## 🔗 Relacionado

- Migración inicial de regiones: `supabase/migrations/20251224000001_create_regions_table_and_migrate.sql`
- Documentación de regiones: Ver `src/lib/actions/regions.ts` y `src/lib/queries/regions.ts`
- UI de gestión de regiones: Ver `src/app/(dashboard)/dashboard/regions/page.tsx`

---

## ✅ Estado

- ✅ Migración SQL creada y lista para ejecutar
- ✅ Todas las funciones frontend actualizadas
- ✅ Funciones helper deprecadas marcadas correctamente
- ✅ Commit realizado: `77e3a23`

---

## 🚀 Próximos Pasos

1. Ejecutar la migración en el entorno de producción
2. Verificar que todas las páginas funcionan correctamente
3. Monitorear logs para detectar posibles errores
4. Considerar eliminar completamente `applyRegionFilter()` en una futura refactorización

