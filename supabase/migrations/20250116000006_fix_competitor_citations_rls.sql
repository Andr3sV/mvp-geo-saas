-- =============================================
-- MIGRATION: Fix RLS for competitor_citations
-- Description: Allow Edge Functions (service role) to insert competitor citations
-- Date: 2025-01-16
-- =============================================

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Project admins can manage competitor citations" ON competitor_citations;

-- Service role can insert (for Edge Functions)
CREATE POLICY "Service can create competitor citations"
ON competitor_citations FOR INSERT
WITH CHECK (true);

-- Service role can update (for Edge Functions)
CREATE POLICY "Service can update competitor citations"
ON competitor_citations FOR UPDATE
USING (true);

-- Service role can delete (for cleanup)
CREATE POLICY "Service can delete competitor citations"
ON competitor_citations FOR DELETE
USING (true);

-- Re-add admin management for authenticated users
CREATE POLICY "Project admins can manage competitor citations"
ON competitor_citations FOR ALL
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = competitor_citations.project_id
      AND pm.user_id = auth.uid()
      AND pm.role = 'admin'
  )
);

-- Add comment
COMMENT ON POLICY "Service can create competitor citations" ON competitor_citations 
IS 'Allows Edge Functions to create competitor citations during AI analysis';

