"use client";

import { useEffect, useRef, useState } from "react";
import type { ColorMode } from "./ThemeToggle";

export function useThemeMode() {
  const [mode, setMode] = useState<ColorMode>(() => {
    if (typeof window === "undefined") return "light";
    const saved = window.localStorage.getItem("brainy_theme");
    return saved === "light" || saved === "dark" ? saved : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  const explicit = useRef(typeof window !== "undefined" && ["light", "dark"].includes(window.localStorage.getItem("brainy_theme") ?? ""));

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const followSystem = () => { if (!explicit.current) setMode(media.matches ? "dark" : "light"); };
    media.addEventListener("change", followSystem);
    return () => media.removeEventListener("change", followSystem);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = mode;
    if (explicit.current) window.localStorage.setItem("brainy_theme", mode);
  }, [mode]);

  function choose(next: ColorMode) {
    explicit.current = true;
    window.localStorage.setItem("brainy_theme", next);
    setMode(next);
  }
  return [mode, choose] as const;
}
