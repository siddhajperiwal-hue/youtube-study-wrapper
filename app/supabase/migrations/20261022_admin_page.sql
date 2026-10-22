-- ==============================================================================
-- Admin page (2026-10-22). Run once in the Supabase SQL editor. Safe to re-run.
-- Already merged into supabase_schema.sql for fresh installs.
-- ==============================================================================

-- 1. Gemini token usage per generation attempt (AI spend = tokens x model price)
ALTER TABLE public.generation_jobs
    ADD COLUMN IF NOT EXISTS model TEXT,
    ADD COLUMN IF NOT EXISTS input_tokens INT,
    ADD COLUMN IF NOT EXISTS output_tokens INT;

-- 2. In-app feedback ("Send feedback" in the profile menu)
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    email TEXT,
    category TEXT CHECK (category IN ('bug', 'idea', 'question', 'other')) DEFAULT 'other',
    message TEXT NOT NULL CHECK (char_length(message) BETWEEN 1 AND 4000),
    page TEXT,
    status TEXT CHECK (status IN ('new', 'seen', 'resolved')) DEFAULT 'new',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Only the service role (API routes) reads/writes it: RLS on, no policies
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- 3. Reports: flashcards can be reported too (they used to fail the question_id foreign key
--    and were silently dropped), and the admin inbox tracks a status per report
ALTER TABLE public.question_reports ALTER COLUMN question_id DROP NOT NULL;
ALTER TABLE public.question_reports
    ADD COLUMN IF NOT EXISTS flashcard_id UUID REFERENCES public.flashcards(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS item_type TEXT CHECK (item_type IN ('question', 'flashcard')) DEFAULT 'question',
    ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('new', 'seen', 'resolved')) DEFAULT 'new';
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'question_reports_one_item') THEN
        ALTER TABLE public.question_reports
            ADD CONSTRAINT question_reports_one_item CHECK ((question_id IS NOT NULL) <> (flashcard_id IS NOT NULL));
    END IF;
END $$;

-- 4. Admin-editable settings (model prices, AI budget, plan costs)
CREATE TABLE IF NOT EXISTS public.admin_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- 5. Database size and per-table sizes for the admin page (service role only)
CREATE OR REPLACE FUNCTION public.admin_database_stats()
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT jsonb_build_object(
        'database_bytes', pg_catalog.pg_database_size(current_database()),
        'tables', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'name', c.relname,
                    'rows', GREATEST(c.reltuples, 0)::bigint,
                    'bytes', pg_catalog.pg_total_relation_size(c.oid)
                ) ORDER BY pg_catalog.pg_total_relation_size(c.oid) DESC
            )
            FROM pg_catalog.pg_class c
            JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public' AND c.relkind = 'r'
        ), '[]'::jsonb)
    );
$$;
REVOKE ALL ON FUNCTION public.admin_database_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_database_stats() TO service_role;
