-- Con porcentaje y filtro de proyecto, agrupado por región y plataforma
SELECT 
  DATE(ar.created_at) as fecha,
  COALESCE(r.code, 'GLOBAL') as region,
  ar.platform,
  COUNT(DISTINCT ar.id) as total_respuestas_generadas,
  COUNT(DISTINCT CASE WHEN bm.brand_type = 'client' THEN bm.id END) as total_mentions_marca_propia,
  COUNT(DISTINCT CASE WHEN bm.brand_type = 'competitor' THEN bm.id END) as total_mentions_competencia,
  COUNT(DISTINCT CASE WHEN c.citation_type = 'brand' THEN c.id END) as total_citas_marca_propia,
  COUNT(DISTINCT CASE WHEN c.citation_type = 'competitor' THEN c.id END) as total_citas_competencia,
  COUNT(DISTINCT bm.ai_response_id) as respuestas_con_mentions,
  ROUND(
    100.0 * COUNT(DISTINCT bm.ai_response_id) / NULLIF(COUNT(DISTINCT ar.id), 0), 
    2
  ) as porcentaje_respuestas_con_mentions
FROM ai_responses ar
LEFT JOIN prompt_tracking pt ON ar.prompt_tracking_id = pt.id
LEFT JOIN regions r ON pt.region_id = r.id AND r.project_id = ar.project_id
LEFT JOIN brand_mentions bm ON ar.id = bm.ai_response_id
LEFT JOIN citations c ON ar.id = c.ai_response_id
WHERE ar.project_id = 'a915d1f3-8a07-4b5b-a767-17bd2a28d684'
  AND ar.status = 'success'
  AND ar.platform IN ('openai', 'gemini')
GROUP BY DATE(ar.created_at), r.code, ar.platform
ORDER BY fecha DESC, r.code, ar.platform;

