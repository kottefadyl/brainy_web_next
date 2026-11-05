"use client";

import { Moon, Sun } from "lucide-react";
import type { Language } from "../../../lib/brainy";

export type ColorMode = "light" | "dark";

export function ThemeToggle({ language, mode, onChange }: { language: Language; mode: ColorMode; onChange: (mode: ColorMode) => void }) {
  const next = mode === "dark" ? "light" : "dark";
  const label = language === "fr"
    ? next === "dark" ? "Activer le thème sombre" : "Activer le thème clair"
    : next === "dark" ? "Switch to dark theme" : "Switch to light theme";
  return <button type="button" className="theme-toggle" onClick={() => onChange(next)} title={label} aria-label={label}>
    {mode === "dark" ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
    <span>{language === "fr" ? next === "dark" ? "Sombre" : "Clair" : next === "dark" ? "Dark" : "Light"}</span>
  </button>;
}
