"use client";

// "Calculations and statistics": chosen when a collection is created and changeable by its owner in Manage.
// When off, no maths appears anywhere for that collection, so beginners are never lost in it.
import { Calculator } from "lucide-react";
import type { Language } from "../lib/brainy";
import "./calculations-choice.css";

export function CalculationsChoice({ checked, language, onChange }: { checked: boolean; language: Language; onChange: (checked: boolean) => void }) {
  const fr = language === "fr";
  return <label className="calculations-choice">
    <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    <span className="calculations-choice-icon" aria-hidden="true"><Calculator size={18} /></span>
    <span className="calculations-choice-text">
      <strong>{fr ? "Calculs et statistiques" : "Calculations and statistics"}</strong>
      <small>{checked
        ? (fr ? "Totaux, formules, graphiques, analyses, stock et conversions d’unités seront proposés." : "Totals, formulas, charts, analyses, stock and unit conversions will be offered.")
        : (fr ? "Collection simple : aucun calcul ni statistique ne sera affiché. Le propriétaire peut les activer plus tard dans « Gérer »." : "Simple collection: no calculations or statistics are shown. The owner can turn them on later in “Manage”.")}</small>
    </span>
  </label>;
}
