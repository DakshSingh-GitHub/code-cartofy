-- ==============================================================================
-- CODECARTOFY: SUPABASE DATABASE SCHEMA MIGRATION
-- ==============================================================================
-- This file defines the PostgreSQL schemas, indexes, and Row Level Security (RLS)
-- policies for CodeCartofy on Supabase.
--
-- Tables included:
-- 1. profiles: Extended user profile metadata
-- 2. user_repositories: Analyzed codebase graphs and AST file contents
-- 3. user_github_connections: Connected GitHub handles for personalized dashboards
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. PROFILES TABLE: Stores extended user profile metadata
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    country TEXT DEFAULT 'Global',
    avatar_url TEXT DEFAULT '/vlyxir/favicon.png',
    bio TEXT,
    plan TEXT DEFAULT 'FREE',
    role TEXT DEFAULT 'Developer',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Case-insensitive indexes for fast lookup during authentication
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_idx 
    ON public.profiles (LOWER(username));

CREATE INDEX IF NOT EXISTS profiles_email_lower_idx 
    ON public.profiles (LOWER(email));

-- ==============================================================================
-- 2. USER_REPOSITORIES TABLE: Stores analyzed repositories & AST file payloads
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.user_repositories (
    id TEXT PRIMARY KEY, -- Composite key format: "<userId>:<repoId>"
    user_id TEXT NOT NULL,
    username TEXT,
    user_email TEXT,
    repo_id TEXT NOT NULL,
    repo_name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('github', 'upload', 'sample')),
    github_url TEXT,
    files JSONB NOT NULL DEFAULT '[]'::jsonb,
    file_count INTEGER DEFAULT 0,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_repos_user_id 
    ON public.user_repositories (user_id);

CREATE INDEX IF NOT EXISTS idx_user_repos_username 
    ON public.user_repositories (username);

CREATE INDEX IF NOT EXISTS idx_user_repos_timestamp 
    ON public.user_repositories (timestamp DESC);

-- ==============================================================================
-- 3. USER_GITHUB_CONNECTIONS TABLE: Stores connected GitHub usernames
-- ==============================================================================
-- Stores user GitHub profile associations for personalized dashboard retrieval
CREATE TABLE IF NOT EXISTS public.user_github_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,                         -- Maps to auth user ID or username
    username TEXT,                                 -- App username
    user_email TEXT,                               -- App user email
    github_username TEXT NOT NULL,                 -- Verified GitHub login (e.g. 'torvalds')
    avatar_url TEXT,                               -- GitHub avatar URL
    profile_url TEXT,                              -- https://github.com/<github_username>
    public_repos_count INTEGER DEFAULT 0,          -- Count of public repositories
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT unique_user_github UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_github_user_id 
    ON public.user_github_connections (user_id);

CREATE INDEX IF NOT EXISTS idx_user_github_username 
    ON public.user_github_connections (username);

CREATE INDEX IF NOT EXISTS idx_user_github_handle 
    ON public.user_github_connections (LOWER(github_username));

-- ==============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_github_connections ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- PROFILES POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can view their own profile" 
    ON public.profiles 
    FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Public username availability query" 
    ON public.profiles 
    FOR SELECT 
    USING (true);

CREATE POLICY "Users can update their own profile" 
    ON public.profiles 
    FOR UPDATE 
    USING (auth.uid() = id);

-- ------------------------------------------------------------------------------
-- USER_REPOSITORIES POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can read own repositories" 
    ON public.user_repositories 
    FOR SELECT 
    USING (
        user_id = auth.uid()::text OR 
        username = (auth.jwt() ->> 'preferred_username') OR
        user_id = 'guest'
    );

CREATE POLICY "Users can upsert own repositories" 
    ON public.user_repositories 
    FOR ALL 
    USING (
        user_id = auth.uid()::text OR 
        username = (auth.jwt() ->> 'preferred_username') OR
        user_id = 'guest'
    );

CREATE POLICY "Users can delete own repositories" 
    ON public.user_repositories 
    FOR DELETE 
    USING (
        user_id = auth.uid()::text OR 
        username = (auth.jwt() ->> 'preferred_username')
    );

-- ------------------------------------------------------------------------------
-- USER_GITHUB_CONNECTIONS POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Allow select on user_github_connections" 
    ON public.user_github_connections 
    FOR SELECT 
    USING (true);

CREATE POLICY "Allow upsert on user_github_connections" 
    ON public.user_github_connections 
    FOR ALL 
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow delete on user_github_connections" 
    ON public.user_github_connections 
    FOR DELETE 
    USING (true);

-- ==============================================================================
-- 5. RPC STORED PROCEDURES
-- ==============================================================================

