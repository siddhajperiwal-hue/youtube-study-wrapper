import { useEffect, useState } from "react";

interface FocusTimerOptions {
  isPlaying: boolean;
  /** Focus interval elapsed: pause the video (the break overlay is shown by this hook) */
  onBreakStart: () => void;
  /** Break finished or dismissed: resume the video */
  onBreakEnd: () => void;
  showToast: (msg: string) => void;
}

export const FOCUS_PRESETS = [20, 25, 30, 45];
export const BREAK_PRESETS = [5, 8, 10, 15];

/**
 * Scientific Pomodoro timer (Section 6): counts down only while the video plays, then shows a rest
 * break that ends automatically or when dismissed.
 */
export function useFocusTimer({ isPlaying, onBreakStart, onBreakEnd, showToast }: FocusTimerOptions) {
  const [focusMinutes, setFocusMinutesState] = useState(20);
  const [breakMinutes, setBreakMinutesState] = useState(5);
  const [focusRemainingSec, setFocusRemainingSec] = useState(20 * 60);
  const [isPaused, setIsPaused] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [showBreakOverlay, setShowBreakOverlay] = useState(false);
  const [breakRemainingSec, setBreakRemainingSec] = useState(5 * 60);

  /** Changing the focus length restarts the countdown */
  const setFocusMinutes = (m: number) => {
    setFocusMinutesState(m);
    setFocusRemainingSec(m * 60);
  };
  const setBreakMinutes = (m: number) => setBreakMinutesState(m);

  const triggerBreak = () => {
    onBreakStart();
    setShowBreakOverlay(true);
    setBreakRemainingSec(breakMinutes * 60);
  };

  const resumeFromBreak = () => {
    setShowBreakOverlay(false);
    setFocusRemainingSec(focusMinutes * 60);
    onBreakEnd();
  };

  // Focus countdown (runs ONLY while playing and not paused)
  useEffect(() => {
    const timer = setInterval(() => {
      if (isPlaying && !isPaused && !showBreakOverlay) {
        setFocusRemainingSec((prev) => {
          if (prev <= 1) {
            triggerBreak();
            return focusMinutes * 60;
          }
          return prev - 1;
        });
      }
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, isPaused, showBreakOverlay, focusMinutes]);

  // Break countdown
  useEffect(() => {
    if (!showBreakOverlay) return;
    const timer = setInterval(() => {
      setBreakRemainingSec((prev) => {
        if (prev <= 1) {
          resumeFromBreak();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showBreakOverlay]);

  const resetDefaults = () => {
    setFocusMinutesState(20);
    setBreakMinutesState(5);
    setFocusRemainingSec(20 * 60);
    setIsConfigOpen(false);
    showToast("Restored scientific 20m focus / 5m break ratio");
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
    showToast(isPaused ? "Focus timer resumed" : "Focus timer paused");
  };

  const apply = () => {
    setIsConfigOpen(false);
    showToast(`Timer set: ${focusMinutes}m Focus / ${breakMinutes}m Break`);
  };

  return {
    focusMinutes,
    breakMinutes,
    focusRemainingSec,
    isPaused,
    isConfigOpen,
    setIsConfigOpen,
    showBreakOverlay,
    setShowBreakOverlay,
    breakRemainingSec,
    setFocusMinutes,
    setBreakMinutes,
    triggerBreak,
    resumeFromBreak,
    resetDefaults,
    togglePause,
    apply,
  };
}

export type FocusTimer = ReturnType<typeof useFocusTimer>;
