import { useLayoutEffect, useRef, useState } from "react";

/**
 * Whether this page is actually on screen. With cacheComponents, Next.js keeps pages you navigate
 * away from mounted but hidden (React <Activity>, display:none) instead of unmounting them, and
 * hidden pages can still re-render. Layout effects run when the page is shown and clean up
 * synchronously when it's hidden, so anything with side effects in the DOM (e.g. an autoplaying
 * video) should be gated on this. `onHide` runs synchronously as the page is hidden.
 */
export function usePageVisible(onHide?: () => void) {
  const [isPageVisible, setIsPageVisible] = useState(false);
  const onHideRef = useRef(onHide);
  useLayoutEffect(() => {
    onHideRef.current = onHide;
  });

  useLayoutEffect(() => {
    setIsPageVisible(true);
    return () => {
      onHideRef.current?.();
      setIsPageVisible(false);
    };
  }, []);

  return isPageVisible;
}
