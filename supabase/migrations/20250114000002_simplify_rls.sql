-- =============================================
-- Simplified RLS Policies - No Circular Dependencies
-- =============================================

-- =============================================
-- WORKSPACES - Super Simple Policies
-- =============================================

-- Drop all workspace policies
DROP POLICY IF EXISTS "Users can read own workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can create workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Owners can update workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Owners can delete workspaces" ON public.workspaces;

-- Users can only read workspaces they own (no member checks to avoid recursion)
CREATE POLICY "Read own workspaces"
    ON public.workspaces
    FOR SELECT
    USING (auth.uid() = owner_id);

-- Users can create workspaces
CREATE POLICY "Create workspaces"
    ON public.workspaces
    FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

-- Users can update their own workspaces
CREATE POLICY "Update own workspaces"
    ON public.workspaces
    FOR UPDATE
    USING (auth.uid() = owner_id);

-- Users can delete their own workspaces
CREATE POLICY "Delete own workspaces"
    ON public.workspaces
    FOR DELETE
    USING (auth.uid() = owner_id);

-- =============================================
-- WORKSPACE_MEMBERS - Keep Simple
-- =============================================

-- These should already be simple from previous migration
-- But let's ensure they're correct

DROP POLICY IF EXISTS "Users can read own memberships" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can insert own membership" ON public.workspace_members;
DROP POLICY IF EXISTS "Owners can manage members" ON public.workspace_members;

-- Read: Users can see their own memberships
CREATE POLICY "Read own memberships"
    ON public.workspace_members
    FOR SELECT
    USING (auth.uid() = user_id);

-- Insert: Users can insert their own membership
CREATE POLICY "Insert own membership"
    ON public.workspace_members
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Update/Delete: Workspace owners can manage members
CREATE POLICY "Manage members as owner"
    ON public.workspace_members
    FOR ALL
    USING (
        auth.uid() IN (
            SELECT owner_id FROM public.workspaces 
            WHERE id = workspace_id
        )
    );

-- =============================================
-- PROJECTS - Simplified
-- =============================================

DROP POLICY IF EXISTS "Users can read accessible projects" ON public.projects;
DROP POLICY IF EXISTS "Workspace members can create projects" ON public.projects;
DROP POLICY IF EXISTS "Workspace owners can manage projects" ON public.projects;

-- Read: Users can read projects in workspaces they own
CREATE POLICY "Read workspace projects"
    ON public.projects
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT owner_id FROM public.workspaces 
            WHERE id = workspace_id
        )
    );

-- Insert: Workspace owners can create projects
CREATE POLICY "Create workspace projects"
    ON public.projects
    FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT owner_id FROM public.workspaces 
            WHERE id = workspace_id
        )
    );

-- Update: Workspace owners can update projects
CREATE POLICY "Update workspace projects"
    ON public.projects
    FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT owner_id FROM public.workspaces 
            WHERE id = workspace_id
        )
    );

-- Delete: Workspace owners can delete projects
CREATE POLICY "Delete workspace projects"
    ON public.projects
    FOR DELETE
    USING (
        auth.uid() IN (
            SELECT owner_id FROM public.workspaces 
            WHERE id = workspace_id
        )
    );

-- =============================================
-- PROJECT_MEMBERS - Simplified
-- =============================================

DROP POLICY IF EXISTS "Users can read own project memberships" ON public.project_members;
DROP POLICY IF EXISTS "Users can read project members" ON public.project_members;
DROP POLICY IF EXISTS "Workspace owners can manage project members" ON public.project_members;

-- Read: Users can see their own project memberships
CREATE POLICY "Read own project memberships"
    ON public.project_members
    FOR SELECT
    USING (auth.uid() = user_id);

-- Insert: Users can insert their own membership
CREATE POLICY "Insert own project membership"
    ON public.project_members
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Manage: Workspace owners can manage project members
CREATE POLICY "Manage project members"
    ON public.project_members
    FOR ALL
    USING (
        auth.uid() IN (
            SELECT w.owner_id 
            FROM public.workspaces w
            JOIN public.projects p ON p.workspace_id = w.id
            WHERE p.id = project_id
        )
    );

-- =============================================
-- PROMPT_TRACKING - Simplified
-- =============================================

