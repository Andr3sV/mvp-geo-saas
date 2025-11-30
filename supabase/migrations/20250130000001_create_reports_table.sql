-- =============================================
-- MIGRATION: Create Reports Table
-- Description: Store generated detailed reports
-- Date: 2025-01-30
-- =============================================

CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  period TEXT NOT NULL CHECK (period IN ('yesterday', 'last-week', 'last-month', 'last-3-months')),
  topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
  topic_name TEXT, -- Store topic name for historical reference
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Report metadata
  report_data JSONB, -- Store the full report data
  insights JSONB -- Store generated insights
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reports_project_id ON public.reports(project_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_period ON public.reports(period);
CREATE INDEX IF NOT EXISTS idx_reports_topic_id ON public.reports(topic_id);

-- Unique constraint: One report per day per period/topic combination
-- Using a unique index with immutable date truncation
CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_unique_daily 
  ON public.reports(project_id, period, topic_id, date_trunc('day', created_at AT TIME ZONE 'UTC'));

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read reports for accessible projects"
  ON public.reports
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.workspace_members 
      WHERE workspace_id = (
        SELECT workspace_id FROM public.projects 
        WHERE id = reports.project_id
      )
    )
    OR
    auth.uid() IN (
      SELECT user_id FROM public.project_members 
      WHERE project_id = reports.project_id
    )
  );

CREATE POLICY "Users can create reports for accessible projects"
  ON public.reports
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM public.workspace_members 
      WHERE workspace_id = (
        SELECT workspace_id FROM public.projects 
        WHERE id = reports.project_id
      )
    )
    OR
    auth.uid() IN (
      SELECT user_id FROM public.project_members 
      WHERE project_id = reports.project_id
    )
  );

CREATE POLICY "Users can delete their own reports"
  ON public.reports
  FOR DELETE
  USING (auth.uid() = created_by);

-- Trigger for updated_at
CREATE TRIGGER update_reports_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.reports IS 'Stores generated detailed reports with period, topic, and full report data';
COMMENT ON COLUMN public.reports.report_data IS 'Full report data including visibility score, share of voice, sentiment, etc.';
COMMENT ON COLUMN public.reports.insights IS 'Generated AI insights for each section of the report';

