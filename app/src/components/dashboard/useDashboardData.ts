import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchWithCache, getCached, invalidateCache, prefetchData } from "@/lib/cache";
import type { CardsResponse, Course, StreakData } from "./types";

/**
 * Dashboard data: courses, streak and the quiz/flashcard cards.
 *
 * Stale-while-revalidate: whatever is cached renders immediately, then each endpoint refreshes in
 * the background (skipped if the cache is under 10s old, e.g. just prefetched) and is applied as
 * soon as it arrives instead of waiting for all three.
 *
 * `onCards(response, keepShown)` receives every cards response; `keepShown` is the cached response
 * that's already on screen, so a background refresh doesn't swap out a card the user is reading.
 */
export function useDashboardData(onCards: (res: CardsResponse, keepShown?: CardsResponse) => void) {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  // Whether the cards / streak responses have arrived (from cache or network), so the UI doesn't
  // flash empty-state copy or a "0 Day Streak" before the real data is known
  const [cardsLoaded, setCardsLoaded] = useState(false);
  const [streakLoaded, setStreakLoaded] = useState(false);
  const [streak, setStreak] = useState<StreakData>({
    streak: 0,
    todayMinutes: 0,
    thresholdMinutes: 20,
    todayQualifies: false,
  });

  const refresh = async (forceFresh = false) => {
    if (forceFresh) {
      invalidateCache("/api/courses");
      invalidateCache("/api/streak");
      invalidateCache("/api/dashboard/cards");
    }

    const cachedCourses = getCached<{ courses: Course[] }>("/api/courses");
    const cachedStreak = getCached<StreakData>("/api/streak");
    const cachedCards = getCached<CardsResponse>("/api/dashboard/cards");
    if (cachedCourses?.courses) {
      setCourses(cachedCourses.courses);
      setLoading(false);
    } else if (courses.length === 0) {
      setLoading(true);
    }
    if (cachedStreak) {
      setStreak(cachedStreak);
      setStreakLoaded(true);
    }
    if (cachedCards) {
      onCards(cachedCards);
      setCardsLoaded(true);
    }

    const coursesReq = fetchWithCache<{ courses: Course[] }>("/api/courses", 10000)
      .then((cData) => {
        if (cData?.courses) setCourses(cData.courses);
      })
      .catch((err) => console.error("Dashboard courses fetch error:", err))
      .finally(() => setLoading(false));

    const streakReq = fetchWithCache<StreakData>("/api/streak", 10000)
      .then((sData) => {
        if (sData) setStreak(sData);
      })
      .catch(() => {})
      .finally(() => setStreakLoaded(true));

    const cardsReq = fetchWithCache<CardsResponse>("/api/dashboard/cards", 10000)
      .then((cdRes) => {
        if (cdRes) onCards(cdRes, cachedCards);
      })
      .catch(() => {})
      .finally(() => setCardsLoaded(true));

    await Promise.all([coursesReq, streakReq, cardsReq]);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Prefetch top courses for instant navigation — only once the dashboard's own data has loaded,
  // and when the browser is idle, so these requests don't compete with the initial load
  useEffect(() => {
    if (courses.length === 0 || !cardsLoaded) return;
    const prefetchTopCourses = () =>
      courses.slice(0, 4).forEach((c) => {
        router.prefetch(`/course/${c.id}`);
        prefetchData(`/api/courses/${c.id}`);
        prefetchData(`/api/courses/${c.id}/review`);
      });
    if (typeof window.requestIdleCallback === "function") {
      const handle = window.requestIdleCallback(prefetchTopCourses, { timeout: 2000 });
      return () => window.cancelIdleCallback(handle);
    }
    const timer = setTimeout(prefetchTopCourses, 300);
    return () => clearTimeout(timer);
  }, [courses, cardsLoaded, router]);

  return { courses, loading, cardsLoaded, streak, streakLoaded, refresh };
}
