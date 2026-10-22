import React, { useEffect, useState } from "react";

/**
 * True when any `[data-clamp]` element inside the ref'd element is visually truncated by its
 * line clamp. Re-checks when `deps` change (new content) and when the element resizes.
 */
export function useHasTruncatedText(ref: React.RefObject<HTMLElement | null>, deps: unknown[]) {
  const [truncated, setTruncated] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      setTruncated(false);
      return;
    }
    const check = () =>
      setTruncated(
        Array.from(el.querySelectorAll<HTMLElement>("[data-clamp]")).some(
          (n) => n.scrollHeight > n.clientHeight + 1 || n.scrollWidth > n.clientWidth + 1
        )
      );
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return truncated;
}
