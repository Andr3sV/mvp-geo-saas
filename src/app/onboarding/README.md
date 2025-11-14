# Onboarding Flow

## Flujo de 4 Pasos

### Paso 1: Crear Workspace
- Usuario ingresa nombre del workspace
- Se genera slug automático
- Se crea workspace y se asigna como owner

### Paso 2: Crear Proyecto
- Usuario ingresa nombre del proyecto/cliente
- Se genera slug automático
- Se crea proyecto asociado al workspace
- Usuario se asigna como admin del proyecto

### Paso 3: URL del Cliente
- Campo opcional para la URL del cliente
- Si se proporciona, se valida formato
- Se usa para generar prompts personalizados

### Paso 4: Seleccionar Prompts
- Sistema genera 12 prompts sugeridos basados en:
  - Nombre del cliente
  - Industria detectada de la URL
- Usuario puede:
  - Seleccionar/deseleccionar prompts
  - Agregar prompts personalizados
- Mínimo 1 prompt requerido

## Redirección

Después de completar, usuario es redirigido a `/dashboard`

## Testing

Para probar el flujo:
1. Registrar nuevo usuario
2. Automáticamente redirige a `/onboarding`
3. Completar los 4 pasos
4. Verificar datos en Supabase

