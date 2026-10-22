import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEffectiveUserId, unauthorized } from "@/lib/auth-helpers";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
    const userId = await getEffectiveUserId();
    if (!userId) return unauthorized();
    const supabase = createAdminClient();

    // 1. Get all completed chapters for this course
    const { data: progress } = await supabase
      .from("chapter_progress")
      .select("video_id, status")
      .eq("course_id", courseId)
      .or("status.eq.completed,status.eq.completed_without_quiz");

    const completedVideoIds = progress?.map((p) => p.video_id) || [];

    if (completedVideoIds.length === 0) {
      return NextResponse.json({
        hasCompletedChapters: false,
        questions: [],
        flashcards: [],
      });
    }

    // 2. Fetch questions, flashcards, and user bookmarks in parallel
    const [questionsRes, flashcardsRes, bookmarksRes] = await Promise.all([
      supabase
        .from("questions")
        .select("id, video_id, topic, text, options, correct_index, explanation, difficulty, timestamp_sec, videos(title, position)")
        .in("video_id", completedVideoIds)
        .eq("status", "active"),
      supabase
        .from("flashcards")
        .select("id, video_id, topic, front, back, status, videos(title, position)")
        .in("video_id", completedVideoIds)
        .eq("status", "active"),
      supabase
        .from("bookmarks")
        .select("question_id")
        .eq("user_id", userId),
    ]);

    const questions = questionsRes.data || [];
    const flashcards = flashcardsRes.data || [];
    const bookmarks = bookmarksRes.data || [];

    const bookmarkedIds = new Set(bookmarks.map((b) => b.question_id));

    return NextResponse.json({
      hasCompletedChapters: true,
      questions: questions || [],
      flashcards: (flashcards || []).map((f) => ({
        ...f,
        isBookmarked: bookmarkedIds.has(f.id),
      })),
    });
  } catch (err: any) {
    console.error("Review fetch error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
