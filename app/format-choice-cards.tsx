"use client";

import { useRef, type KeyboardEvent } from "react";
import { Check } from "lucide-react";
import { formatDisplayName, type Collection, type Language } from "../lib/brainy";
import { formatColorStyle } from "../lib/format-colors";
import "./format-choice-cards.css";

type Format = Collection["formats"][number];
const MAX_CARDS = 6;

/** New entry: the collection's data formats as small colored cards; a click chooses one. */
export default function FormatChoiceCards({ formats, value, language, label, onChange }: { formats: Format[]; value: string; language: Language; label: string; onChange: (formatId: string) => void }) {
  const fr = language === "fr";
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  function onKey(event: KeyboardEvent, index: number) {
    const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = (index + step + shown.length) % shown.length;
    onChange(shown[next].id);
    refs.current[next]?.focus();
  }
  // At most 6 cards; the chosen data format always stays among them. The others stay reachable from a list.
  const shown = formats.length <= MAX_CARDS ? formats : (() => {
    const first = formats.slice(0, MAX_CARDS);
    const chosen = formats.find((format) => format.id === value);
    return chosen && !first.includes(chosen) ? [...first.slice(0, MAX_CARDS - 1), chosen] : first;
  })();
  return <div className="format-choice">
    <span className="input-label-text" id="format-choice-label">{label}</span>
    <div className="format-choice-grid" role="radiogroup" aria-labelledby="format-choice-label">
      {shown.map((format, index) => {
        const selected = format.id === value;
        const names = format.fields.slice(0, 3).map((field) => field.name).join(" · ");
        const count = format.fields.length;
        return <button key={format.id} ref={(node) => { refs.current[index] = node; }} type="button" role="radio" aria-checked={selected} tabIndex={selected ? 0 : -1}
          className={`format-choice-card${selected ? " is-selected" : ""}`} style={formatColorStyle(format.color)} onClick={() => onChange(format.id)} onKeyDown={(event) => onKey(event, index)}>
          <span className="format-choice-name">{formatDisplayName(format, language)}</span>
          <span className="format-choice-fields">{names}{count > 3 ? ` +${count - 3}` : ""}</span>
          <span className="format-choice-count">{fr ? `${count} champ${count > 1 ? "s" : ""}` : `${count} field${count > 1 ? "s" : ""}`}</span>
          {selected && <span className="format-choice-check" aria-hidden="true"><Check size={14} /></span>}
        </button>;
      })}
    </div>
    {formats.length > MAX_CARDS && <label className="format-choice-more">{fr ? `Tous les formats de données (${formats.length})` : `All data formats (${formats.length})`}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {formats.map((format) => <option key={format.id} value={format.id}>{formatDisplayName(format, language)}</option>)}
      </select>
    </label>}
  </div>;
}
