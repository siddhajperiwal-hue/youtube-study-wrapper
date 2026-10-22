import { useEffect } from "react";

interface StudyTrackingOptions {
  courseId: string;
  videoId: string;
  isPlaying: boolean;
  currentTimeSec: number;
  durationSec: number | null;
}

/**
 * Background study tracking while on the learning page:
 * - a heartbeat every 60s of playback (daily study minutes → streaks)
 * - the watch position every 15s (chapter progress / resume point)
 */
export function useStudyTracking({ courseId, videoId, isPlaying, currentTimeSec, durationSec }: StudyTrackingOptions) {
  useEffect(() => {
    const hb = setInterval(() => {
      if (isPlaying) {
        fetch("/api/study/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ activeSeconds: 60, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
        }).catch(() => {});
      }
    }, 60000);
    return () => clearInterval(hb);
  }, [isPlaying]);

  useEffect(() => {
    const pSave = setInterval(() => {
      if (currentTimeSec > 0 && durationSec !== null) {
        fetch("/api/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseId,
            videoId,
            positionSec: currentTimeSec,
            durationSec,
            watchedSecondsDelta: 15,
          }),
        }).catch(() => {});
      }
    }, 15000);
    return () => clearInterval(pSave);
  }, [currentTimeSec, courseId, videoId, durationSec]);
}
