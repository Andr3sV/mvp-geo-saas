-- Create analysis_queue table
CREATE TABLE IF NOT EXISTS public.analysis_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_tracking_id UUID NOT NULL REFERENCES public.prompt_tracking(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    error_message TEXT,
    batch_id UUID -- To group daily runs
);

-- Enable RLS
ALTER TABLE public.analysis_queue ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_analysis_queue_status ON public.analysis_queue(status);
CREATE INDEX IF NOT EXISTS idx_analysis_queue_batch_id ON public.analysis_queue(batch_id);

-- RLS Policies (Service Role only usually, but adding admin access just in case)
CREATE POLICY "Admins can view queue"
    ON public.analysis_queue
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.workspace_members 
            WHERE role IN ('owner', 'admin')
        )
    );

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_analysis_queue_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_analysis_queue_timestamp
    BEFORE UPDATE ON public.analysis_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_analysis_queue_timestamp();

