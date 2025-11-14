-- =============================================
-- Ateneai Database Schema
-- Initial Migration
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABLES
-- =============================================

-- Users Profile Table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workspaces Table
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects Table
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    client_url TEXT,
    description TEXT,
    brand_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, slug)
);

-- Workspace Members Table
CREATE TABLE IF NOT EXISTS public.workspace_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, user_id)
);

-- Project Members Table
CREATE TABLE IF NOT EXISTS public.project_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'member', 'viewer')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

-- Citations Table
CREATE TABLE IF NOT EXISTS public.citations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('chatgpt', 'gemini', 'anthropic', 'perplexity')),
    query TEXT NOT NULL,
    brand_mention BOOLEAN DEFAULT false,
    sentiment TEXT CHECK (sentiment IN ('positive', 'negative', 'neutral')),
    context TEXT,
    response_text TEXT,
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prompt Tracking Table
CREATE TABLE IF NOT EXISTS public.prompt_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Competitors Table (for Share of Voice)
CREATE TABLE IF NOT EXISTS public.competitors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    website TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Competitor Mentions Table
CREATE TABLE IF NOT EXISTS public.competitor_mentions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    competitor_id UUID NOT NULL REFERENCES public.competitors(id) ON DELETE CASCADE,
    citation_id UUID NOT NULL REFERENCES public.citations(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invitations Table
CREATE TABLE IF NOT EXISTS public.invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    invited_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_workspaces_owner_id ON public.workspaces(owner_id);
CREATE INDEX idx_workspaces_slug ON public.workspaces(slug);

CREATE INDEX idx_projects_workspace_id ON public.projects(workspace_id);
CREATE INDEX idx_projects_slug ON public.projects(workspace_id, slug);

CREATE INDEX idx_workspace_members_workspace_id ON public.workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user_id ON public.workspace_members(user_id);

CREATE INDEX idx_project_members_project_id ON public.project_members(project_id);
CREATE INDEX idx_project_members_user_id ON public.project_members(user_id);

CREATE INDEX idx_citations_project_id ON public.citations(project_id);
CREATE INDEX idx_citations_platform ON public.citations(platform);
CREATE INDEX idx_citations_detected_at ON public.citations(detected_at DESC);
CREATE INDEX idx_citations_sentiment ON public.citations(sentiment);

CREATE INDEX idx_prompt_tracking_project_id ON public.prompt_tracking(project_id);
CREATE INDEX idx_prompt_tracking_is_active ON public.prompt_tracking(is_active);

CREATE INDEX idx_competitors_project_id ON public.competitors(project_id);

CREATE INDEX idx_invitations_email ON public.invitations(email);
CREATE INDEX idx_invitations_token ON public.invitations(token);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- TRIGGERS
-- =============================================

-- Trigger for users updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for workspaces updated_at
CREATE TRIGGER update_workspaces_updated_at
    BEFORE UPDATE ON public.workspaces
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for projects updated_at
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for prompt_tracking updated_at
CREATE TRIGGER update_prompt_tracking_updated_at
    BEFORE UPDATE ON public.prompt_tracking
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for competitors updated_at
CREATE TRIGGER update_competitors_updated_at
    BEFORE UPDATE ON public.competitors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to create user profile on auth signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.citations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- =============================================
-- USERS POLICIES
-- =============================================

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
    ON public.users
    FOR SELECT
    USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON public.users
    FOR UPDATE
    USING (auth.uid() = id);

-- =============================================
-- WORKSPACES POLICIES
-- =============================================

-- Users can read workspaces they are members of
CREATE POLICY "Users can read own workspaces"
    ON public.workspaces
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.workspace_members 
            WHERE workspace_id = id
        )
    );

-- Users can create workspaces
CREATE POLICY "Users can create workspaces"
    ON public.workspaces
    FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

-- Workspace owners can update their workspaces
CREATE POLICY "Owners can update workspaces"
    ON public.workspaces
    FOR UPDATE
    USING (auth.uid() = owner_id);

