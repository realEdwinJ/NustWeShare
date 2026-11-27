"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type ThemePref = "system" | "light" | "dark";
const KEY = "nws-theme";

const ThemeCtx = createContext<{ theme: ThemePref; resolved: "light" | "dark"; setTheme: (t: ThemePref) => void }>({
  theme: "system",
  resolved: "light",
  setTheme: () => {},
});

export const useTheme = () => useContext(ThemeCtx);

/** Inline, render-blocking script so the correct theme paints first (no flash). */
export const themeScript = `(function(){try{var t=localStorage.getItem('${KEY}')||'system';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);var c=document.documentElement.classList;c.toggle('dark',d);if(localStorage.getItem('nws-reduce-motion')==='1')c.add('reduce-motion');}catch(e){}})();`;

function apply(t: ThemePref): "light" | "dark" {
  const dark = t === "dark" || (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#0a111d" : "#0f2a4f");
  return dark ? "dark" : "light";
}

export function ThemeProvider({ children, serverTheme }: { children: React.ReactNode; serverTheme?: ThemePref }) {
  const [theme, setThemeState] = useState<ThemePref>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  useEffect(() => {
    let t = (localStorage.getItem(KEY) as ThemePref | null) ?? "system";
    // Signed-in users carry their preference across devices
    if (serverTheme && serverTheme !== t) {
      t = serverTheme;
      localStorage.setItem(KEY, t);
    }
    setThemeState(t);
    setResolved(apply(t));
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const cur = (localStorage.getItem(KEY) as ThemePref | null) ?? "system";
      if (cur === "system") setResolved(apply("system"));
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [serverTheme]);

  const setTheme = useCallback((t: ThemePref) => {
    try {
      localStorage.setItem(KEY, t);
    } catch {}
    setThemeState(t);
    setResolved(apply(t));
  }, []);

  return <ThemeCtx.Provider value={{ theme, resolved, setTheme }}>{children}</ThemeCtx.Provider>;
}
