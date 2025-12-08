# Cómo Sincronizar Funciones con Inngest

## Problema: Las funciones no aparecen en el dashboard

Si las nuevas funciones (`analyze-brands-batch` y `analyze-single-response`) no aparecen en el dashboard de Inngest, sigue estos pasos:

## Solución Paso a Paso

### 1. Verificar que el Servicio Está Desplegado

Primero, asegúrate de que el servicio se haya desplegado con los cambios nuevos:

1. Ve a Railway → tu servicio `backend-orchestrator`
2. Verifica en **Deployments** que el último deploy incluye el commit `53534f0` (o más reciente)
3. Verifica que el servicio esté corriendo (status: "Active")

### 2. Verificar que el Endpoint Está Accesible

Prueba que el endpoint de Inngest esté funcionando:

```bash
curl https://tu-app.railway.app/api/inngest
```

O visita en el navegador:

```
https://tu-app.railway.app/health
```

Deberías ver:

```json
{
  "status": "ok",
  "timestamp": "..."
}
```

### 3. Sincronizar Funciones con Inngest

**Opción A: Desde el Dashboard de Inngest (Recomendado)**

1. Ve a [app.inngest.com](https://app.inngest.com)
2. Selecciona tu app: **"prompt-analysis-orchestrator"**
3. Ve a **Settings** → **Sync** (o **Getting Started** → **Sync your app**)
4. Ingresa tu URL de Railway:
   ```
   https://tu-app.railway.app/api/inngest
   ```
5. Haz clic en **"Sync app here"** o **"Sync"**
6. Espera unos segundos mientras Inngest descubre las funciones

**Opción B: Usando Inngest CLI (Alternativa)**

Si tienes el CLI instalado:

```bash
npx inngest-cli@latest dev --url https://tu-app.railway.app/api/inngest
```

### 4. Verificar que las Funciones Aparecen

Después de sincronizar:

1. Ve a **Functions** en el dashboard de Inngest
2. Deberías ver estas funciones:
   - ✅ `schedule-daily-analysis`
   - ✅ `process-single-prompt`
   - ✅ `test-function`
   - ✅ `manual-schedule-analysis`
   - ✅ **`analyze-brands-batch`** ← Nueva
   - ✅ **`analyze-single-response`** ← Nueva

### 5. Verificar Logs del Servicio

En Railway, ve a **Logs** y busca este mensaje al iniciar:

```
✅ Functions registered: schedule-daily-analysis, process-single-prompt, test-function, manual-schedule-analysis, analyze-brands-batch, analyze-single-response
```

Si ves este mensaje, las funciones están registradas correctamente en el código.

## Troubleshooting

### Las funciones aún no aparecen después de sincronizar

**Causa 1: El servicio no se ha desplegado con los cambios nuevos**

- Verifica en Railway que el último deploy es reciente
- Si no, haz un redeploy manual o espera a que Railway detecte el push

**Causa 2: Error al cargar las funciones**

- Revisa los logs de Railway para ver si hay errores al iniciar
- Busca errores de importación o sintaxis

**Causa 3: El endpoint no es accesible**

- Verifica que el servicio esté corriendo
- Verifica que la URL sea correcta (debe terminar en `/api/inngest`)
- Verifica que no haya problemas de red/firewall

**Causa 4: Inngest no puede acceder al endpoint**

- Verifica que el servicio tenga "Public Networking" habilitado en Railway
- Verifica que no haya restricciones de CORS o autenticación

### Verificar Manualmente que las Funciones Están Registradas

Puedes verificar directamente en el código que las funciones están exportadas:

1. Ve a `backend-orchestrator/backend-orchestrator/src/index.ts`
2. Verifica que estas líneas estén presentes:

   ```typescript
   import { analyzeBrandsBatch } from "./inngest/functions/analyze-brands-batch";
   import { analyzeSingleResponse } from "./inngest/functions/analyze-single-response";

   functions: [
     // ... otras funciones
     analyzeBrandsBatch,
     analyzeSingleResponse,
   ],
   ```

### Forzar un Redeploy

Si nada funciona, fuerza un redeploy:

1. En Railway, ve a **Settings**
2. Haz clic en **Redeploy**
3. Espera a que termine el deploy
4. Vuelve a sincronizar en Inngest

## Verificación Final

Una vez que las funciones aparezcan:

1. Haz clic en `analyze-brands-batch`
2. Verifica que muestre:

   - **Trigger**: Cron `0 3 * * *` (3:00 AM daily)
   - **Status**: Synced (verde)

3. Haz clic en `analyze-single-response`
4. Verifica que muestre:
   - **Trigger**: Event `brand/analyze-response`
   - **Status**: Synced (verde)

## Notas Importantes

- **Inngest sincroniza automáticamente** cada vez que detecta cambios, pero a veces necesita un sync manual
- **El sync puede tardar unos segundos** en descubrir todas las funciones
- **Si cambias el código**, necesitas hacer redeploy y luego sync nuevamente
