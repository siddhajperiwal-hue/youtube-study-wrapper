import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEffectiveUserId, unauthorized } from "@/lib/auth-helpers";
import { QuizSubmitSchema } from "@/lib/validations";

/**
 * End of a chapter's quiz. Marks the chapter done:
 * - submitted quiz → `completed` ("Mastered")
 * - `skipped: true` (Skip Quiz) or `noQuiz: true` (no questions could be generated) →
 *   `completed_without_quiz` ("Watched"), unless the chapter was already mastered earlier
 * Skips are recorded as a skipped quiz attempt; `noQuiz` records no attempt (there was no quiz).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
    const userId = await getEffectiveUserId();
    if (!userId) return unauthorized();
    const parsed = QuizSubmitSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid quiz submission", details: parsed.error.format() }, { status: 400 });
    }
    const { videoId, userAnswers, skipped, noQuiz } = parsed.data;

    const supabase = createAdminClient();
    const graded = !skipped && !noQuiz && userAnswers.length > 0;

    // One wave: the course must belong to this user (the service-role client bypasses RLS, and
    // chapter_progress is upserted by course_id + video_id), plus the current status and the
    // correct answers
    const [courseRes, progressRes, questionsRes] = await Promise.all([
      supabase.from("courses").select("id").eq("id", courseId).eq("user_id", userId).maybeSingle(),
      supabase
        .from("chapter_progress")
        .select("status")
        .eq("course_id", courseId)
        .eq("video_id", videoId)
        .maybeSingle(),
      graded
        ? supabase
            .from("questions")
            .select("id, correct_index, explanation")
            .in("id", userAnswers.map((a) => a.questionId))
        : Promise.resolve({ data: [] as { id: string; correct_index: number; explanation: string | null }[] }),
    ]);

    if (!courseRes.data) {
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }

    const dbQMap = new Map((questionsRes.data ?? []).map((q) => [q.id, q]));
    const gradedAnswers = userAnswers
      .filter((ua) => dbQMap.has(ua.questionId))
      .map((ua) => {
        const q = dbQMap.get(ua.questionId)!;
        return { ua, q, isCorrect: q.correct_index === ua.selectedIndex };
      });
    const score = gradedAnswers.filter((g) => g.isCorrect).length;

    // Skipping (or having no quiz) never downgrades a chapter that was mastered before
    const status =
      skipped || noQuiz
        ? progressRes.data?.status === "completed"
          ? "completed"
          : "completed_without_quiz"
        : "completed";
    const now = new Date().toISOString();

    const [answersRes, attemptRes, progressSave] = await Promise.all([
      gradedAnswers.length > 0
        ? supabase.from("answers").insert(
            gradedAnswers.map((g) => ({
              user_id: userId,
              question_id: g.ua.questionId,
              is_correct: g.isCorrect,
              time_taken_sec: g.ua.timeTakenSec,
              context: "chapter_quiz",
            }))
          )
        : Promise.resolve({ error: null }),
      noQuiz
        ? Promise.resolve({ error: null })
        : supabase.from("quiz_attempts").insert({
            course_id: courseId,
            video_id: videoId,
            user_id: userId,
            skipped: !!skipped,
            score,
            completed_at: now,
          }),
      supabase.from("chapter_progress").upsert(
        {
          course_id: courseId,
          video_id: videoId,
          user_id: userId,
          status,
          completed_at: now,
          updated_at: now,
        },
        { onConflict: "course_id,video_id" }
      ),
    ]);
    const saveError = progressSave.error ?? attemptRes.error ?? answersRes.error;
    if (saveError) throw new Error(saveError.message);

    return NextResponse.json({
      success: true,
      status,
      score,
      totalQuestions: userAnswers.length,
      results: gradedAnswers.map((g) => ({
        questionId: g.ua.questionId,
        isCorrect: g.isCorrect,
        correctIndex: g.q.correct_index,
        explanation: g.q.explanation,
      })),
      skipped,
    });
  } catch (err) {
    console.error("Quiz submission error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
