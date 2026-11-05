"use client";

import { useRef } from "react";
import { Check } from "lucide-react";
import { formatColors, type Language } from "../lib/brainy";

const names = [
  ["Ice blue", "Bleu glacier"], ["Mint", "Menthe"], ["Peach", "Pêche"], ["Lavender", "Lavande"],
  ["Rose", "Rose"], ["Aqua", "Aqua"], ["Sand", "Sable"], ["Sage", "Sauge"],
  ["Orchid", "Orchidée"], ["Slate blue", "Bleu ardoise"], ["Apricot", "Abricot"], ["Sky", "Ciel"],
  ["Blush", "Rose pâle"], ["Powder blue", "Bleu poudré"], ["Lime", "Citron vert"], ["Coral", "Corail"],
  ["Periwinkle", "Pervenche"], ["Seafoam", "Écume"], ["Almond", "Amande"], ["Mist", "Brume"],
  ["Salmon", "Saumon"], ["Olive", "Olive"], ["Lilac", "Lilas"], ["Celadon", "Céladon"],
] as const;

export function FormatColorPicker({ language, value, unavailable, onChange, help }: {
  language: Language; value: string; unavailable: readonly string[]; onChange: (color: string) => void; help?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const fr = language === "fr";
  function move(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    const direction = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (!direction && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const available = formatColors.map((_, i) => i).filter((i) => !unavailable.includes(formatColors[i]));
    if (!available.length) return;
    const position = available.indexOf(index);
    const next = event.key === "Home" ? available[0] : event.key === "End" ? available[available.length - 1] : available[(position + direction + available.length) % available.length];
    onChange(formatColors[next]);
    refs.current[next]?.focus();
  }
  return <fieldset className="format-color-picker"><legend>{fr ? "Couleur du format de données" : "Data format color"}</legend>
    {help && <p>{help}</p>}
    <div className="format-color-options" role="radiogroup" aria-label={fr ? "Couleur du format de données" : "Data format color"}>
      {formatColors.map((option, index) => <button key={option} ref={(element) => { refs.current[index] = element; }} type="button" role="radio"
        className={`format-color-option ${value === option ? "selected" : ""}`} style={{ backgroundColor: option }}
        disabled={unavailable.includes(option)} aria-checked={value === option}
        aria-label={`${fr ? names[index][1] : names[index][0]} ${index + 1}`}
        tabIndex={value === option || !value && index === formatColors.findIndex((item) => !unavailable.includes(item)) ? 0 : -1}
        onKeyDown={(event) => move(event, index)} onClick={() => onChange(option)}>
        {value === option && <Check size={18} strokeWidth={3} aria-hidden="true" />}
      </button>)}
    </div>
  </fieldset>;
}
