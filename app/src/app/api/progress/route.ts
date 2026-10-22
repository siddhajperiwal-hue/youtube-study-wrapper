import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEffectiveUserId, unauthorized } from "@/lib/auth-helpers";
import { ProgressUpdateSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  try {
    const userId = await getEffectiveUserId();
    if (!userId) return unauthorized();
    const rawBody = await req.json();
    const parseResult = ProgressUpdateSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid progress payload", details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const { courseId, videoId, positionSec, watchedSecondsDelta, durationSec } = parseResult.data;

    const supabase = createAdminClient();

    // 1. Get current chapter progress and course settings
    const { data: existingProgress } = await supabase
      .from("chapter_progress")
      .select("status, watched_seconds, last_position_sec")
      .eq("course_id", courseId)
      .eq("video_id", videoId)
      .maybeSingle();

    const { data: course } = await supabase
      .from("courses")
      .select("quizzes_enabled")
      .eq("id", courseId)
      .single();

    const currentWatched = (existingProgress?.watched_seconds || 0) + Math.max(0, watchedSecondsDelta);
    let currentStatus = existingProgress?.status || "not_started";
    let completedAt = null;

    // Check 90% completion rule
    const is90PercentWatched =
      durationSec > 0 &&
      (currentWatched >= durationSec * 0.9 || positionSec >= durationSec * 0.9);

    if (is90PercentWatched && currentStatus === "not_started") {
      if (course?.quizzes_enabled === false) {
        currentStatus = "completed_without_quiz";
        completedAt = new Date().toISOString();
      }
    }

    const updatePayload: any = {
      course_id: courseId,
      video_id: videoId,
      user_id: userId,
      last_position_sec: Math.floor(positionSec || 0),
      watched_seconds: currentWatched,
      status: currentStatus,
      updated_at: new Date().toISOString(),
    };

    if (completedAt) {
      updatePayload.completed_at = completedAt;
    }

    // Save chapter progress and update course last_accessed_at in parallel
    // so dashboard Priority Course dynamically reflects the last played course
    await Promise.all([
      supabase
        .from("chapter_progress")
        .upsert(updatePayload, { onConflict: "course_id,video_id" }),
      supabase
        .from("courses")
        .update({ last_accessed_at: new Date().toISOString() })
        .eq("id", courseId),
    ]);

    return NextResponse.json({
      success: true,
      status: currentStatus,
      shouldPromptQuiz: is90PercentWatched && course?.quizzes_enabled !== false && currentStatus !== "completed",
    });
  } catch (err: any) {
    console.error("Progress update error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
