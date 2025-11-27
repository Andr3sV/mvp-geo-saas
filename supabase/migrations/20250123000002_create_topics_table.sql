-- Create topics table
CREATE TABLE IF NOT EXISTS public.topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT,
    color TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, name)
);

-- Enable RLS
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;

-- Add topic_id to prompt_tracking
ALTER TABLE public.prompt_tracking 
ADD COLUMN IF NOT EXISTS topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_topics_project_id ON public.topics(project_id);
CREATE INDEX IF NOT EXISTS idx_prompt_tracking_topic_id ON public.prompt_tracking(topic_id);

-- Migrate existing categories to topics
INSERT INTO public.topics (project_id, name)
SELECT DISTINCT project_id, category 
FROM public.prompt_tracking 
WHERE category IS NOT NULL AND category != ''
ON CONFLICT (project_id, name) DO NOTHING;

-- Link existing prompts to new topics
UPDATE public.prompt_tracking pt
SET topic_id = t.id
FROM public.topics t
WHERE pt.project_id = t.project_id 
AND pt.category = t.name;

-- RLS Policies for topics
CREATE POLICY "Users can read accessible topics"
    ON public.topics
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.workspace_members 
            WHERE workspace_id = (
                SELECT workspace_id FROM public.projects 
                WHERE id = topics.project_id
            )
        )
        OR
        auth.uid() IN (
            SELECT user_id FROM public.project_members 
            WHERE project_id = topics.project_id
        )
    );

CREATE POLICY "Users can manage topics"
    ON public.topics
    FOR ALL
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.workspace_members 
            WHERE workspace_id = (
                SELECT workspace_id FROM public.projects 
                WHERE id = topics.project_id
            )
            AND role IN ('owner', 'admin', 'member')
        )
        OR
        auth.uid() IN (
            SELECT user_id FROM public.project_members 
            WHERE project_id = topics.project_id
            AND role IN ('admin', 'member')
        )
    );

