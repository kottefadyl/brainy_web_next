"use client";

import { useEffect, useRef } from "react";
import { Check, ChevronDown, Globe2 } from "lucide-react";
import { t, type Language } from "../../../lib/brainy";

export function LanguagePicker({ language, onChange }: { language: Language; onChange: (language: Language) => void }) {
  const pickerRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) pickerRef.current.open = false;
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);
  const choose = (next: Language) => {
    if (pickerRef.current) {
      pickerRef.current.open = false;
      pickerRef.current.querySelector("summary")?.focus();
    }
    onChange(next);
  };
  return (
    <details ref={pickerRef} className="language-picker" onKeyDown={(event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.currentTarget.open = false;
        event.currentTarget.querySelector("summary")?.focus();
      }
    }}>
      <summary aria-label={`${t(language, "language")}: ${language === "fr" ? "Français" : "English"}`}><Globe2 size={17} aria-hidden="true" /><span className="language-picker-full">{language === "fr" ? "Français" : "English"}</span><span className="language-picker-short">{language === "fr" ? "FR" : "EN"}</span><ChevronDown size={14} aria-hidden="true" /></summary>
      <div className="language-picker-menu">
        <button type="button" lang="en" aria-pressed={language === "en"} onClick={() => choose("en")}>English{language === "en" && <Check size={15} aria-hidden="true" />}</button>
        <button type="button" lang="fr" aria-pressed={language === "fr"} onClick={() => choose("fr")}>Français{language === "fr" && <Check size={15} aria-hidden="true" />}</button>
      </div>
    </details>
  );
}
