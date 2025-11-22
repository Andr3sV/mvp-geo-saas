# Análisis de Problemas de Autenticación y Gestión de Usuarios

## 🔴 PROBLEMA 1: Error "Not authenticated" durante el registro

### Causa Raíz Identificada:
El problema ocurre porque **Supabase Auth requiere confirmación de email por defecto**, pero el flujo actual intenta redirigir al usuario a `/onboarding` inmediatamente después del registro, sin esperar la confirmación del email.

### Flujo Actual (PROBLEMÁTICO):
```
1. Usuario completa formulario de registro
2. supabase.auth.signUp() se ejecuta
3. Supabase crea el usuario pero NO lo autentica (requiere confirmación de email)
4. Código redirige a /onboarding
5. /onboarding intenta ejecutar createWorkspace()
6. createWorkspace() llama a supabase.auth.getUser()
7. ❌ ERROR: "Not authenticated" porque el usuario no ha confirmado su email
```

### Código Problemático:
**`src/app/(auth)/register/page.tsx` (líneas 43-47)**
```typescript
if (data.user) {
  // Redirect to onboarding to create workspace
  router.push("/onboarding");  // ❌ Usuario NO está autenticado aún
  router.refresh();
}
```

**`src/lib/actions/workspace.ts` (líneas 15-23)**
```typescript
export async function createWorkspace(data: { name: string }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated", data: null };  // ❌ Aquí falla
  }
  // ...
}
```

### Configuración de Supabase Auth:
Supabase tiene configurado por defecto:
- ✅ Email confirmation: **ENABLED** (requiere confirmación)
- ❌ Auto-confirm: **DISABLED**
- ❌ Email templates: No configurados para desarrollo local

### Soluciones Propuestas:

#### OPCIÓN A: Deshabilitar confirmación de email (RECOMENDADA PARA MVP)
**Pros:**
- Solución inmediata
- Mejor UX para usuarios
- Ideal para MVP/desarrollo

**Cons:**
- Menos seguro (usuarios pueden registrarse con emails falsos)
- No recomendado para producción

**Implementación:**
1. Ir a Supabase Dashboard → Authentication → Settings
2. Deshabilitar "Enable email confirmations"
3. O agregar en `supabase/config.toml`:
```toml
[auth.email]
enable_confirmations = false
```

#### OPCIÓN B: Implementar flujo de confirmación de email completo
**Pros:**
- Más seguro
- Mejor para producción
- Valida emails reales

**Cons:**
- Requiere configurar email templates
- UX más compleja
- Requiere más desarrollo

**Implementación:**
1. Configurar email templates en Supabase
2. Modificar flujo de registro para mostrar mensaje de "Check your email"
3. Implementar página de confirmación
4. Crear trigger para crear workspace automáticamente después de confirmación

#### OPCIÓN C: Modo híbrido (desarrollo vs producción)
- Desarrollo: Sin confirmación
- Producción: Con confirmación

---

## 🔴 PROBLEMA 2: Sistema de invitaciones no funciona

### Problemas Identificados:

#### 1. **No se envían emails de invitación**
**Ubicación:** `src/lib/actions/invitations.ts` (líneas 87-88)
```typescript
// TODO: Send email with invitation link in Phase 7
// For now, just return the token
```

**Problema:** El código genera el token y el link de invitación, pero NO envía el email.

**Solución:** Implementar envío de emails usando:
- Resend (recomendado)
- SendGrid
- Supabase Email (limitado)

#### 2. **Falta página de aceptación de invitaciones**
**Problema:** No existe la ruta `/invite/[token]` para que los usuarios acepten invitaciones.

**Archivos faltantes:**
- `src/app/invite/[token]/page.tsx` - Página para aceptar invitación
- Lógica para validar token
- Lógica para agregar usuario a workspace/project

#### 3. **Falta variable de entorno**
**Problema:** `SUPABASE_SERVICE_ROLE_KEY` puede no estar configurada

**Verificación necesaria:**
```bash
# Verificar en .env.local
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
```

#### 4. **No hay UI para invitar usuarios**
**Problema:** No hay componentes en el dashboard para:
- Invitar usuarios a workspace
- Invitar usuarios a proyecto
- Ver invitaciones pendientes
- Gestionar miembros

**Archivos faltantes:**
- Componente de invitación en settings
- Lista de miembros del workspace
- Lista de miembros del proyecto

---

## 📋 PLAN DE ACCIÓN RECOMENDADO

### FASE 1: Arreglar registro (URGENTE)
1. ✅ Deshabilitar confirmación de email en Supabase Dashboard
2. ✅ Verificar que el flujo de registro funcione
3. ✅ Probar creación de workspace después de registro

### FASE 2: Implementar sistema de invitaciones básico
1. ✅ Crear página `/invite/[token]`
2. ✅ Implementar lógica de aceptación de invitaciones
3. ✅ Crear componente de invitación en settings
4. ✅ Implementar envío de emails (Resend)

### FASE 3: UI de gestión de usuarios
1. ✅ Crear página de settings del workspace
2. ✅ Componente para listar miembros
3. ✅ Componente para invitar nuevos miembros
4. ✅ Gestión de roles y permisos

### FASE 4: Mejorar seguridad (PRODUCCIÓN)
1. ✅ Re-habilitar confirmación de email
2. ✅ Configurar email templates personalizados
3. ✅ Implementar rate limiting en invitaciones
4. ✅ Agregar 2FA (opcional)

---

## 🔧 CAMBIOS INMEDIATOS NECESARIOS

### 1. Deshabilitar confirmación de email
```sql
-- En Supabase Dashboard SQL Editor
UPDATE auth.config 
SET enable_email_confirmations = false;
```

O en Dashboard UI:
```
Authentication → Settings → Email Auth → 
Deshabilitar "Enable email confirmations"
```

### 2. Agregar manejo de errores en registro
```typescript
// src/app/(auth)/register/page.tsx
if (data.user) {
  // Verificar que el usuario esté realmente autenticado
  const { data: session } = await supabase.auth.getSession();
  
  if (session?.session) {
    router.push("/onboarding");
  } else {
    setError("Please check your email to confirm your account");
  }
}
```

### 3. Crear página de invitaciones
```typescript
// src/app/invite/[token]/page.tsx
// (Archivo a crear)
```

---

## 📊 ESTADO ACTUAL DEL CÓDIGO

### ✅ Funcionando:
- Formulario de registro
- Formulario de login
- Creación de workspace (cuando usuario está autenticado)
- Creación de proyecto
- Generación de tokens de invitación
- Validación de invitaciones duplicadas

### ❌ No Funcionando:
- Confirmación de email
- Flujo completo de registro → onboarding
- Envío de emails de invitación
- Aceptación de invitaciones
- UI de gestión de usuarios
- Listado de miembros

### ⚠️ Parcialmente Implementado:
- Sistema de invitaciones (backend listo, falta frontend y emails)
- Roles y permisos (definidos pero no aplicados en UI)

---

## 🎯 PRIORIDADES

1. **CRÍTICO**: Arreglar flujo de registro (deshabilitar confirmación de email)
2. **ALTO**: Crear página de aceptación de invitaciones
3. **ALTO**: Implementar envío de emails
4. **MEDIO**: Crear UI de gestión de usuarios
5. **BAJO**: Re-implementar confirmación de email para producción

