import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEffectiveUserId, unauthorized } from "@/lib/auth-helpers";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
    const userId = await getEffectiveUserId();
    if (!userId) return unauthorized();
    const body = await req.json();
    const { videoId, userAnswers = [], skipped = false } = body;

    if (!videoId) {
      return NextResponse.json({ error: "videoId is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    let score = 0;
    const results: any[] = [];

    // If not skipped, grade answers
    if (!skipped && userAnswers.length > 0) {
      const questionIds = userAnswers.map((a: any) => a.questionId);
      const { data: dbQuestions } = await supabase
        .from("questions")
        .select("id, correct_index, explanation")
        .in("id", questionIds);

      const dbQMap = new Map<string, any>();
      dbQuestions?.forEach((q) => dbQMap.set(q.id, q));

      for (const ua of userAnswers) {
        const q = dbQMap.get(ua.questionId);
        if (q) {
          const isCorrect = q.correct_index === ua.selectedIndex;
          if (isCorrect) score++;

          results.push({
            questionId: ua.questionId,
            isCorrect,
            correctIndex: q.correct_index,
            explanation: q.explanation,
          });

          // Insert into answers table
          await supabase.from("answers").insert({
            user_id: userId,
            question_id: ua.questionId,
            is_correct: isCorrect,
            time_taken_sec: ua.timeTakenSec || 0,
            context: "chapter_quiz",
          });
        }
      }
    }

    // Save quiz_attempt
    await supabase.from("quiz_attempts").insert({
      course_id: courseId,
      video_id: videoId,
      user_id: userId,
      skipped,
      score,
      completed_at: new Date().toISOString(),
    });

    // Mark chapter as completed
    await supabase.from("chapter_progress").upsert(
      {
        course_id: courseId,
        video_id: videoId,
        user_id: userId,
        status: "completed",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "course_id,video_id" }
    );

    return NextResponse.json({
      success: true,
      score,
      totalQuestions: userAnswers.length,
      results,
      skipped,
    });
  } catch (err: any) {
    console.error("Quiz submission error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
