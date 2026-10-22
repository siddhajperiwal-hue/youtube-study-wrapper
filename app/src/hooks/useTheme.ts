import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

/**
 * Light/dark theme toggle. The saved theme is applied before first paint by the inline script in
 * app/layout.tsx; this hook only syncs with it and persists changes (`studydesk_theme`).
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light");
  }, []);

  /** Switches theme and returns the new value. */
  const toggleTheme = (): Theme => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("studydesk_theme", nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    return nextTheme;
  };

  return { theme, toggleTheme };
}
