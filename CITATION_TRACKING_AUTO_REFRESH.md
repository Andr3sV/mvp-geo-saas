# Citation Tracking: Actualización Automática

## Problema Identificado

Los datos en la página de "Citation Tracking" no se actualizaban automáticamente cuando se generaban nuevas respuestas de IA. La página solo se actualizaba cuando:

1. Cambiaba el proyecto seleccionado
2. Cambiaban los filtros (fecha, plataforma, región, topic)
3. El usuario recargaba manualmente la página

Esto significaba que si se ejecutaba un análisis de prompts (manual o automático), los nuevos datos no aparecían en la interfaz hasta que el usuario cambiara algún filtro o recargara la página.

## Causa Raíz

La página de Citation Tracking (`src/app/(dashboard)/dashboard/citations/page.tsx`) solo cargaba datos en los `useEffect` que dependían de los filtros. No había ningún mecanismo de:

- **Polling automático**: Para verificar nuevos datos periódicamente
- **Refresh manual**: Para que el usuario pueda actualizar los datos cuando lo desee
- **Supabase Realtime**: Para escuchar cambios en tiempo real (opción más avanzada)

## Solución Implementada

Se implementaron dos mecanismos de actualización:

### 1. Auto-Refresh Automático (Cada 30 segundos)

- La página se actualiza automáticamente cada 30 segundos cuando está visible
- Solo se ejecuta si la pestaña del navegador está activa (`document.visibilityState === 'visible'`)
- Se detiene automáticamente cuando cambian los filtros o cuando el componente se desmonta

### 2. Botón de Refresh Manual

- Botón "Refresh" en el header de la página
- Muestra un spinner mientras se actualiza
- Muestra la hora de la última actualización
- Permite al usuario actualizar los datos cuando lo desee

## Cambios Realizados

### Archivo: `src/app/(dashboard)/dashboard/citations/page.tsx`

1. **Nuevos imports**:
   - `useRef` de React para manejar el intervalo
   - `Button` de shadcn/ui
   - `RefreshCw` icon de lucide-react

2. **Nuevos estados**:
   - `isRefreshing`: Indica si se está actualizando
   - `lastRefreshTime`: Timestamp de la última actualización
   - `refreshIntervalRef`: Referencia al intervalo de auto-refresh

3. **Nueva función `refreshData()`**:
   - Actualiza todos los datos de la página (métricas, fuentes, evolución)
   - Previene refreshes concurrentes
   - Actualiza el timestamp de última actualización

4. **Nuevo `useEffect` para auto-refresh**:
   - Configura un intervalo de 30 segundos
   - Solo se ejecuta si la página está visible
   - Se limpia automáticamente cuando cambian los filtros

5. **UI actualizada**:
   - Botón de refresh en el header
   - Indicador de última actualización
   - Spinner animado durante el refresh

## Flujo de Datos

```
1. Usuario abre la página de Citation Tracking
   ↓
2. Se cargan los datos iniciales (useEffect con filtros)
   ↓
3. Se inicia el auto-refresh (cada 30 segundos)
   ↓
4. Cada 30 segundos:
   - Verifica si la página está visible
   - Si está visible, ejecuta refreshData()
   - Actualiza todos los datos
   - Actualiza el timestamp de última actualización
   ↓
5. Usuario puede hacer click en "Refresh" para actualizar manualmente
   ↓
6. Cuando cambian los filtros, se reinicia el auto-refresh
```

## Consideraciones

### Rendimiento

- El auto-refresh solo se ejecuta cuando la página está visible
- Se previenen refreshes concurrentes
- Las queries se ejecutan en paralelo usando `Promise.all()`

### Experiencia de Usuario

- El usuario ve claramente cuándo fue la última actualización
- Puede actualizar manualmente cuando lo desee
- No hay interrupciones visuales durante el refresh (solo un spinner en el botón)

### Futuras Mejoras

1. **Supabase Realtime**: Escuchar cambios en tiempo real en las tablas `ai_responses` y `citations_detail`
2. **Notificaciones**: Mostrar una notificación cuando se detecten nuevos datos
3. **Configuración**: Permitir al usuario configurar el intervalo de auto-refresh
4. **Optimización**: Usar `useSWR` o `react-query` para mejor manejo de caché y revalidación

## Verificación

Para verificar que funciona:

1. Abre la página de Citation Tracking
2. Ejecuta un análisis de prompts (manual o automático)
3. Espera hasta 30 segundos o haz click en "Refresh"
4. Los nuevos datos deberían aparecer automáticamente

## Diagnóstico

Si los datos aún no aparecen después del refresh, ejecuta el script SQL `diagnose_citation_tracking.sql` para verificar:

1. Si las respuestas se están creando en `ai_responses`
2. Si las citas se están insertando en `citations_detail`
3. Si hay un delay entre la creación de respuestas y citas
4. Si las citas tienen URLs (requerido para mostrarse en Citation Tracking)

