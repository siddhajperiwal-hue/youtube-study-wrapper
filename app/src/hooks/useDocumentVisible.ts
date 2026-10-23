import { useSyncExternalStore } from "react";

const subscribe = (onChange: () => void) => {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
};

/**
 * Whether the browser tab is in front (`document.visibilityState`). Different from usePageVisible,
 * which tracks this page inside the app (Next.js keeps hidden pages mounted).
 */
export function useDocumentVisible() {
  return useSyncExternalStore(
    subscribe,
    () => document.visibilityState === "visible",
    () => true,
  );
}
