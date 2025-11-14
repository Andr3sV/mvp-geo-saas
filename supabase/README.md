# Supabase Setup Instructions

## 📋 Database Migration

### Option 1: Using Supabase Dashboard (Recommended for MVP)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the entire content of `migrations/20250114000000_initial_schema.sql`
4. Paste it into the SQL Editor
5. Click **Run** to execute the migration

### Option 2: Using Supabase CLI

```bash
# Install Supabase CLI if not installed
npm install -g supabase

# Link to your Supabase project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

## 🔑 Authentication Setup

### 1. Enable Email/Password Authentication

1. Go to **Authentication** → **Providers** in Supabase Dashboard
2. Enable **Email** provider
3. Configure email templates (optional but recommended)

### 2. Email Templates Configuration

Navigate to **Authentication** → **Email Templates** and customize:

- **Confirm Signup**: Welcome email with confirmation link
- **Invite User**: Invitation email
- **Magic Link**: Magic link login
- **Change Email Address**: Email change confirmation
- **Reset Password**: Password reset email

### 3. URL Configuration

Go to **Authentication** → **URL Configuration**:

- **Site URL**: `http://localhost:3055` (development)
- **Redirect URLs**: 
  - `http://localhost:3055/auth/callback`
  - Add production URLs when deploying

## 🔐 Row Level Security (RLS)

All tables have RLS enabled with appropriate policies:

- ✅ **users**: Users can read/update their own profile
- ✅ **workspaces**: Users can only access their workspaces
- ✅ **projects**: Access based on workspace or project membership
- ✅ **workspace_members**: Managed by workspace admins
- ✅ **project_members**: Managed by project/workspace admins
- ✅ **citations**: Read-only for members, insert via service role
- ✅ **prompt_tracking**: Full access for project members
- ✅ **competitors**: Managed by project admins
- ✅ **invitations**: Visible to sender and recipient

## 📊 Database Schema Overview

### Core Tables

1. **users** - User profiles (extends auth.users)
2. **workspaces** - Top-level organization
3. **projects** - Projects within workspaces
4. **workspace_members** - Workspace access control
5. **project_members** - Project-level access control

### Feature Tables

6. **citations** - AI platform citations tracking
7. **prompt_tracking** - Tracked prompts per project
8. **competitors** - Competitor tracking for share of voice
9. **competitor_mentions** - Links citations to competitors
10. **invitations** - User invitation system

## 🔧 Environment Variables

Update your `.env.local` file with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Find these values in: **Project Settings** → **API**

## ✅ Verification

After running the migration, verify in Supabase Dashboard:

1. **Table Editor**: Check all 10 tables are created
2. **Database** → **Roles**: Verify RLS is enabled
3. **Database** → **Functions**: Check triggers are created
4. **Authentication**: Test user signup/login

## 🚀 Next Steps

After database setup:
1. Update `.env.local` with Supabase credentials
2. Test authentication flow
3. Create first user and workspace
4. Verify RLS policies work correctly

