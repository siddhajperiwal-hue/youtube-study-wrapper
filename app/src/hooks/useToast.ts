import { useRef, useState } from "react";

/** Transient toast message: `showToast(msg)` displays it for `durationMs` (a newer toast restarts the timer). */
export function useToast(durationMs = 2800) {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, durationMs);
  };

  return { toastMessage, showToast };
}
