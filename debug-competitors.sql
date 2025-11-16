-- =============================================
-- DEBUG SCRIPT: Competitor Citations
-- Ejecuta esto en Supabase SQL Editor
-- =============================================

-- 1. ¿Existe la tabla?
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'competitor_citations'
) AS table_exists;

-- 2. ¿Cuántos competidores activos tienes?
SELECT 
  p.name AS project_name,
  c.name AS competitor_name,
  c.is_active,
  c.created_at
FROM competitors c
JOIN projects p ON p.id = c.project_id
ORDER BY c.created_at DESC;

-- 3. ¿Hay ai_responses recientes?
SELECT 
  id,
  project_id,
  platform,
  status,
  prompt_tracking_id,
  created_at,
  LEFT(response_text, 100) AS response_preview
FROM ai_responses
ORDER BY created_at DESC
LIMIT 5;

-- 4. ¿Hay competitor_citations?
SELECT COUNT(*) AS total_competitor_citations
FROM competitor_citations;

-- 5. Ver últimas 5 competitor_citations (si existen)
SELECT 
  cc.id,
  c.name AS competitor_name,
  cc.citation_text,
  cc.sentiment,
  cc.created_at
FROM competitor_citations cc
JOIN competitors c ON c.id = cc.competitor_id
ORDER BY cc.created_at DESC
LIMIT 5;

-- 6. ¿Hay brand citations recientes?
SELECT 
  cd.id,
  cd.citation_text,
  cd.sentiment,
  cd.created_at
FROM citations_detail cd
ORDER BY cd.created_at DESC
LIMIT 5;