-- Stored procedure for atomic username availability check
CREATE OR REPLACE FUNCTION public.check_username_available(username_input TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE LOWER(username) = LOWER(TRIM(username_input))
    );
END;
$$;

-- Stored procedure for persistent GitHub username connections (immune to RLS)
CREATE OR REPLACE FUNCTION public.save_github_connection(
    p_user_id TEXT,
    p_username TEXT,
    p_user_email TEXT,
    p_github_username TEXT,
    p_avatar_url TEXT DEFAULT NULL,
    p_profile_url TEXT DEFAULT NULL,
    p_public_repos_count INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result_row public.user_github_connections%ROWTYPE;
BEGIN
    INSERT INTO public.user_github_connections (
        user_id,
        username,
        user_email,
        github_username,
        avatar_url,
        profile_url,
        public_repos_count,
        updated_at
    )
    VALUES (
        p_user_id,
        p_username,
        p_user_email,
        p_github_username,
        p_avatar_url,
        p_profile_url,
        p_public_repos_count,
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        username = EXCLUDED.username,
        user_email = EXCLUDED.user_email,
        github_username = EXCLUDED.github_username,
        avatar_url = EXCLUDED.avatar_url,
        profile_url = EXCLUDED.profile_url,
        public_repos_count = EXCLUDED.public_repos_count,
        updated_at = NOW()
    RETURNING * INTO result_row;

    RETURN to_jsonb(result_row);
END;
$$;

-- ==============================================================================
-- 4. USER AI FIXES & SCANS HISTORY TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.user_ai_fixes (
    id TEXT PRIMARY KEY,                           -- Unique fix ID: "<userId>:<fixId>"
    user_id TEXT NOT NULL,                         -- Maps to auth user ID or username
    username TEXT,                                 -- App username
    user_email TEXT,                               -- App user email
    repo_id TEXT NOT NULL,                         -- Target repository ID
    repo_name TEXT NOT NULL,                       -- Target repository name
    fix_type TEXT NOT NULL,                        -- 'spof' | 'cycle' | 'recommendation' | 'architecture'
    target_file TEXT NOT NULL,                     -- File/module path
    risk_level TEXT DEFAULT 'High',                -- 'Critical' | 'High' | 'Medium' | 'Low'
    title TEXT NOT NULL,                           -- Fix title or issue title
    summary TEXT,                                  -- AI diagnosis summary
    architectural_pattern TEXT,                    -- Recommended design pattern (e.g. 'Facade Pattern')
    refactoring_plan JSONB DEFAULT '[]'::jsonb,    -- Step-by-step checklist
    proposed_modules JSONB DEFAULT '[]'::jsonb,    -- Extracted sub-modules & code diffs
    github_issue_url TEXT,                         -- URL to created GitHub issue (if published)
    github_issue_number INTEGER,                   -- Issue number (if published)
    timestamp BIGINT NOT NULL,                     -- Epoch milliseconds
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Indexes for ultra-fast user history queries
CREATE INDEX IF NOT EXISTS idx_user_ai_fixes_user_id ON public.user_ai_fixes (user_id);
CREATE INDEX IF NOT EXISTS idx_user_ai_fixes_username ON public.user_ai_fixes (username);
CREATE INDEX IF NOT EXISTS idx_user_ai_fixes_repo_id ON public.user_ai_fixes (repo_id);
CREATE INDEX IF NOT EXISTS idx_user_ai_fixes_timestamp ON public.user_ai_fixes (timestamp DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_ai_fixes ENABLE ROW LEVEL SECURITY;

-- Policies for isolated user history
DROP POLICY IF EXISTS "Users can read own AI fixes" ON public.user_ai_fixes;
DROP POLICY IF EXISTS "Users can insert own AI fixes" ON public.user_ai_fixes;
DROP POLICY IF EXISTS "Users can delete own AI fixes" ON public.user_ai_fixes;

CREATE POLICY "Users can read own AI fixes" 
    ON public.user_ai_fixes 
    FOR SELECT 
    USING (
        user_id = auth.uid()::text OR 
        username = (auth.jwt() ->> 'preferred_username') OR
        user_id = 'guest'
    );

CREATE POLICY "Users can insert own AI fixes" 
    ON public.user_ai_fixes 
    FOR ALL 
    USING (
        user_id = auth.uid()::text OR 
        username = (auth.jwt() ->> 'preferred_username') OR
        user_id = 'guest'
    );

CREATE POLICY "Users can delete own AI fixes" 
    ON public.user_ai_fixes 
    FOR DELETE 
    USING (
        user_id = auth.uid()::text OR 
        username = (auth.jwt() ->> 'preferred_username')
    );


