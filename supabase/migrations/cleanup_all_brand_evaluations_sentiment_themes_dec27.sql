-- Script para borrar TODOS los registros de brand_evaluations y sentiment_themes
-- creados el 27 de diciembre de 2025 (sin filtrar por proyecto)
-- ⚠️ ADVERTENCIA: Este script eliminará registros de TODOS los proyectos

BEGIN;

-- Verificar cuántos registros se van a borrar ANTES de borrar
SELECT 
  'brand_evaluations' as tabla,
  COUNT(*) as registros_a_borrar
FROM brand_evaluations
WHERE DATE(created_at) = '2025-12-27';

SELECT 
  'sentiment_themes' as tabla,
  COUNT(*) as registros_a_borrar
FROM sentiment_themes
WHERE DATE(created_at) = '2025-12-27';

-- Borrar de brand_evaluations
DELETE FROM brand_evaluations
WHERE DATE(created_at) = '2025-12-27';

-- Borrar de sentiment_themes
DELETE FROM sentiment_themes
WHERE DATE(created_at) = '2025-12-27';

-- Verificar que se borraron correctamente
SELECT 
  'brand_evaluations' as tabla,
  COUNT(*) as registros_restantes
FROM brand_evaluations
WHERE DATE(created_at) = '2025-12-27';

SELECT 
  'sentiment_themes' as tabla,
  COUNT(*) as registros_restantes
FROM sentiment_themes
WHERE DATE(created_at) = '2025-12-27';

-- Si todo está correcto, hacer COMMIT
-- Si hay algún problema, hacer ROLLBACK
-- COMMIT;
-- ROLLBACK;
