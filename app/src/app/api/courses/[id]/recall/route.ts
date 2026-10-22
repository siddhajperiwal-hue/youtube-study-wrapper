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

    const searchParams = req.nextUrl.searchParams;
    const force = searchParams.get("force") === "true";

    // 1. Fetch course details to check last_accessed_at
    const { data: course, error: cErr } = await supabase
      .from("courses")
      .select("id, last_accessed_at")
      .eq("id", courseId)
      .eq("user_id", userId)
      .single();

    if (cErr || !course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // 2. Check 24-hour inactivity condition unless explicitly forced for simulation testing
    if (!force) {
      if (!course.last_accessed_at) {
        return NextResponse.json({ questions: [], eligible: false, reason: "never_accessed" });
      }

      const diffMs = Date.now() - new Date(course.last_accessed_at).getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      if (diffHours < 24) {
        return NextResponse.json({
          questions: [],
          eligible: false,
          hoursSinceLastAccess: Math.round(diffHours * 10) / 10,
          reason: "less_than_24h",
        });
      }
    }

    // 3. Find completed chapters in this course
    const { data: completedProgress } = await supabase
      .from("chapter_progress")
      .select("video_id")
      .eq("course_id", courseId)
      .in("status", ["completed", "completed_without_quiz"]);

    if (!completedProgress || completedProgress.length === 0) {
      // If forced simulation testing, allow querying any questions in course if no chapters completed yet
      if (force) {
        const { data: allVideos } = await supabase
          .from("videos")
          .select("id")
          .eq("playlist_id", (course as any).playlist_id || "");
        const fallbackIds = (allVideos || []).map((v) => v.id);

        const { data: fallbackQuestions } = await supabase
          .from("questions")
          .select("id, video_id, topic, text, options, explanation, correct_index, difficulty")
          .in("video_id", fallbackIds)
          .eq("status", "active")
          .limit(2);

        return NextResponse.json({
          eligible: true,
          timeAwayText: "over 24 hours",
          questions: fallbackQuestions || [],
        });
      }

      return NextResponse.json({ questions: [], eligible: false, reason: "no_completed_chapters" });
    }

    const videoIds = completedProgress.map((cp) => cp.video_id);

    // 4. Fetch 1-2 active questions from these completed chapters
    const { data: questions } = await supabase
      .from("questions")
      .select("id, video_id, topic, text, options, explanation, correct_index, difficulty")
      .in("video_id", videoIds)
      .eq("status", "active")
      .limit(2);

    let timeAwayText = "over 24 hours";
    if (course.last_accessed_at) {
      const diffDays = Math.floor((Date.now() - new Date(course.last_accessed_at).getTime()) / (1000 * 60 * 60 * 24));
      timeAwayText = diffDays >= 2 ? `${diffDays} days` : diffDays === 1 ? "1 day" : "over 24 hours";
    }

    return NextResponse.json({
      eligible: true,
      timeAwayText,
      questions: questions || [],
    });
  } catch (err: any) {
    console.error("Recall error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
