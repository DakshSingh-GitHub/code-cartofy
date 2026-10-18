-- ==============================================================================
-- CODECARTOFY: AI FIXES & SCANS HISTORY TABLE MIGRATION
-- ==============================================================================
-- Stores individual user AI architectural scan diagnoses, decoupling fixes,
-- and GitHub issue tracking records. Every user maintains an isolated history.
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
CREATE INDEX IF NOT EXISTS idx_user_ai_fixes_user_id 
    ON public.user_ai_fixes (user_id);

CREATE INDEX IF NOT EXISTS idx_user_ai_fixes_username 
    ON public.user_ai_fixes (username);

CREATE INDEX IF NOT EXISTS idx_user_ai_fixes_repo_id 
    ON public.user_ai_fixes (repo_id);

CREATE INDEX IF NOT EXISTS idx_user_ai_fixes_timestamp 
    ON public.user_ai_fixes (timestamp DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_ai_fixes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own AI fixes" ON public.user_ai_fixes;
DROP POLICY IF EXISTS "Users can insert own AI fixes" ON public.user_ai_fixes;
DROP POLICY IF EXISTS "Users can delete own AI fixes" ON public.user_ai_fixes;

-- RLS Policy: Users can only view their own AI fixes history
CREATE POLICY "Users can read own AI fixes" 
    ON public.user_ai_fixes 
    FOR SELECT 
    USING (
        user_id = auth.uid()::text OR 
        username = (auth.jwt() ->> 'preferred_username') OR
        user_id = 'guest'
    );

-- RLS Policy: Users can insert or upsert their own AI fixes
CREATE POLICY "Users can insert own AI fixes" 
    ON public.user_ai_fixes 
    FOR ALL 
    USING (
        user_id = auth.uid()::text OR 
        username = (auth.jwt() ->> 'preferred_username') OR
        user_id = 'guest'
    );

-- RLS Policy: Users can delete their own records
CREATE POLICY "Users can delete own AI fixes" 
    ON public.user_ai_fixes 
    FOR DELETE 
    USING (
        user_id = auth.uid()::text OR 
        username = (auth.jwt() ->> 'preferred_username')
    );
