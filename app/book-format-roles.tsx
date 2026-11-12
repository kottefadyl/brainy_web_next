"use client";

// T47/3: the owner chooses which data formats appear in the book, and as what (chapter, section…).
import { useState } from "react";
import { assignableRoles, bookApi, roleLabel, type BookRole } from "../lib/book";
import { translateError, type Collection, type Language } from "../lib/brainy";

export function BookFormatRoles({ collection, language, onCollectionChanged }: { collection: Collection; language: Language; onCollectionChanged: (collection: Collection) => void }) {
  const fr = language === "fr";
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const roles = new Map((collection.bookView?.roles ?? []).map((item) => [item.formatId, item.role as BookRole]));
  // Front and back matter pages keep their template role; every other data format can be placed.
  const formats = collection.formats.filter((format) => !roles.has(format.id) || assignableRoles.includes(roles.get(format.id)!));
  async function choose(formatId: string, value: string) {
    setBusy(formatId); setError("");
    try {
      const bookView = await bookApi.setFormatRole(collection.id, formatId, value ? value as BookRole : null);
      onCollectionChanged({ ...collection, bookView });
    } catch (cause) { setError(translateError(cause, language)); }
    finally { setBusy(""); }
  }
  return <details className="book-format-roles">
    <summary>{fr ? "Formats de données dans le livre" : "Data formats in the book"}</summary>
    <p className="book-outline-note">{fr ? "Choisissez comment chaque format de données apparaît dans le livre, ou « Non affiché »." : "Choose how each data format appears in the book, or “Not shown”."}</p>
    {formats.map((format) => <label key={format.id} className="book-format-role">
      <span>{format.name}</span>
      <select value={roles.get(format.id) ?? ""} disabled={busy === format.id} onChange={(event) => void choose(format.id, event.target.value)}>
        <option value="">{fr ? "Non affiché" : "Not shown"}</option>
        {assignableRoles.map((role) => <option key={role} value={role}>{roleLabel(role, language)}</option>)}
      </select>
    </label>)}
    {error && <p className="form-error" role="alert">{error}</p>}
  </details>;
}
