import { useEffect, useState } from "react";

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  msFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void>;
  msExitFullscreen?: () => Promise<void>;
};
type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void>;
  msRequestFullscreen?: () => Promise<void>;
};

const isFullscreen = () => {
  const doc = document as FullscreenDocument;
  return Boolean(doc.fullscreenElement || doc.webkitFullscreenElement || doc.msFullscreenElement);
};

// HTML5 native fullscreen (with vendor fallbacks)
async function enterFullscreen() {
  try {
    const el = document.documentElement as FullscreenElement;
    if (el.requestFullscreen) await el.requestFullscreen();
    else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
    else if (el.msRequestFullscreen) await el.msRequestFullscreen();
  } catch (err) {
    console.warn("Fullscreen request error:", err);
  }
}

async function exitFullscreen() {
  try {
    const doc = document as FullscreenDocument;
    if (!isFullscreen()) return;
    if (doc.exitFullscreen) await doc.exitFullscreen();
    else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen();
    else if (doc.msExitFullscreen) await doc.msExitFullscreen();
  } catch (err) {
    console.warn("Exit fullscreen error:", err);
  }
}

/**
 * Distraction-free Focus Mode: fullscreen + `focus-mode` class on <body>. `onExit` runs whenever focus
 * mode is off (including initially), to reset focus-only UI such as the notes drawer.
 */
export function useFocusMode(showToast: (msg: string) => void, onExit: () => void) {
  const [isFocusMode, setIsFocusMode] = useState(false);

  const toggleFocusMode = async () => {
    if (!isFocusMode) {
      setIsFocusMode(true);
      await enterFullscreen();
      showToast("Entered Focus Mode (Full Screen Cinema)");
    } else {
      setIsFocusMode(false);
      await exitFullscreen();
      showToast("Exited Focus Mode");
    }
  };

  // Leaving native fullscreen (e.g. browser Esc) also leaves focus mode
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!isFullscreen() && isFocusMode) setIsFocusMode(false);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, [isFocusMode]);

  // Sync focus mode onto <body>
  useEffect(() => {
    if (isFocusMode) {
      document.body.classList.add("focus-mode");
    } else {
      document.body.classList.remove("focus-mode");
      document.body.classList.remove("mouse-idle");
      onExit();
    }
    return () => {
      document.body.classList.remove("focus-mode");
      document.body.classList.remove("mouse-idle");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocusMode]);

  // Restore body scroll / exit fullscreen whenever leaving the learning page
  useEffect(() => {
    return () => {
      document.body.classList.remove("focus-mode", "mouse-idle");
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
      if (typeof document !== "undefined" && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, []);

  return { isFocusMode, toggleFocusMode };
}
