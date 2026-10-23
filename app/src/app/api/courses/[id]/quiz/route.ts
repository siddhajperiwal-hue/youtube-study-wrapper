import { NextRequest, NextResponse, after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateContentForVideo } from "@/lib/gemini";
import { getEffectiveUserId, unauthorized } from "@/lib/auth-helpers";
import { pickQuizQuestions } from "@/lib/quiz-rotation";

/**
 * End-of-chapter quiz questions: CHAPTER_QUIZ_SIZE of the video's questions per attempt, the
 * ones this learner hasn't answered in a chapter quiz before first (pickQuizQuestions), so
 * retaking a chapter asks new questions. When there are none yet, `contentStatus` tells the client
 * whether to wait: "generating" (in progress, or started now because the learner is waiting)
 * or "unavailable" (generation failed). `poll=1` requests only check, so polling never
 * restarts a failed generation.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await params;
    const userId = await getEffectiveUserId();
    if (!userId) return unauthorized();
    const searchParams = req.nextUrl.searchParams;
    const videoId = searchParams.get("videoId");
    const isPoll = searchParams.get("poll") === "1";

    if (!videoId) {
      return NextResponse.json({ error: "videoId is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const [questionsRes, contentRes, videoRes] = await Promise.all([
      // Each question with this learner's earlier chapter-quiz answers to it (embedded filter:
      // questions without such answers still come back, with an empty list)
      supabase
        .from("questions")
        .select("id, topic, text, options, correct_index, explanation, difficulty, timestamp_sec, answers(answered_at)")
        .eq("video_id", videoId)
        .eq("status", "active")
        .eq("answers.user_id", userId)
        .eq("answers.context", "chapter_quiz"),
      supabase.from("video_content").select("status").eq("video_id", videoId).maybeSingle(),
      supabase
        .from("videos")
        .select("id, youtube_video_id, title, description, duration_sec")
        .eq("id", videoId)
        .maybeSingle(),
    ]);

    if (questionsRes.error) throw questionsRes.error;
    const allQuestions = questionsRes.data || [];
    const lastAnsweredAt = new Map<string, string>();
    for (const q of allQuestions) {
      for (const a of (q.answers as { answered_at: string | null }[] | null) ?? []) {
        if (a.answered_at && a.answered_at > (lastAnsweredAt.get(q.id) ?? "")) lastAnsweredAt.set(q.id, a.answered_at);
      }
    }
    const questions = pickQuizQuestions(
      allQuestions.map((q) => ({
        id: q.id,
        topic: q.topic,
        text: q.text,
        options: q.options,
        correct_index: q.correct_index,
        explanation: q.explanation,
        difficulty: q.difficulty,
        timestamp_sec: q.timestamp_sec,
      })),
      lastAnsweredAt
    );
    const status = contentRes.data?.status;
    const video = videoRes.data;

    let contentStatus: "ready" | "generating" | "unavailable" = "ready";
    if (questions.length === 0) {
      if (!isPoll && video && status !== "ready") {
        // Missing, failed or stuck: the learner is waiting at the end of the chapter, so (re)try now.
        // A run already in progress is left alone (generateContentForVideo claims the video).
        after(() =>
          generateContentForVideo(video.id, video.youtube_video_id, video.title, video.description || "", video.duration_sec)
        );
        contentStatus = "generating";
      } else {
        contentStatus = status === "pending" ? "generating" : "unavailable";
      }
    }

    return NextResponse.json({
      questions,
      count: questions.length,
      contentStatus,
    });
  } catch (err) {
    console.error("Error fetching quiz questions:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
