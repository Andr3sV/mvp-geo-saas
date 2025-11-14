-- =============================================
-- Fix RLS Policies - Remove Circular Dependencies
-- =============================================

-- Drop problematic policies
DROP POLICY IF EXISTS "Members can read workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins can add workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Admins can remove workspace members" ON public.workspace_members;

DROP POLICY IF EXISTS "Users can read own workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can read accessible projects" ON public.projects;
DROP POLICY IF EXISTS "Workspace members can create projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can update projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can delete projects" ON public.projects;

DROP POLICY IF EXISTS "Users can read project members" ON public.project_members;
DROP POLICY IF EXISTS "Admins can add project members" ON public.project_members;
DROP POLICY IF EXISTS "Admins can remove project members" ON public.project_members;

DROP POLICY IF EXISTS "Users can read accessible citations" ON public.citations;
DROP POLICY IF EXISTS "Users can read accessible prompts" ON public.prompt_tracking;
DROP POLICY IF EXISTS "Users can create prompts" ON public.prompt_tracking;
DROP POLICY IF EXISTS "Users can update prompts" ON public.prompt_tracking;

DROP POLICY IF EXISTS "Users can read accessible competitors" ON public.competitors;
DROP POLICY IF EXISTS "Users can manage competitors" ON public.competitors;
DROP POLICY IF EXISTS "Users can read competitor mentions" ON public.competitor_mentions;

-- =============================================
-- WORKSPACE MEMBERS - Fixed Policies
-- =============================================

-- Users can read their own workspace memberships
CREATE POLICY "Users can read own memberships"
    ON public.workspace_members
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own membership when creating a workspace (via trigger/function)
CREATE POLICY "Users can insert own membership"
    ON public.workspace_members
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Workspace owners can manage members (checked via workspace owner_id)
CREATE POLICY "Owners can manage members"
    ON public.workspace_members
    FOR ALL
    USING (
        auth.uid() IN (
            SELECT owner_id FROM public.workspaces 
            WHERE id = workspace_members.workspace_id
        )
    );

-- =============================================
-- WORKSPACES - Fixed Policies
-- =============================================

-- Users can read workspaces where they are the owner
CREATE POLICY "Users can read own workspaces"
    ON public.workspaces
    FOR SELECT
    USING (
        auth.uid() = owner_id
        OR
        auth.uid() IN (
            SELECT wm.user_id FROM public.workspace_members wm 
            WHERE wm.workspace_id = workspaces.id
        )
    );

-- Keep existing policies for workspaces (these are fine)
-- Users can create workspaces - already exists
-- Owners can update/delete - already exists

-- =============================================
-- PROJECTS - Fixed Policies
-- =============================================

-- Users can read projects in workspaces they own or are members of
CREATE POLICY "Users can read accessible projects"
    ON public.projects
    FOR SELECT
    USING (
        -- User is workspace owner
        auth.uid() IN (
            SELECT owner_id FROM public.workspaces 
            WHERE id = projects.workspace_id
        )
        OR
        -- User is workspace member
        EXISTS (
            SELECT 1 FROM public.workspace_members 
            WHERE workspace_id = projects.workspace_id 
            AND user_id = auth.uid()
        )
        OR
        -- User is project member
        EXISTS (
            SELECT 1 FROM public.project_members 
            WHERE project_id = projects.id 
            AND user_id = auth.uid()
        )
    );

-- Workspace owners and members can create projects
CREATE POLICY "Workspace members can create projects"
    ON public.projects
    FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT owner_id FROM public.workspaces 
            WHERE id = projects.workspace_id
        )
        OR
        EXISTS (
            SELECT 1 FROM public.workspace_members 
            WHERE workspace_id = projects.workspace_id 
            AND user_id = auth.uid()
        )
    );

-- Workspace owners can update/delete projects
CREATE POLICY "Workspace owners can manage projects"
    ON public.projects
    FOR ALL
    USING (
        auth.uid() IN (
            SELECT owner_id FROM public.workspaces 
            WHERE id = projects.workspace_id
        )
    );

-- =============================================
-- PROJECT MEMBERS - Fixed Policies
-- =============================================

