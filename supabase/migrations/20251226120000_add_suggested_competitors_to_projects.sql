-- =============================================
-- MIGRATION: Add suggested_competitors column to projects
-- Description: Store AI-generated competitor suggestions during project creation wizard
-- Date: 2025-12-26
-- =============================================

-- Add suggested_competitors column to projects table
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS suggested_competitors JSONB;

COMMENT ON COLUMN public.projects.suggested_competitors IS 'JSONB column to store AI-generated competitor suggestions during project creation wizard. Structure: { competitors: [{ name: string, domain: string }], generated_at: string }';

