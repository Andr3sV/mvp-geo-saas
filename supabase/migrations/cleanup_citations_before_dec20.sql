-- Script para borrar registros creados hasta el 20 de diciembre de 2025 (incluyendo el 20)
-- Tablas: citations, brand_evaluations, brand_mentions, brand_sentiment_attributes
-- ⚠️ ADVERTENCIA: Este script eliminará registros de TODOS los proyectos

BEGIN;

-- Verificar cuántos registros se van a borrar ANTES de borrar
SELECT 
  'citations' as tabla,
  COUNT(*) as registros_a_borrar,
  MIN(created_at) as fecha_mas_antigua,
  MAX(created_at) as fecha_mas_reciente
FROM citations
WHERE DATE(created_at) <= '2025-12-20';

SELECT 
  'brand_evaluations' as tabla,
  COUNT(*) as registros_a_borrar,
  MIN(created_at) as fecha_mas_antigua,
  MAX(created_at) as fecha_mas_reciente
FROM brand_evaluations
WHERE DATE(created_at) <= '2025-12-20';

SELECT 
  'brand_mentions' as tabla,
  COUNT(*) as registros_a_borrar,
  MIN(created_at) as fecha_mas_antigua,
  MAX(created_at) as fecha_mas_reciente
FROM brand_mentions
WHERE DATE(created_at) <= '2025-12-20';

SELECT 
  'brand_sentiment_attributes' as tabla,
  COUNT(*) as registros_a_borrar,
  MIN(created_at) as fecha_mas_antigua,
  MAX(created_at) as fecha_mas_reciente
FROM brand_sentiment_attributes
WHERE DATE(created_at) <= '2025-12-20';

-- Verificar distribución por proyecto (opcional, para información)
SELECT 
  'citations' as tabla,
  project_id,
  COUNT(*) as registros_a_borrar
FROM citations
WHERE DATE(created_at) <= '2025-12-20'
GROUP BY project_id
ORDER BY registros_a_borrar DESC;

-- Borrar de citations
DELETE FROM citations
WHERE DATE(created_at) <= '2025-12-20';

-- Borrar de brand_evaluations
DELETE FROM brand_evaluations
WHERE DATE(created_at) <= '2025-12-20';

-- Borrar de brand_mentions
DELETE FROM brand_mentions
WHERE DATE(created_at) <= '2025-12-20';

-- Borrar de brand_sentiment_attributes
DELETE FROM brand_sentiment_attributes
WHERE DATE(created_at) <= '2025-12-20';

-- Verificar que se borraron correctamente
SELECT 
  'citations' as tabla,
  COUNT(*) as registros_restantes_hasta_20_dic
FROM citations
WHERE DATE(created_at) <= '2025-12-20';

SELECT 
  'brand_evaluations' as tabla,
  COUNT(*) as registros_restantes_hasta_20_dic
FROM brand_evaluations
WHERE DATE(created_at) <= '2025-12-20';

SELECT 
  'brand_mentions' as tabla,
  COUNT(*) as registros_restantes_hasta_20_dic
FROM brand_mentions
WHERE DATE(created_at) <= '2025-12-20';

SELECT 
  'brand_sentiment_attributes' as tabla,
  COUNT(*) as registros_restantes_hasta_20_dic
FROM brand_sentiment_attributes
WHERE DATE(created_at) <= '2025-12-20';

-- Verificar cuántos registros quedan después del 20 de diciembre
SELECT 
  'citations' as tabla,
  COUNT(*) as registros_desde_21_dic,
  MIN(created_at) as fecha_mas_antigua_restante,
  MAX(created_at) as fecha_mas_reciente_restante
FROM citations
WHERE DATE(created_at) > '2025-12-20';

SELECT 
  'brand_evaluations' as tabla,
  COUNT(*) as registros_desde_21_dic,
  MIN(created_at) as fecha_mas_antigua_restante,
  MAX(created_at) as fecha_mas_reciente_restante
FROM brand_evaluations
WHERE DATE(created_at) > '2025-12-20';

SELECT 
  'brand_mentions' as tabla,
  COUNT(*) as registros_desde_21_dic,
  MIN(created_at) as fecha_mas_antigua_restante,
  MAX(created_at) as fecha_mas_reciente_restante
FROM brand_mentions
WHERE DATE(created_at) > '2025-12-20';

SELECT 
  'brand_sentiment_attributes' as tabla,
  COUNT(*) as registros_desde_21_dic,
  MIN(created_at) as fecha_mas_antigua_restante,
  MAX(created_at) as fecha_mas_reciente_restante
FROM brand_sentiment_attributes
WHERE DATE(created_at) > '2025-12-20';

-- Si todo está correcto, hacer COMMIT
-- Si hay algún problema, hacer ROLLBACK
-- COMMIT;
-- ROLLBACK;
