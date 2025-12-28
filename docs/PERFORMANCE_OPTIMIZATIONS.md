# Optimizaciones de Rendimiento - Share of Mentions

Este documento describe las optimizaciones de rendimiento implementadas en la página "Share of Mentions" y las mejores prácticas para replicar en otras páginas.

## Tabla de Contenidos

1. [Optimizaciones de Base de Datos](#optimizaciones-de-base-de-datos)
2. [Optimizaciones de Queries](#optimizaciones-de-queries)
3. [Optimizaciones de Frontend](#optimizaciones-de-frontend)
4. [Skeleton Loaders - Guía de Implementación](#skeleton-loaders---guía-de-implementación)
5. [Prevención de Re-renders](#prevención-de-re-renders)
6. [Resumen de Mejoras](#resumen-de-mejoras)

---

## Optimizaciones de Base de Datos

### 1. Índices Compuestos

**Archivo**: `supabase/migrations/20251228120000_optimize_daily_brand_stats_indexes.sql`

Se crearon índices compuestos optimizados para las queries más frecuentes:

```sql
-- Índice para queries de brand (competitor_id IS NULL)
CREATE INDEX IF NOT EXISTS idx_daily_brand_stats_brand_main 
ON daily_brand_stats(project_id, stat_date DESC, entity_type, platform, region_id)
WHERE competitor_id IS NULL;

-- Índice para queries de competitors (competitor_id IS NOT NULL)
CREATE INDEX IF NOT EXISTS idx_daily_brand_stats_competitor_main 
ON daily_brand_stats(project_id, stat_date DESC, entity_type, platform, region_id, competitor_id)
WHERE competitor_id IS NOT NULL;

-- Índice para queries de competitors por región y activos
CREATE INDEX IF NOT EXISTS idx_competitors_project_region_active 
ON competitors(project_id, region, is_active)
WHERE is_active = true;

-- Índice para topic_id cuando se filtra por topic
CREATE INDEX IF NOT EXISTS idx_daily_brand_stats_topic_optimized 
ON daily_brand_stats(project_id, topic_id, stat_date DESC, entity_type)
WHERE topic_id IS NOT NULL;
```

**Impacto**: Reducción significativa en el tiempo de ejecución de queries complejas.

### 2. Función SQL para Datos en Tiempo Real

**Archivo**: `supabase/migrations/20251228130000_add_today_mentions_aggregated_function.sql`

Se creó una función SQL optimizada para agregar menciones del día actual:

```sql
CREATE OR REPLACE FUNCTION get_today_mentions_aggregated(
  p_project_id UUID,
  p_cutoff_time TIMESTAMPTZ,
  p_platform TEXT DEFAULT NULL,
  p_region_id UUID DEFAULT NULL,
  p_topic_id UUID DEFAULT NULL
)
RETURNS TABLE (
  brand_mentions BIGINT,
  competitor_mentions JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE bm.brand_type = 'client')::BIGINT as brand_mentions,
    COALESCE(
      jsonb_object_agg(
        bm.competitor_id::TEXT, 
        COUNT(*)::BIGINT
      ) FILTER (WHERE bm.brand_type = 'competitor' AND bm.competitor_id IS NOT NULL),
      '{}'::jsonb
    ) as competitor_mentions
  FROM brand_mentions bm
  INNER JOIN ai_responses ar ON ar.id = bm.ai_response_id
  LEFT JOIN prompt_tracking pt ON pt.id = ar.prompt_tracking_id
  WHERE bm.project_id = p_project_id
    AND bm.created_at >= p_cutoff_time
    AND (p_platform IS NULL OR ar.platform = p_platform)
    AND (p_region_id IS NULL OR pt.region_id = p_region_id)
    AND (p_topic_id IS NULL OR pt.topic_id = p_topic_id);
END;
$$ LANGUAGE plpgsql;
```

**Impacto**: Reemplaza múltiples queries complejas con una sola llamada a función, reduciendo round-trips a la base de datos.

---

## Optimizaciones de Queries

### 1. Unificación de Queries Brand/Competitors

**Archivo**: `src/lib/queries/share-of-voice.ts`

**Antes**: Se hacían dos queries separadas (una para brand, otra para competitors)

**Después**: Una sola query que obtiene ambos y los separa en JavaScript:

```typescript
// Query unificada
const statsResult = await buildUnifiedStatsQuery(startStr, endStr);

// Separar en JavaScript
const brandStats = statsResult.data?.filter(s => 
  s.entity_type === "brand" && !s.competitor_id
) || [];

const compStats = statsResult.data?.filter(s => 
  s.entity_type === "competitor" && s.competitor_id
) || [];
```

**Impacto**: Reduce a la mitad el número de queries a la base de datos.

### 2. Optimización de Filtrado en SQL

**Archivo**: `src/lib/actions/competitors.ts`

**Antes**: Se obtenían todos los competidores y se filtraban en JavaScript

**Después**: El filtrado se hace directamente en la query SQL:

```typescript
// Filtrado en SQL
let query = supabase
  .from("competitors")
  .select("*")
  .eq("project_id", projectId)
  .eq("is_active", true);

if (region && region !== "GLOBAL") {
  query = query.eq("region", region);
}
```

**Impacto**: Reduce la cantidad de datos transferidos y procesados.

### 3. Eliminación de Queries Redundantes

**Archivo**: `src/lib/queries/share-of-voice.ts`

**Antes**: `getShareOfVoiceInsights` hacía queries adicionales a la base de datos

**Después**: `getShareOfVoiceInsights` ahora acepta datos ya calculados:

```typescript
// Antes
const insights = await getShareOfVoiceInsights(); // Hacía queries internas

// Después
const [sov, trends] = await Promise.all([...]);
const insights = await getShareOfVoiceInsights(sov, trends); // Procesa datos ya obtenidos
```

**Impacto**: Elimina queries redundantes.

---

## Optimizaciones de Frontend

### 1. Caché de Competidores

**Archivo**: `src/app/(dashboard)/dashboard/share-of-voice/page.tsx`

**Implementación**: Uso de `useRef` para mantener caché persistente entre renders:

```typescript
// Caché persistente con useRef (no se recrea en cada render)
const competitorsCache = useRef(new Map<string, any[]>());

const loadRegionFilteredCompetitors = useCallback(async () => {
  const cacheKey = `${selectedProjectId}-${region}`;
  
  // Verificar caché primero
  if (competitorsCache.current.has(cacheKey)) {
    setRegionFilteredCompetitors(competitorsCache.current.get(cacheKey)!);
    return;
  }
  
  // Si no está en caché, hacer query y guardar
  const result = await getCompetitorsByRegion(selectedProjectId, region);
  competitorsCache.current.set(cacheKey, competitorsForSelector);
}, [selectedProjectId, region]);
```

**Impacto**: Evita queries repetidas cuando el usuario cambia filtros y vuelve a valores anteriores.

### 2. Memoización de Cálculos Costosos

**Archivo**: `src/app/(dashboard)/dashboard/share-of-voice/page.tsx`

**Implementación**: Uso de `useMemo` para cálculos que se hacían en cada render:

```typescript
// Antes: Cálculos en IIFE dentro del render
{(() => {
  const regionCompetitorIds = new Set(regionFilteredCompetitors.map(...));
  const filteredCompetitors = sovData.competitors.filter(...);
  // ... más cálculos
  return <Component />;
})()}

// Después: Memoizado con useMemo
const filteredEntities = useMemo(() => {
  if (!sovData) return { allEntities: [], filteredCompetitors: [] };
  
  const regionCompetitorIds = new Set(regionFilteredCompetitors.map(...));
  const filteredCompetitors = sovData.competitors.filter(...);
  // ... cálculos
  return { allEntities, filteredCompetitors };
}, [sovData, regionFilteredCompetitors, trendsData]);
```

**Impacto**: Los cálculos solo se ejecutan cuando cambian las dependencias, no en cada render.

### 3. Optimización de Componentes con React.memo

**Archivos**:
- `src/components/ui/brand-logo.tsx`
- `src/components/share-of-voice/share-evolution-chart.tsx`
- `src/components/share-of-voice/market-share-distribution.tsx`

**Implementación**:

```typescript
// Memoizar componentes para evitar re-renders innecesarios
export const ShareEvolutionChart = React.memo(function ShareEvolutionChart({ 
  data, 
  entities, 
  isLoading 
}: ShareEvolutionChartProps) {
  // ...
});
```

**Impacto**: Evita re-renders cuando las props no cambian.

### 4. Prevención de Doble Carga

**Archivo**: `src/app/(dashboard)/dashboard/share-of-voice/page.tsx`

**Problema**: Los datos se cargaban dos veces debido a:
- Dependencias duplicadas en `useEffect`
- `loadEvolutionData` se ejecutaba cuando `selectedCompetitorId` se reseteaba por cambio de región

**Solución**:

```typescript
// Refs para prevenir cargas duplicadas
const isLoadingRef = useRef(false);
const isResettingCompetitorRef = useRef(false);

const loadData = useCallback(async () => {
  // Evitar cargas duplicadas
  if (isLoadingRef.current) return;
  isLoadingRef.current = true;
  
  try {
    // ... carga de datos
  } finally {
    isLoadingRef.current = false;
  }
}, [dependencies]);

// Prevenir carga cuando es reset de región
useEffect(() => {
  isResettingCompetitorRef.current = true;
  setSelectedCompetitorId(null);
  setTimeout(() => {
    isResettingCompetitorRef.current = false;
  }, 100);
}, [region]);

const loadEvolutionData = useCallback(async () => {
  // No cargar si es un reset de región
  if (isResettingCompetitorRef.current && selectedCompetitorId === null) {
    return;
  }
  // ... resto del código
}, [dependencies]);
```

**Impacto**: Elimina la doble carga de datos.

### 5. Corrección de Dependencias en useEffect

**Problema**: Dependencias duplicadas causaban ejecuciones múltiples

**Solución**:

```typescript
// ANTES: Dependencias duplicadas
useEffect(() => {
  loadData();
}, [loadData, dateRange.from, dateRange.to]); // dateRange ya está en loadData

// DESPUÉS: Solo la función memoizada
useEffect(() => {
  if (selectedProjectId && dateRange.from && dateRange.to) {
    loadData();
  }
}, [loadData]); // loadData ya incluye todas las dependencias necesarias
```

**Impacto**: Evita ejecuciones duplicadas de efectos.

---

## Skeleton Loaders - Guía de Implementación

### ¿Qué son los Skeleton Loaders?

Los skeleton loaders son placeholders animados que se muestran mientras se cargan los datos, mejorando la percepción de velocidad y la experiencia de usuario.

### Ventajas

1. **Mejor percepción de velocidad**: El usuario ve que algo está pasando en lugar de una pantalla en blanco
2. **Carga progresiva**: Diferentes secciones pueden cargarse independientemente
3. **Mejor UX**: Similar a aplicaciones modernas como Facebook, LinkedIn, etc.

### Implementación en StatCard

**Archivo**: `src/components/dashboard/stat-card.tsx`

```typescript
import { Skeleton } from "@/components/ui/skeleton";

interface StatCardProps {
  // ... otras props
  isLoading?: boolean;
}

export function StatCard({ title, value, description, icon: Icon, isLoading }: StatCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          {Icon && <Icon className="h-4 w-4 text-muted-foreground opacity-50" />}
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-20 mb-2" />
          {description && <Skeleton className="h-3 w-32" />}
        </CardContent>
      </Card>
    );
  }

  // ... render normal
}
```

### Implementación en Páginas

**Antes** (oculta todo mientras carga):

```typescript
if (isLoading || !data) {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      <p>Loading...</p>
    </div>
  );
}

return (
  <div>
    <StatCard ... />
    <Chart ... />
  </div>
);
```

**Después** (muestra skeletons mientras carga):

```typescript
// Eliminar early return, mostrar contenido siempre
return (
  <div>
    {/* Stats Cards con skeletons */}
    <div className="grid gap-4 md:grid-cols-4">
      {isLoading || !data ? (
        <>
          <StatCard title="" value="" description="" icon={Trophy} isLoading={true} />
          <StatCard title="" value="" description="" icon={MessageSquare} isLoading={true} />
          <StatCard title="" value="" description="" icon={TrendingUp} isLoading={true} />
          <StatCard title="" value="" description="" icon={Users} isLoading={true} />
        </>
      ) : (
        <>
          <StatCard title="Your Share" value={`${data.percentage}%`} ... />
          {/* ... más cards */}
        </>
      )}
    </div>

    {/* Charts ya manejan su propio isLoading */}
    <Chart data={data} isLoading={isLoading || isLoadingCharts} />
  </div>
);
```

### Checklist para Implementar Skeleton Loaders

1. **Eliminar early returns con loading spinner**
   - Buscar `if (isLoading || !data) return <LoadingSpinner />`
   - Eliminar estos bloques

2. **Agregar soporte `isLoading` a componentes**
   - Si el componente no lo tiene, agregarlo
   - Usar el componente `Skeleton` de `@/components/ui/skeleton`

3. **Mostrar skeletons en cada sección**
   - Stats Cards: Mostrar 4 skeletons cuando `isLoading || !data`
   - Charts: Pasar `isLoading` como prop (ya lo manejan)
   - Tables: Mostrar skeletons de filas

4. **Manejar estados de loading independientes**
   - Usar diferentes estados: `isLoading`, `isLoadingCharts`, `isLoadingTable`, etc.
   - Cada sección puede tener su propio skeleton

### Ejemplo Completo: Platform Breakdown

**Archivo**: `src/app/(dashboard)/dashboard/platforms/page.tsx`

```typescript
// No hay early return
return (
  <div className="space-y-6">
    <PageHeader ... />
    <FiltersToolbar ... />

    {/* Platform Cards con skeletons */}
    <div className="grid gap-4 md:grid-cols-2">
      {overviewData?.platforms.map((platform) => (
        <PlatformCard key={platform.id} platform={platform} isLoading={isLoading} />
      ))}
      {!overviewData && isLoading && (
        <>
          <PlatformCard platform={{} as any} isLoading={true} />
          <PlatformCard platform={{} as any} isLoading={true} />
        </>
      )}
    </div>

    {/* Charts con su propio isLoading */}
    <PlatformEvolutionChart data={evolutionData} isLoading={isLoading} />
    <DailyPlatformBattle data={evolutionData} isLoading={isLoading} />
  </div>
);
```

---

## Prevención de Re-renders

### 1. Uso Correcto de useCallback

**Regla**: Envolver funciones que se pasan como dependencias o props:

```typescript
const loadData = useCallback(async () => {
  // ... código
}, [selectedProjectId, dateRange.from, dateRange.to, platform, region, topicId]);

useEffect(() => {
  loadData();
}, [loadData]); // Solo la función memoizada
```

### 2. Uso Correcto de useMemo

**Regla**: Memoizar cálculos costosos y arrays/objetos que se pasan como props:

```typescript
// Memoizar arrays para evitar recreaciones
const memoizedCompetitors = useMemo(() => regionFilteredCompetitors, [regionFilteredCompetitors]);

// Memoizar cálculos complejos
const filteredEntities = useMemo(() => {
  // ... cálculos costosos
  return { allEntities, filteredCompetitors };
}, [sovData, regionFilteredCompetitors, trendsData]);
```

### 3. React.memo para Componentes

**Regla**: Memoizar componentes que reciben props que no cambian frecuentemente:

```typescript
export const ShareEvolutionChart = React.memo(function ShareEvolutionChart({ 
  data, 
  entities, 
  isLoading 
}: ShareEvolutionChartProps) {
  // ...
});
```

### 4. Separar useEffect por Responsabilidad

**Regla**: No mezclar lógica en un solo useEffect:

```typescript
// ANTES: Lógica mezclada
useEffect(() => {
  loadRegionFilteredCompetitors();
  setSelectedCompetitorId(null); // Esto causa re-render
}, [selectedProjectId, loadRegionFilteredCompetitors]);

// DESPUÉS: Separado
useEffect(() => {
  if (selectedProjectId) {
    loadRegionFilteredCompetitors();
  }
}, [selectedProjectId, loadRegionFilteredCompetitors]);

useEffect(() => {
  setSelectedCompetitorId(null);
}, [region]); // Solo cuando region cambia
```

---

## Resumen de Mejoras

### Métricas Esperadas

| Métrica | Antes | Después | Mejora |
|---------|-------|---------|--------|
| Tiempo de carga inicial | 4-6 segundos | 2-3 segundos | ~50% |
| Número de queries | 8-10 queries | 4-5 queries | ~50% |
| Re-renders innecesarios | Múltiples | Mínimos | ~80% |
| Percepción de velocidad | Lenta (spinner completo) | Rápida (skeletons) | Mejorada |

### Optimizaciones por Categoría

#### Base de Datos
- ✅ 4 índices compuestos optimizados
- ✅ 1 función SQL para agregación en tiempo real
- ✅ Reducción de round-trips a la base de datos

#### Queries
- ✅ Unificación de queries brand/competitors
- ✅ Filtrado en SQL en lugar de JavaScript
- ✅ Eliminación de queries redundantes

#### Frontend
- ✅ Caché de competidores con useRef
- ✅ Memoización de cálculos costosos
- ✅ React.memo en componentes
- ✅ Prevención de doble carga
- ✅ Corrección de dependencias en useEffect
- ✅ Skeleton loaders para mejor UX

### Archivos Modificados

1. `supabase/migrations/20251228120000_optimize_daily_brand_stats_indexes.sql`
2. `supabase/migrations/20251228130000_add_today_mentions_aggregated_function.sql`
3. `src/lib/queries/share-of-voice.ts`
4. `src/lib/actions/competitors.ts`
5. `src/app/(dashboard)/dashboard/share-of-voice/page.tsx`
6. `src/components/dashboard/stat-card.tsx`
7. `src/components/ui/brand-logo.tsx`
8. `src/components/share-of-voice/share-evolution-chart.tsx`
9. `src/components/share-of-voice/market-share-distribution.tsx`
10. `src/components/shared/evolution-chart.tsx`

---

## Próximos Pasos para Otras Páginas

### Checklist de Optimización

Para cada página nueva o existente:

- [ ] **Base de Datos**
  - [ ] Verificar índices para queries frecuentes
  - [ ] Crear funciones SQL para agregaciones complejas si es necesario

- [ ] **Queries**
  - [ ] Unificar queries cuando sea posible
  - [ ] Mover filtrado a SQL
  - [ ] Eliminar queries redundantes

- [ ] **Frontend**
  - [ ] Implementar skeleton loaders
  - [ ] Eliminar early returns con loading spinner
  - [ ] Usar useCallback para funciones en useEffect
  - [ ] Usar useMemo para cálculos costosos
  - [ ] Memoizar componentes con React.memo cuando sea apropiado
  - [ ] Prevenir cargas duplicadas con refs
  - [ ] Corregir dependencias en useEffect

- [ ] **Testing**
  - [ ] Verificar que no hay doble carga
  - [ ] Verificar que los skeletons se muestran correctamente
  - [ ] Verificar que no hay re-renders innecesarios

---

## Referencias

- [React Performance Optimization](https://react.dev/learn/render-and-commit)
- [PostgreSQL Indexing Best Practices](https://www.postgresql.org/docs/current/indexes.html)
- [Skeleton Loading Patterns](https://www.nngroup.com/articles/skeleton-screens/)

---

**Última actualización**: Diciembre 2024
**Autor**: Optimizaciones de rendimiento - Share of Mentions

