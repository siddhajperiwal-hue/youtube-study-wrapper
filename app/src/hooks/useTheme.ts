import { useEffect, useState } from "react";
import { flushSync } from "react-dom";

export type Theme = "light" | "dark";

const SPLASH_MS = 600;

/**
 * Light/dark theme toggle. The saved theme is applied before first paint by the inline script in
 * app/layout.tsx; this hook only syncs with it and persists changes (`studydesk_theme`).
 * Switching plays a circular "splash" from the centre of the screen via the View Transitions API
 * (styles in globals.css under `.theme-splash`); browsers without it, or with reduced motion
 * requested, switch instantly.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    // Read once from the attribute the pre-paint script set (not available during SSR)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light");
  }, []);

  /** Switches theme and returns the new value. */
  const toggleTheme = (): Theme => {
    const nextTheme = theme === "light" ? "dark" : "light";
    const root = document.documentElement;
    const apply = () => {
      // flushSync so the new snapshot already shows the updated toggle icon
      flushSync(() => setTheme(nextTheme));
      root.setAttribute("data-theme", nextTheme);
    };
    localStorage.setItem("studydesk_theme", nextTheme);

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!document.startViewTransition || reduceMotion) {
      apply();
      return nextTheme;
    }

    root.classList.add("theme-splash");
    const transition = document.startViewTransition(apply);
    transition.ready
      .then(() => {
        const radius = Math.hypot(window.innerWidth, window.innerHeight) / 2;
        root.animate(
          { clipPath: ["circle(0px at 50% 50%)", `circle(${radius}px at 50% 50%)`] },
          { duration: SPLASH_MS, easing: "cubic-bezier(0.4, 0, 0.2, 1)", pseudoElement: "::view-transition-new(root)" },
        );
      })
      .catch(() => {});
    transition.finished.finally(() => root.classList.remove("theme-splash"));
    return nextTheme;
  };

  return { theme, toggleTheme };
}
