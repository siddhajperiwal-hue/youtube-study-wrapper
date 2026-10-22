import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEffectiveUserId, unauthorized } from "@/lib/auth-helpers";

export async function GET(request: Request) {
  try {
    const userId = await getEffectiveUserId();
    if (!userId) return unauthorized();
    const supabase = createAdminClient();

    const url = new URL(request.url);
    const excludeQuestionParam = url.searchParams.get("exclude_question_ids") || "";
    const excludeFlashcardParam = url.searchParams.get("exclude_flashcard_ids") || "";
    const target = url.searchParams.get("target") || "both"; // 'quiz' | 'flashcard' | 'both'

    const excludeQSet = new Set(
      excludeQuestionParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    );
    const excludeFSet = new Set(
      excludeFlashcardParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    );

    const wantQuiz = target === "both" || target === "quiz";
    const wantFlashcard = target === "both" || target === "flashcard";

    // Single round trip: all completed chapters across ANY enrolled course for this user
    // (strictly 'completed' or 'completed_without_quiz'), with their active questions and
    // flashcards embedded (nested selects) instead of a second query wave
    const embedQuestions = wantQuiz
      ? ", questions(id, topic, text, options, correct_index, explanation, video_id)"
      : "";
    const embedFlashcards = wantFlashcard ? ", flashcards(id, topic, front, back, video_id)" : "";
    let completedQuery = supabase
      .from("chapter_progress")
      .select(`video_id, course_id, courses(id, name), videos(id, title, position${embedQuestions}${embedFlashcards})`)
      .eq("user_id", userId)
      .in("status", ["completed", "completed_without_quiz"]);
    if (wantQuiz) completedQuery = completedQuery.eq("videos.questions.status", "active");
    if (wantFlashcard) completedQuery = completedQuery.eq("videos.flashcards.status", "active");
    const { data: completed, error: compErr } = await completedQuery;

    if (compErr) {
      console.error("Error fetching completed chapters:", compErr);
    }

    const completedList = completed || [];
    const videoIds = Array.from(new Set(completedList.map((c: any) => c.video_id).filter(Boolean)));

    // Strict Rule: If user has 0 completed chapters, return null. NEVER fallback to uncompleted chapters!
    if (videoIds.length === 0) {
      return NextResponse.json(
        {
          quickQuiz: null,
          recallFlashcard: null,
          totalCompletedChapters: 0,
          totalCompletedQuestions: 0,
          remainingQuestions: 0,
          quickQuizExhausted: false,
          totalCompletedFlashcards: 0,
          remainingFlashcards: 0,
          flashcardExhausted: false,
          hasCompletedChapters: false,
        },
        { headers: { "Cache-Control": "no-store, max-age=0" } }
      );
    }

    // Map video_id to course & chapter metadata
    const metaMap = new Map<string, { courseName: string; chapterNum: number; chapterTitle: string }>();
    completedList.forEach((c: any) => {
      if (c.video_id && !metaMap.has(c.video_id)) {
        metaMap.set(c.video_id, {
          courseName: c.courses?.name || "Enrolled Course",
          chapterNum: typeof c.videos?.position === "number" ? c.videos.position + 1 : 1,
          chapterTitle: c.videos?.title || "Completed Chapter",
        });
      }
    });

    // A video can be completed in more than one course: dedupe by id
    const uniqueById = (items: any[]) => Array.from(new Map(items.map((i) => [i.id, i])).values());
    const questionsRes = {
      data: uniqueById(completedList.flatMap((c: any) => c.videos?.questions || [])),
      error: null,
    };
    const flashcardsRes = {
      data: uniqueById(completedList.flatMap((c: any) => c.videos?.flashcards || [])),
      error: null,
    };

    let quickQuiz = null;
    let totalCompletedQuestions = 0;
    let remainingQuestions = 0;
    let quickQuizExhausted = false;

    let recallFlashcard = null;
    let totalCompletedFlashcards = 0;
    let remainingFlashcards = 0;
    let flashcardExhausted = false;

    if (wantQuiz) {
      const { data: qData, error: qErr } = questionsRes;

      if (qErr) {
        console.error("Error fetching questions:", qErr);
      }

      const allQuestions = qData || [];
      totalCompletedQuestions = allQuestions.length;
      const unvisitedQuestions = allQuestions.filter((q) => !excludeQSet.has(q.id));
      remainingQuestions = unvisitedQuestions.length;

      if (allQuestions.length > 0 && unvisitedQuestions.length === 0) {
        quickQuizExhausted = true;
      } else if (unvisitedQuestions.length > 0) {
        const pickedQ = unvisitedQuestions[Math.floor(Math.random() * unvisitedQuestions.length)];
        const meta = metaMap.get(pickedQ.video_id);
        quickQuiz = {
          ...pickedQ,
          course_name: meta?.courseName,
          chapter_num: meta?.chapterNum,
          chapter_title: meta?.chapterTitle,
        };
      }
    }

    if (wantFlashcard) {
      const { data: fData, error: fErr } = flashcardsRes;

      if (fErr) {
        console.error("Error fetching flashcards:", fErr);
      }

      const allFlashcards = fData || [];
      totalCompletedFlashcards = allFlashcards.length;
      const unvisitedFlashcards = allFlashcards.filter((f) => !excludeFSet.has(f.id));
      remainingFlashcards = unvisitedFlashcards.length;

      if (allFlashcards.length > 0 && unvisitedFlashcards.length === 0) {
        flashcardExhausted = true;
      } else if (unvisitedFlashcards.length > 0) {
        const pickedF = unvisitedFlashcards[Math.floor(Math.random() * unvisitedFlashcards.length)];
        const meta = metaMap.get(pickedF.video_id);
        recallFlashcard = {
          ...pickedF,
          course_name: meta?.courseName,
          chapter_num: meta?.chapterNum,
          chapter_title: meta?.chapterTitle,
        };
      }
    }

    return NextResponse.json(
      {
        quickQuiz,
        recallFlashcard,
        totalCompletedChapters: videoIds.length,
        totalCompletedQuestions,
        remainingQuestions,
        quickQuizExhausted,
        totalCompletedFlashcards,
        remainingFlashcards,
        flashcardExhausted,
        hasCompletedChapters: true,
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (err: any) {
    console.error("Dashboard cards error:", err);
    return NextResponse.json(
      { quickQuiz: null, recallFlashcard: null, error: err.message },
      { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }
}