-- Workspace owners can delete their workspaces
CREATE POLICY "Owners can delete workspaces"
    ON public.workspaces
    FOR DELETE
    USING (auth.uid() = owner_id);

-- =============================================
-- WORKSPACE MEMBERS POLICIES
-- =============================================

-- Users can read workspace members if they're a member
CREATE POLICY "Members can read workspace members"
    ON public.workspace_members
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.workspace_members 
            WHERE workspace_id = workspace_members.workspace_id
        )
    );

-- Workspace owners and admins can add members
CREATE POLICY "Admins can add workspace members"
    ON public.workspace_members
    FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM public.workspace_members 
            WHERE workspace_id = workspace_members.workspace_id 
            AND role IN ('owner', 'admin')
        )
    );

-- Workspace owners and admins can remove members
CREATE POLICY "Admins can remove workspace members"
    ON public.workspace_members
    FOR DELETE
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.workspace_members 
            WHERE workspace_id = workspace_members.workspace_id 
            AND role IN ('owner', 'admin')
        )
    );

-- =============================================
-- PROJECTS POLICIES
-- =============================================

-- Users can read projects in their workspaces or projects they're members of
CREATE POLICY "Users can read accessible projects"
    ON public.projects
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.workspace_members 
            WHERE workspace_id = projects.workspace_id
        )
        OR
        auth.uid() IN (
            SELECT user_id FROM public.project_members 
            WHERE project_id = projects.id
        )
    );

-- Workspace members can create projects
CREATE POLICY "Workspace members can create projects"
    ON public.projects
    FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM public.workspace_members 
            WHERE workspace_id = projects.workspace_id
        )
    );

-- Workspace admins and project admins can update projects
CREATE POLICY "Admins can update projects"
    ON public.projects
    FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.workspace_members 
            WHERE workspace_id = projects.workspace_id 
            AND role IN ('owner', 'admin')
        )
        OR
        auth.uid() IN (
            SELECT user_id FROM public.project_members 
            WHERE project_id = projects.id 
            AND role = 'admin'
        )
    );

-- Workspace owners and project admins can delete projects
CREATE POLICY "Admins can delete projects"
    ON public.projects
    FOR DELETE
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.workspace_members 
            WHERE workspace_id = projects.workspace_id 
            AND role = 'owner'
        )
        OR
        auth.uid() IN (
            SELECT user_id FROM public.project_members 
            WHERE project_id = projects.id 
            AND role = 'admin'
        )
    );

-- =============================================
-- PROJECT MEMBERS POLICIES
-- =============================================

-- Users can read project members if they have access to the project
CREATE POLICY "Users can read project members"
    ON public.project_members
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.workspace_members 
            WHERE workspace_id = (
                SELECT workspace_id FROM public.projects 
                WHERE id = project_members.project_id
            )
        )
        OR
        auth.uid() IN (
            SELECT user_id FROM public.project_members 
            WHERE project_id = project_members.project_id
        )
    );

-- Project admins can add members
CREATE POLICY "Admins can add project members"
    ON public.project_members
    FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM public.project_members 
            WHERE project_id = project_members.project_id 
            AND role = 'admin'
        )
        OR
        auth.uid() IN (
            SELECT user_id FROM public.workspace_members 
            WHERE workspace_id = (
                SELECT workspace_id FROM public.projects 
                WHERE id = project_members.project_id
            )
            AND role IN ('owner', 'admin')
        )
    );

-- Project admins can remove members
CREATE POLICY "Admins can remove project members"
    ON public.project_members
    FOR DELETE
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.project_members 
            WHERE project_id = project_members.project_id 
            AND role = 'admin'
        )
        OR
        auth.uid() IN (
            SELECT user_id FROM public.workspace_members 
            WHERE workspace_id = (
                SELECT workspace_id FROM public.projects 
                WHERE id = project_members.project_id
            )
            AND role IN ('owner', 'admin')
        )
    );

-- =============================================
-- CITATIONS POLICIES
-- =============================================

