-- =============================================
-- Migration: Add category column to prompt_tracking
-- Description: Adds category column and fixes RLS policies
-- =============================================

-- Add category column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'prompt_tracking' AND column_name = 'category'
  ) THEN
    ALTER TABLE prompt_tracking ADD COLUMN category TEXT DEFAULT 'general';
  END IF;
END $$;

-- Add check constraint for valid categories
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'prompt_tracking' AND constraint_name = 'prompt_tracking_category_check'
  ) THEN
    ALTER TABLE prompt_tracking ADD CONSTRAINT prompt_tracking_category_check 
    CHECK (category IN ('product', 'pricing', 'features', 'competitors', 'use_cases', 'technical', 'general'));
  END IF;
END $$;

-- Update RLS policies for prompt_tracking
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view prompts in their projects" ON prompt_tracking;
DROP POLICY IF EXISTS "Users can insert prompts in their projects" ON prompt_tracking;
DROP POLICY IF EXISTS "Users can update prompts in their projects" ON prompt_tracking;
DROP POLICY IF EXISTS "Users can delete prompts in their projects" ON prompt_tracking;

-- Create comprehensive RLS policies
-- 1. SELECT: Users can view prompts for projects they have access to
CREATE POLICY "Users can view prompts in their projects" ON prompt_tracking
  FOR SELECT
  USING (
    project_id IN (
      SELECT p.id 
      FROM projects p
      INNER JOIN workspaces w ON p.workspace_id = w.id
      WHERE w.owner_id = auth.uid()
    )
  );

-- 2. INSERT: Users can create prompts in their projects
CREATE POLICY "Users can insert prompts in their projects" ON prompt_tracking
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT p.id 
      FROM projects p
      INNER JOIN workspaces w ON p.workspace_id = w.id
      WHERE w.owner_id = auth.uid()
    )
  );

-- 3. UPDATE: Users can update prompts in their projects
CREATE POLICY "Users can update prompts in their projects" ON prompt_tracking
  FOR UPDATE
  USING (
    project_id IN (
      SELECT p.id 
      FROM projects p
      INNER JOIN workspaces w ON p.workspace_id = w.id
      WHERE w.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT p.id 
      FROM projects p
      INNER JOIN workspaces w ON p.workspace_id = w.id
      WHERE w.owner_id = auth.uid()
    )
  );

-- 4. DELETE: Users can delete prompts in their projects
CREATE POLICY "Users can delete prompts in their projects" ON prompt_tracking
  FOR DELETE
  USING (
    project_id IN (
      SELECT p.id 
      FROM projects p
      INNER JOIN workspaces w ON p.workspace_id = w.id
      WHERE w.owner_id = auth.uid()
    )
  );

-- Ensure RLS is enabled
ALTER TABLE prompt_tracking ENABLE ROW LEVEL SECURITY;

-- Add comment
COMMENT ON COLUMN prompt_tracking.category IS 'Category of the prompt: product, pricing, features, competitors, use_cases, technical, or general';