-- Users can read their own project memberships
CREATE POLICY "Users can read own project memberships"
    ON public.project_members
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can read project members of projects they have access to
CREATE POLICY "Users can read project members"
    ON public.project_members
    FOR SELECT
    USING (
        -- User is workspace owner
        auth.uid() IN (
            SELECT w.owner_id FROM public.workspaces w
            JOIN public.projects p ON p.workspace_id = w.id
            WHERE p.id = project_members.project_id
        )
        OR
        -- User is project member
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = project_members.project_id
            AND pm.user_id = auth.uid()
        )
    );

-- Workspace owners can add project members
CREATE POLICY "Workspace owners can manage project members"
    ON public.project_members
    FOR ALL
    USING (
        auth.uid() IN (
            SELECT w.owner_id FROM public.workspaces w
            JOIN public.projects p ON p.workspace_id = w.id
            WHERE p.id = project_members.project_id
        )
    );

-- =============================================
-- CITATIONS - Fixed Policies
-- =============================================

CREATE POLICY "Users can read project citations"
    ON public.citations
    FOR SELECT
    USING (
        -- User is workspace owner
        auth.uid() IN (
            SELECT w.owner_id FROM public.workspaces w
            JOIN public.projects p ON p.workspace_id = w.id
            WHERE p.id = citations.project_id
        )
        OR
        -- User is workspace member
        EXISTS (
            SELECT 1 FROM public.workspace_members wm
            JOIN public.projects p ON p.workspace_id = wm.workspace_id
            WHERE p.id = citations.project_id
            AND wm.user_id = auth.uid()
        )
        OR
        -- User is project member
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = citations.project_id
            AND pm.user_id = auth.uid()
        )
    );

-- =============================================
-- PROMPT TRACKING - Fixed Policies
-- =============================================

CREATE POLICY "Users can read project prompts"
    ON public.prompt_tracking
    FOR SELECT
    USING (
        -- User is workspace owner
        auth.uid() IN (
            SELECT w.owner_id FROM public.workspaces w
            JOIN public.projects p ON p.workspace_id = w.id
            WHERE p.id = prompt_tracking.project_id
        )
        OR
        -- User is workspace member
        EXISTS (
            SELECT 1 FROM public.workspace_members wm
            JOIN public.projects p ON p.workspace_id = wm.workspace_id
            WHERE p.id = prompt_tracking.project_id
            AND wm.user_id = auth.uid()
        )
        OR
        -- User is project member
        EXISTS (
            SELECT 1 FROM public.project_members pm
            WHERE pm.project_id = prompt_tracking.project_id
            AND pm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage project prompts"
    ON public.prompt_tracking
    FOR ALL
    USING (
        -- User is workspace owner
        auth.uid() IN (
            SELECT w.owner_id FROM public.workspaces w
            JOIN public.projects p ON p.workspace_id = w.id
            WHERE p.id = prompt_tracking.project_id
        )
        OR
        -- User is workspace member
        EXISTS (
            SELECT 1 FROM public.workspace_members wm
            JOIN public.projects p ON p.workspace_id = wm.workspace_id
            WHERE p.id = prompt_tracking.project_id
            AND wm.user_id = auth.uid()
        )
    );

-- =============================================
-- COMPETITORS - Fixed Policies
-- =============================================

CREATE POLICY "Users can read project competitors"
    ON public.competitors
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT w.owner_id FROM public.workspaces w
            JOIN public.projects p ON p.workspace_id = w.id
            WHERE p.id = competitors.project_id
        )
        OR
        EXISTS (
            SELECT 1 FROM public.workspace_members wm
            JOIN public.projects p ON p.workspace_id = wm.workspace_id
            WHERE p.id = competitors.project_id
            AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Workspace owners can manage competitors"
    ON public.competitors
    FOR ALL
    USING (
        auth.uid() IN (
            SELECT w.owner_id FROM public.workspaces w
            JOIN public.projects p ON p.workspace_id = w.id
            WHERE p.id = competitors.project_id
        )
    );

-- =============================================
-- COMPETITOR MENTIONS - Fixed Policies
-- =============================================

CREATE POLICY "Users can read competitor mentions"
    ON public.competitor_mentions
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT w.owner_id FROM public.workspaces w
            JOIN public.projects p ON p.workspace_id = w.id
            JOIN public.competitors c ON c.project_id = p.id
            WHERE c.id = competitor_mentions.competitor_id
        )
    );

