-- ==============================================================================
-- STUDY YOUTUBE WRAPPER: FULL MVP SUPABASE SCHEMA & RLS POLICIES
-- Run this script in your Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 2. GLOBAL CONTENT (Shared across all learners, generated once)
-- ==============================================================================

-- Playlists Table
CREATE TABLE IF NOT EXISTS public.playlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    youtube_playlist_id TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    video_count INT DEFAULT 0,
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Videos Table
CREATE TABLE IF NOT EXISTS public.videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
    youtube_video_id TEXT NOT NULL,
    position INT NOT NULL,
    title TEXT NOT NULL,
    duration_sec INT NOT NULL DEFAULT 0,
    description TEXT,
    embeddable BOOLEAN DEFAULT TRUE,
    status TEXT CHECK (status IN ('ok', 'private', 'deleted', 'not_embeddable')) DEFAULT 'ok',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(playlist_id, youtube_video_id)
);

-- Video Resources Extracted from Descriptions (GitHub repos, PDFs, Drive links)
CREATE TABLE IF NOT EXISTS public.video_resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    label TEXT,
    domain TEXT,
    category TEXT CHECK (category IN ('github', 'drive', 'pdf', 'web', 'other')) DEFAULT 'web',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Content / Summaries for Videos
CREATE TABLE IF NOT EXISTS public.video_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id UUID NOT NULL UNIQUE REFERENCES public.videos(id) ON DELETE CASCADE,
    summary TEXT,
    topics JSONB DEFAULT '[]'::jsonb,
    source TEXT CHECK (source IN ('gemini_url', 'transcript_api', 'pasted', 'none')) DEFAULT 'none',
    status TEXT CHECK (status IN ('pending', 'ready', 'failed', 'unavailable')) DEFAULT 'pending',
    model TEXT,
    prompt_version TEXT DEFAULT 'v1',
    generated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Question Bank (Generated once per video, shared for chapter quizzes & recall)
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
    topic TEXT,
    text TEXT NOT NULL,
    options JSONB NOT NULL, -- Array of 4 answer options: ["Option A", "Option B", "Option C", "Option D"]
    correct_index INT NOT NULL CHECK (correct_index >= 0 AND correct_index <= 3),
    explanation TEXT,
    difficulty TEXT DEFAULT 'medium',
    timestamp_sec INT,
    status TEXT CHECK (status IN ('active', 'flagged', 'removed')) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Flashcards Bank
CREATE TABLE IF NOT EXISTS public.flashcards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
    topic TEXT,
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Question User Reports
CREATE TABLE IF NOT EXISTS public.question_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    category TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Background Generation Jobs Tracker
CREATE TABLE IF NOT EXISTS public.generation_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
    source_tried TEXT,
    status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
    attempts INT DEFAULT 0,
    error TEXT,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 3. PER-USER PRIVATE DATA (Secured by Row Level Security)
-- ==============================================================================

-- User Profiles (Timezone decides local midnight boundary for streak tracking)
CREATE TABLE IF NOT EXISTS public.profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    timezone TEXT DEFAULT 'UTC',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Courses (Enrolment in a playlist)
CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    quizzes_enabled BOOLEAN DEFAULT TRUE,
    flashcards_enabled BOOLEAN DEFAULT TRUE,
    deadline_date TIMESTAMPTZ,
    last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, playlist_id)
);

-- Chapter Progress (1 video = 1 chapter)
CREATE TABLE IF NOT EXISTS public.chapter_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('not_started', 'completed', 'completed_without_quiz')) DEFAULT 'not_started',
    last_position_sec INT DEFAULT 0,
    watched_seconds INT DEFAULT 0,
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(course_id, video_id)
);

-- Quiz Attempts
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    skipped BOOLEAN DEFAULT FALSE,
    score INT DEFAULT 0
);

-- Answers Given (Powers recall selection and accuracy analytics)
CREATE TABLE IF NOT EXISTS public.answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id UUID REFERENCES public.quiz_attempts(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    is_correct BOOLEAN NOT NULL,
    time_taken_sec INT DEFAULT 0,
    context TEXT CHECK (context IN ('chapter_quiz', 'recall', 'dashboard', 'review')) DEFAULT 'chapter_quiz',
    answered_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Notes (Discrete Sheet Model: TipTap JSON per chapter)
CREATE TABLE IF NOT EXISTS public.notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content JSONB DEFAULT '{}'::jsonb,
    version INT DEFAULT 1,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(course_id, video_id)
);

-- Daily Study Minutes (Streak Counter)
CREATE TABLE IF NOT EXISTS public.daily_study (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    local_date DATE NOT NULL,
    active_seconds INT DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, local_date)
);

-- Study Sessions (For retention gap analysis)
CREATE TABLE IF NOT EXISTS public.study_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    active_seconds INT DEFAULT 0
);

-- Bookmarks ("Review Later" / Starred questions)
CREATE TABLE IF NOT EXISTS public.bookmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, question_id)
);

-- ==============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_jobs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapter_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_study ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

-- 4.1 Global Tables: Readable by any authenticated user; Writable only by service role
CREATE POLICY "Playlists are viewable by authenticated users" ON public.playlists FOR SELECT TO authenticated USING (true);
CREATE POLICY "Videos are viewable by authenticated users" ON public.videos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Resources are viewable by authenticated users" ON public.video_resources FOR SELECT TO authenticated USING (true);
CREATE POLICY "Video content is viewable by authenticated users" ON public.video_content FOR SELECT TO authenticated USING (true);
CREATE POLICY "Questions are viewable by authenticated users" ON public.questions FOR SELECT TO authenticated USING (status = 'active');
CREATE POLICY "Flashcards are viewable by authenticated users" ON public.flashcards FOR SELECT TO authenticated USING (status = 'active');

-- Allow users to report questions
CREATE POLICY "Users can report questions" ON public.question_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 4.2 Per-User Tables: Strict User Ownership Rules
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users view own courses" ON public.courses FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own courses" ON public.courses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own courses" ON public.courses FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own courses" ON public.courses FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users view own chapter progress" ON public.chapter_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own chapter progress" ON public.chapter_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own chapter progress" ON public.chapter_progress FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users manage own quiz attempts" ON public.quiz_attempts FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users manage own answers" ON public.answers FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users manage own notes" ON public.notes FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users manage own daily study" ON public.daily_study FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users manage own study sessions" ON public.study_sessions FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users manage own bookmarks" ON public.bookmarks FOR ALL TO authenticated USING (auth.uid() = user_id);

-- ==============================================================================
-- 5. AUTOMATIC PROFILE TRIGGER ON SIGNUP
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, timezone)
  VALUES (new.id, 'UTC')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Schema generation complete!