DROP POLICY IF EXISTS "Users can read project prompts" ON public.prompt_tracking;
DROP POLICY IF EXISTS "Users can manage project prompts" ON public.prompt_tracking;

-- Read: Workspace owners can read prompts
CREATE POLICY "Read project prompts"
    ON public.prompt_tracking
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT w.owner_id 
            FROM public.workspaces w
            JOIN public.projects p ON p.workspace_id = w.id
            WHERE p.id = project_id
        )
    );

-- Insert: Workspace owners can create prompts
CREATE POLICY "Create project prompts"
    ON public.prompt_tracking
    FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT w.owner_id 
            FROM public.workspaces w
            JOIN public.projects p ON p.workspace_id = w.id
            WHERE p.id = project_id
        )
    );

-- Update: Workspace owners can update prompts
CREATE POLICY "Update project prompts"
    ON public.prompt_tracking
    FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT w.owner_id 
            FROM public.workspaces w
            JOIN public.projects p ON p.workspace_id = w.id
            WHERE p.id = project_id
        )
    );

-- Delete: Workspace owners can delete prompts
CREATE POLICY "Delete project prompts"
    ON public.prompt_tracking
    FOR DELETE
    USING (
        auth.uid() IN (
            SELECT w.owner_id 
            FROM public.workspaces w
            JOIN public.projects p ON p.workspace_id = w.id
            WHERE p.id = project_id
        )
    );

-- =============================================
-- CITATIONS - Simplified
-- =============================================

DROP POLICY IF EXISTS "Users can read project citations" ON public.citations;
DROP POLICY IF EXISTS "Service can create citations" ON public.citations;

-- Read: Workspace owners can read citations
CREATE POLICY "Read project citations"
    ON public.citations
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT w.owner_id 
            FROM public.workspaces w
            JOIN public.projects p ON p.workspace_id = w.id
            WHERE p.id = project_id
        )
    );

-- Service role can insert (for backend processes)
CREATE POLICY "Service create citations"
    ON public.citations
    FOR INSERT
    WITH CHECK (true);

-- =============================================
-- COMPETITORS - Simplified
-- =============================================

DROP POLICY IF EXISTS "Users can read project competitors" ON public.competitors;
DROP POLICY IF EXISTS "Workspace owners can manage competitors" ON public.competitors;

-- Read: Workspace owners can read competitors
CREATE POLICY "Read project competitors"
    ON public.competitors
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT w.owner_id 
            FROM public.workspaces w
            JOIN public.projects p ON p.workspace_id = w.id
            WHERE p.id = project_id
        )
    );

-- Manage: Workspace owners can manage competitors
CREATE POLICY "Manage project competitors"
    ON public.competitors
    FOR ALL
    USING (
        auth.uid() IN (
            SELECT w.owner_id 
            FROM public.workspaces w
            JOIN public.projects p ON p.workspace_id = w.id
            WHERE p.id = project_id
        )
    );

-- =============================================
-- COMPETITOR_MENTIONS - Simplified
-- =============================================

DROP POLICY IF EXISTS "Users can read competitor mentions" ON public.competitor_mentions;

-- Read: Workspace owners can read mentions
CREATE POLICY "Read competitor mentions"
    ON public.competitor_mentions
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT w.owner_id 
            FROM public.workspaces w
            JOIN public.projects p ON p.workspace_id = w.id
            JOIN public.competitors c ON c.project_id = p.id
            WHERE c.id = competitor_id
        )
    );

-- =============================================
-- INVITATIONS - Keep Simple
-- =============================================

DROP POLICY IF EXISTS "Users can read relevant invitations" ON public.invitations;
DROP POLICY IF EXISTS "Admins can create invitations" ON public.invitations;

-- Read: Users can read invitations sent by them or to their email
CREATE POLICY "Read invitations"
    ON public.invitations
    FOR SELECT
    USING (
        auth.uid() = invited_by 
        OR 
        (SELECT email FROM public.users WHERE id = auth.uid()) = email
    );

-- Create: Workspace owners can create invitations
CREATE POLICY "Create invitations"
    ON public.invitations
    FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT owner_id FROM public.workspaces 
            WHERE id = workspace_id
        )
    );