-- Users can read citations from projects they have access to
CREATE POLICY "Users can read accessible citations"
    ON public.citations
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.workspace_members 
            WHERE workspace_id = (
                SELECT workspace_id FROM public.projects 
                WHERE id = citations.project_id
            )
        )
        OR
        auth.uid() IN (
            SELECT user_id FROM public.project_members 
            WHERE project_id = citations.project_id
        )
    );

-- Service role can insert citations (for backend processes)
CREATE POLICY "Service can create citations"
    ON public.citations
    FOR INSERT
    WITH CHECK (true);

-- =============================================
-- PROMPT TRACKING POLICIES
-- =============================================

-- Users can read prompt tracking for accessible projects
CREATE POLICY "Users can read accessible prompts"
    ON public.prompt_tracking
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.workspace_members 
            WHERE workspace_id = (
                SELECT workspace_id FROM public.projects 
                WHERE id = prompt_tracking.project_id
            )
        )
        OR
        auth.uid() IN (
            SELECT user_id FROM public.project_members 
            WHERE project_id = prompt_tracking.project_id
        )
    );

-- Users can create prompts for accessible projects
CREATE POLICY "Users can create prompts"
    ON public.prompt_tracking
    FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM public.workspace_members 
            WHERE workspace_id = (
                SELECT workspace_id FROM public.projects 
                WHERE id = prompt_tracking.project_id
            )
        )
        OR
        auth.uid() IN (
            SELECT user_id FROM public.project_members 
            WHERE project_id = prompt_tracking.project_id
            AND role IN ('admin', 'member')
        )
    );

-- Users can update prompts for accessible projects
CREATE POLICY "Users can update prompts"
    ON public.prompt_tracking
    FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.workspace_members 
            WHERE workspace_id = (
                SELECT workspace_id FROM public.projects 
                WHERE id = prompt_tracking.project_id
            )
        )
        OR
        auth.uid() IN (
            SELECT user_id FROM public.project_members 
            WHERE project_id = prompt_tracking.project_id
            AND role IN ('admin', 'member')
        )
    );

-- =============================================
-- COMPETITORS POLICIES
-- =============================================

-- Users can read competitors for accessible projects
CREATE POLICY "Users can read accessible competitors"
    ON public.competitors
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.workspace_members 
            WHERE workspace_id = (
                SELECT workspace_id FROM public.projects 
                WHERE id = competitors.project_id
            )
        )
        OR
        auth.uid() IN (
            SELECT user_id FROM public.project_members 
            WHERE project_id = competitors.project_id
        )
    );

-- Users can manage competitors for accessible projects
CREATE POLICY "Users can manage competitors"
    ON public.competitors
    FOR ALL
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.workspace_members 
            WHERE workspace_id = (
                SELECT workspace_id FROM public.projects 
                WHERE id = competitors.project_id
            )
            AND role IN ('owner', 'admin')
        )
        OR
        auth.uid() IN (
            SELECT user_id FROM public.project_members 
            WHERE project_id = competitors.project_id
            AND role = 'admin'
        )
    );

-- =============================================
-- COMPETITOR MENTIONS POLICIES
-- =============================================

-- Users can read competitor mentions for accessible projects
CREATE POLICY "Users can read competitor mentions"
    ON public.competitor_mentions
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.workspace_members 
            WHERE workspace_id = (
                SELECT workspace_id FROM public.projects 
                WHERE id = (
                    SELECT project_id FROM public.competitors 
                    WHERE id = competitor_mentions.competitor_id
                )
            )
        )
    );

-- =============================================
-- INVITATIONS POLICIES
-- =============================================

-- Users can read invitations sent by them or sent to them
CREATE POLICY "Users can read relevant invitations"
    ON public.invitations
    FOR SELECT
    USING (
        auth.uid() = invited_by 
        OR 
        (SELECT email FROM public.users WHERE id = auth.uid()) = email
    );

-- Users can create invitations for workspaces/projects they manage
CREATE POLICY "Admins can create invitations"
    ON public.invitations
    FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM public.workspace_members 
            WHERE workspace_id = invitations.workspace_id 
            AND role IN ('owner', 'admin')
        )
    );

