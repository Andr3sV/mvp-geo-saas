-- =============================================
-- DEBUG: Region Filter Diagnosis
-- =============================================

-- 1. Check competitors with their regions
SELECT 
  id,
  name,
  domain,
  region,
  is_active
FROM competitors
WHERE project_id = 'YOUR_PROJECT_ID'
ORDER BY region, name;

-- 2. Check prompts with their regions
SELECT 
  id,
  prompt,
  region,
  is_active
FROM prompt_tracking
WHERE project_id = 'YOUR_PROJECT_ID'
ORDER BY region, created_at DESC
LIMIT 20;

-- 3. Check competitor citations with full join details
SELECT 
  cc.id as citation_id,
  cc.created_at,
  c.name as competitor_name,
  c.region as competitor_region,
  c.is_active as competitor_active,
  ar.platform,
  pt.region as prompt_region,
  pt.prompt
FROM competitor_citations cc
INNER JOIN competitors c ON cc.competitor_id = c.id
INNER JOIN ai_responses ar ON cc.ai_response_id = ar.id
INNER JOIN prompt_tracking pt ON ar.prompt_tracking_id = pt.id
WHERE cc.project_id = 'YOUR_PROJECT_ID'
ORDER BY cc.created_at DESC
LIMIT 50;

-- 4. Test the OR filter manually for Spain
SELECT 
  cc.id as citation_id,
  cc.created_at,
  c.name as competitor_name,
  c.region as competitor_region,
  pt.region as prompt_region
FROM competitor_citations cc
INNER JOIN competitors c ON cc.competitor_id = c.id AND c.is_active = true
INNER JOIN ai_responses ar ON cc.ai_response_id = ar.id
INNER JOIN prompt_tracking pt ON ar.prompt_tracking_id = pt.id
WHERE cc.project_id = 'YOUR_PROJECT_ID'
  AND (c.region = 'ES' OR c.region = 'GLOBAL')  -- Competitor region filter
  AND pt.region = 'ES'                           -- Prompt region filter
ORDER BY cc.created_at DESC
LIMIT 20;

-- 5. Count competitors by region
SELECT 
  region,
  COUNT(*) as count,
  array_agg(name) as competitors
FROM competitors
WHERE project_id = 'YOUR_PROJECT_ID'
  AND is_active = true
GROUP BY region
ORDER BY region;

-- 6. Count prompts by region
SELECT 
  region,
  COUNT(*) as count
FROM prompt_tracking
WHERE project_id = 'YOUR_PROJECT_ID'
  AND is_active = true
GROUP BY region
ORDER BY region;

-- 7. Count citations by competitor region and prompt region
SELECT 
  c.region as competitor_region,
  pt.region as prompt_region,
  COUNT(*) as citation_count,
  array_agg(DISTINCT c.name) as competitors
FROM competitor_citations cc
INNER JOIN competitors c ON cc.competitor_id = c.id AND c.is_active = true
INNER JOIN ai_responses ar ON cc.ai_response_id = ar.id
INNER JOIN prompt_tracking pt ON ar.prompt_tracking_id = pt.id
WHERE cc.project_id = 'YOUR_PROJECT_ID'
GROUP BY c.region, pt.region
ORDER BY c.region, pt.region;

