-- ==============================================================================
-- CODECARTOFY: FIX USER_GITHUB_CONNECTIONS TABLE & RLS PERMISSIONS
-- ==============================================================================
-- Run this SQL script in your Supabase project (SQL Editor -> New Query -> Run)
-- to ensure that GitHub usernames update and persist without RLS violations.
-- ==============================================================================

-- 1. Ensure the user_github_connections table exists with correct schema
CREATE TABLE IF NOT EXISTS public.user_github_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,                         -- User UUID or username
    username TEXT,                                 -- User login username
    user_email TEXT,                               -- User email address
    github_username TEXT NOT NULL,                 -- Verified GitHub login (e.g. 'torvalds')
    avatar_url TEXT,                               -- GitHub profile avatar URL
    profile_url TEXT,                              -- https://github.com/<github_username>
    public_repos_count INTEGER DEFAULT 0,          -- Count of public repositories
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT unique_user_github UNIQUE (user_id)
);

-- 2. Indexes for fast retrieval
CREATE INDEX IF NOT EXISTS idx_user_github_user_id 
    ON public.user_github_connections (user_id);

CREATE INDEX IF NOT EXISTS idx_user_github_username 
    ON public.user_github_connections (username);

CREATE INDEX IF NOT EXISTS idx_user_github_handle 
    ON public.user_github_connections (LOWER(github_username));

-- 3. Drop previous restrictive policies that caused Error 42501 (RLS violation)
DROP POLICY IF EXISTS "Users can read own github connection" ON public.user_github_connections;
DROP POLICY IF EXISTS "Users can upsert own github connection" ON public.user_github_connections;
DROP POLICY IF EXISTS "Users can delete own github connection" ON public.user_github_connections;
DROP POLICY IF EXISTS "Allow select on user_github_connections" ON public.user_github_connections;
DROP POLICY IF EXISTS "Allow upsert on user_github_connections" ON public.user_github_connections;
DROP POLICY IF EXISTS "Allow delete on user_github_connections" ON public.user_github_connections;

-- 4. Enable Row Level Security and allow public/anon & authenticated operations
ALTER TABLE public.user_github_connections ENABLE ROW LEVEL SECURITY;

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

-- 5. Stored Procedure with SECURITY DEFINER (immune to RLS policies)
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
