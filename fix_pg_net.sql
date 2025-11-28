-- ============================================
-- HABILITAR EXTENSIÓN pg_net
-- ============================================
-- Esta extensión es NECESARIA para que el cron job pueda hacer llamadas HTTP
-- a las Edge Functions de Supabase.
-- 
-- IMPORTANTE: Ejecuta este script PRIMERO antes de usar el cron job.
-- ============================================

-- Verificar si pg_net está habilitada
SELECT 
    extname, 
    extversion,
    CASE 
        WHEN extname = 'pg_net' THEN '✅ pg_net está habilitada'
        ELSE '❌ pg_net NO está habilitada'
    END as estado
FROM pg_extension 
WHERE extname = 'pg_net';

-- Habilitar pg_net si no está habilitada
-- Nota: Esto puede requerir permisos de superusuario
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Verificar nuevamente
SELECT 
    extname, 
    extversion,
    '✅ pg_net habilitada correctamente' as estado
FROM pg_extension 
WHERE extname = 'pg_net';

-- Probar que funciona (debería devolver un request_id)
-- Si esto falla, puede ser un problema de permisos o configuración
SELECT 
    net.http_get('https://google.com') as prueba_conexion,
    '✅ pg_net funciona correctamente' as resultado;
