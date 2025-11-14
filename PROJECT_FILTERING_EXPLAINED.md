# Sistema de Filtrado por Proyecto 🎯

## ¿Qué hemos implementado?

Acabamos de implementar un **sistema completo de gestión de contexto por proyecto** que resuelve el problema de que todos los datos se mostraban igual sin importar el proyecto seleccionado.

## Componentes Clave

### 1. **ProjectContext** (`src/contexts/project-context.tsx`)

Un Context API de React que:
- ✅ Mantiene el `selectedProjectId` en estado global
- ✅ Sincroniza el proyecto seleccionado con la URL (`?project=xxx`)
- ✅ Persiste la selección en `localStorage` para evitar reloads
- ✅ Es accesible desde cualquier componente del dashboard

```typescript
const { selectedProjectId, setSelectedProjectId } = useProject();
```

### 2. **ProjectProvider** (en `src/app/(dashboard)/layout.tsx`)

Envuelve toda la aplicación del dashboard para que todos los componentes hijos tengan acceso al contexto del proyecto:

```typescript
<ProjectProvider defaultProjectId={defaultProject?.id}>
  {/* Todo el dashboard */}
</ProjectProvider>
```

### 3. **ProjectInfoBanner** (`src/components/dashboard/project-info-banner.tsx`)

Un banner visual que:
- ✅ Muestra el nombre del proyecto actual
- ✅ Muestra la URL del cliente (si existe)
- ✅ Indica claramente que estás viendo datos de **ese proyecto específico**

### 4. **Actualización de todas las páginas**

Todas las páginas del dashboard ahora:
- ✅ Son `async` Server Components
- ✅ Obtienen los workspaces y proyectos disponibles
- ✅ Pasan esta información al `ProjectInfoBanner`
- ✅ **Preparadas para filtrar datos por `selectedProjectId`**

## ¿Cómo funciona en la práctica?

### Flujo de Usuario:

1. **Usuario selecciona proyecto** en el dropdown del header
2. `ProjectContext` actualiza:
   - El estado global (`selectedProjectId`)
   - La URL (`/dashboard/citations?project=abc123`)
   - El `localStorage` (para persistencia)
3. **ProjectInfoBanner** muestra:
   - Nombre del proyecto actual
   - URL del cliente
   - Indicador visual de filtrado activo
4. **Todas las páginas** reciben el contexto y pueden filtrar datos

### Ejemplo de uso en Fase 7:

```typescript
export default async function CitationsPage() {
  const workspaces = await getUserWorkspacesWithProjects();
  const { selectedProjectId } = useProject(); // ⚠️ Solo en Client Components

  // En Fase 7, filtraremos así:
  const citations = await getCitationsByProject(selectedProjectId);
  const sentiment = await getSentimentByProject(selectedProjectId);
  
  return (
    <div>
      <ProjectInfoBanner workspaces={workspaces} />
      
      {/* Datos reales filtrados por proyecto */}
      <StatCard value={citations.total} />
    </div>
  );
}
```

## 📊 Estado Actual (MVP - Datos Mock)

Actualmente **todas las páginas muestran datos mock** (hardcoded):
- Citation Tracking: `stats = { totalCitations: 847, ... }`
- Share of Voice: `shareOfVoice = { brand: { name: "Your Brand", ... }`
- Platform Breakdown: `platformStats = [{ name: "ChatGPT", ... }]`
- etc.

**Estos datos NO cambian cuando cambias de proyecto** porque son estáticos.

## 🚀 Fase 7: Integración con APIs de AI

En la **Fase 7**, implementaremos:

### 1. Tabla `ai_responses` en Supabase

```sql
CREATE TABLE ai_responses (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  platform TEXT, -- ChatGPT, Gemini, Claude, Perplexity
  query TEXT,
  response TEXT,
  mentioned BOOLEAN,
  position INTEGER,
  sentiment TEXT, -- positive, negative, neutral
  timestamp TIMESTAMPTZ
);
```

### 2. Queries que filtran por proyecto

```typescript
// src/lib/queries/analytics.ts
export async function getCitationsByProject(projectId: string) {
  const supabase = createClient();
  
  const { data } = await supabase
    .from('ai_responses')
    .select('*')
    .eq('project_id', projectId)
    .eq('mentioned', true);
  
  return {
    total: data.length,
    thisWeek: data.filter(/* last 7 days */).length,
    // ... más estadísticas
  };
}
```

### 3. Actualización automática

Cuando el usuario cambie de proyecto:
- El `selectedProjectId` se actualiza
- Las páginas se re-renderizan
- Las queries obtienen datos del nuevo proyecto
- **Los dashboards muestran datos diferentes para cada proyecto**

## ✅ Ventajas de esta arquitectura

1. **Separación clara**: Los datos de cada proyecto están aislados
2. **Deep linking**: Puedes compartir URLs con proyectos específicos
3. **Persistencia**: El proyecto seleccionado se mantiene después de reload
4. **Escalable**: Fácil agregar más filtros (fecha, plataforma, etc.)
5. **Type-safe**: TypeScript nos ayuda con la estructura de datos

## 🎯 Próximos pasos

Para que los datos realmente se filtren por proyecto, necesitamos:

1. **Fase 5**: Configuración de prompts por proyecto
2. **Fase 6**: Sistema de tracking automático
3. **Fase 7**: Integración con APIs de AI (OpenAI, Anthropic, etc.)
   - Ejecutar prompts configurados
   - Guardar respuestas en `ai_responses` tabla
   - Analizar menciones y sentiment
   - Mostrar datos reales filtrados por proyecto

## 💡 Nota importante

El sistema de filtrado por proyecto **ya está listo y funcionando**. Lo único que falta es reemplazar los datos mock con queries reales a Supabase que usen el `selectedProjectId` del contexto.

Cada proyecto tendrá:
- Sus propios prompts tracked
- Sus propias citaciones
- Su propio análisis de sentiment
- Sus propios competidores
- Sus propias estadísticas

**Todo completamente aislado y filtrado** 🎉

