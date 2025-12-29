-- Script para borrar registros de brand_evaluations y sentiment_themes
-- creados el 26 y 27 de diciembre de 2025 para el proyecto específico
-- Project ID: 14731e0a-f583-4854-8830-bea339b47d7f

BEGIN;

-- Verificar cuántos registros se van a borrar ANTES de borrar
SELECT 
  'brand_evaluations' as tabla,
  COUNT(*) as registros_a_borrar
FROM brand_evaluations
WHERE project_id = '14731e0a-f583-4854-8830-bea339b47d7f'
  AND DATE(created_at) BETWEEN '2025-12-26' AND '2025-12-27';

SELECT 
  'sentiment_themes' as tabla,
  COUNT(*) as registros_a_borrar
FROM sentiment_themes
WHERE project_id = '14731e0a-f583-4854-8830-bea339b47d7f'
  AND DATE(created_at) BETWEEN '2025-12-26' AND '2025-12-27';

-- Borrar de brand_evaluations
DELETE FROM brand_evaluations
WHERE project_id = '14731e0a-f583-4854-8830-bea339b47d7f'
  AND DATE(created_at) BETWEEN '2025-12-26' AND '2025-12-27';

-- Borrar de sentiment_themes
DELETE FROM sentiment_themes
WHERE project_id = '14731e0a-f583-4854-8830-bea339b47d7f'
  AND DATE(created_at) BETWEEN '2025-12-26' AND '2025-12-27';

-- Verificar que se borraron correctamente
SELECT 
  'brand_evaluations' as tabla,
  COUNT(*) as registros_restantes
FROM brand_evaluations
WHERE project_id = '14731e0a-f583-4854-8830-bea339b47d7f'
  AND DATE(created_at) BETWEEN '2025-12-26' AND '2025-12-27';

SELECT 
  'sentiment_themes' as tabla,
  COUNT(*) as registros_restantes
FROM sentiment_themes
WHERE project_id = '14731e0a-f583-4854-8830-bea339b47d7f'
  AND DATE(created_at) BETWEEN '2025-12-26' AND '2025-12-27';

-- Si todo está correcto, hacer COMMIT
-- Si hay algún problema, hacer ROLLBACK
-- COMMIT;
-- ROLLBACK;

