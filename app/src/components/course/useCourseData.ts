import { useEffect, useState } from "react";
import { fetchWithCache, getCached, invalidateCache } from "@/lib/cache";
import type { Chapter, CourseData, CourseResponse, Resource, ReviewFlashcard, ReviewQuestion, ReviewResponse } from "./types";

/**
 * Course page data: course, chapters, resources and the Review tab's question/flashcard deck.
 * The review deck loads alongside the course (not when its tab opens) so the tab badge shows the
 * real count; it's fetched independently so it never delays the course itself.
 *
 * Stale-while-revalidate: cached course data (e.g. prefetched on hover) renders immediately, then
 * refreshes in the background unless the cache is under 10s old. `onCourseLoaded(data, isBackgroundRefresh)`
 * runs for every applied response, so the settings form can skip background refreshes.
 */
export function useCourseData(
  courseId: string,
  onCourseLoaded: (data: CourseResponse, isBackgroundRefresh: boolean) => void
) {
  const [course, setCourse] = useState<CourseData | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewQuestions, setReviewQuestions] = useState<ReviewQuestion[]>([]);
  const [reviewFlashcards, setReviewFlashcards] = useState<ReviewFlashcard[]>([]);
  // False until the first review response: the tab badge is hidden rather than showing a wrong 0
  const [reviewLoaded, setReviewLoaded] = useState(false);

  const applyCourseData = (data: CourseResponse, isBackgroundRefresh: boolean) => {
    setCourse(data.course);
    setChapters(data.chapters || []);
    setResources(data.resources || []);
    onCourseLoaded(data, isBackgroundRefresh);
  };

  const applyReview = (revData: ReviewResponse) => {
    setReviewQuestions(revData.questions || []);
    setReviewFlashcards(revData.flashcards || []);
    setReviewLoaded(true);
  };

  const loadReviewData = async (forceFresh = false) => {
    const reviewUrl = `/api/courses/${courseId}/review`;
    try {
      if (forceFresh) {
        invalidateCache(reviewUrl);
      } else {
        // Prefetched from the dashboard: show it immediately, then revalidate
        const cached = getCached<ReviewResponse>(reviewUrl);
        if (cached) applyReview(cached);
      }
      const revData = await fetchWithCache<ReviewResponse>(reviewUrl, 60000);
      if (revData) applyReview(revData);
    } catch (err) {
      console.error("Failed to load review data:", err);
    }
  };

  const loadCourse = async ({ forceFresh = false } = {}) => {
    try {
      const courseUrl = `/api/courses/${courseId}`;
      if (forceFresh) {
        invalidateCache(courseUrl);
      }

      const cached = forceFresh ? undefined : getCached<CourseResponse>(courseUrl);
      if (cached?.course) {
        applyCourseData(cached, false);
        setLoading(false);
      } else if (!course) {
        setLoading(true);
      }

      const data = await fetchWithCache<CourseResponse>(courseUrl, 10000);

      if (!data?.course) throw new Error("Course not found");
      if (data !== cached) applyCourseData(data, !!cached);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (courseId) {
      loadCourse();
      loadReviewData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  return {
    course,
    chapters,
    resources,
    loading,
    reviewQuestions,
    reviewFlashcards,
    reviewLoaded,
    reload: () => loadCourse({ forceFresh: true }),
    loadReviewData,
  };
}
