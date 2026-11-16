"use client";

// A yes/no field in the entry list: a real checkbox, so the entry changes state in one click.
import { useState } from "react";
import { api } from "../lib/api";
import type { Entry, Language } from "../lib/brainy";

type Props = { entry: Entry; fieldId: string; label: string; language: Language; canWrite: boolean; onSaved?: (entry: Entry) => void; onError?: (error: unknown) => void };

export default function EntryCheckboxFact({ entry, fieldId, label, language, canWrite, onSaved, onError }: Props) {
  const fr = language === "fr";
  const saved = entry.values.find((item) => item.fieldId === fieldId)?.value === "true";
  // Shown at once while the server saves it; back to the saved state if it refuses.
  const [pending, setPending] = useState<boolean | null>(null);
  const checked = pending ?? saved;
  async function change(next: boolean) {
    setPending(next);
    try { onSaved?.(await api.setEntryCheckbox(entry.id, fieldId, next, entry.updatedAt)); }
    catch (error) { onError?.(error); }
    finally { setPending(null); }
  }
  const state = checked ? fr ? "Oui" : "Yes" : fr ? "Non" : "No";
  return <div className="entry-item-check">
    <dt>{label}</dt>
    <dd>
      <label title={canWrite ? fr ? `Cliquer pour passer à « ${checked ? "Non" : "Oui"} »` : `Click to set to “${checked ? "No" : "Yes"}”` : state}>
        <input type="checkbox" checked={checked} disabled={!canWrite || pending !== null} onChange={(event) => change(event.target.checked)} aria-label={`${label} : ${state}`} />
        <span aria-hidden="true">{state}</span>
      </label>
    </dd>
  </div>;
}
