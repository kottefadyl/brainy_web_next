import { BookOpen, Plus } from "lucide-react";
import { t, type Language } from "../lib/brainy";

export function EntriesLoadingSkeleton({ language }: { language: Language }) {
  return <div className="entries-skeleton" role="status" aria-label={t(language, "loading")}>
    {[0, 1, 2].map((index) => <div className="entries-skeleton-row" key={index} aria-hidden="true"><span /><span /><span /></div>)}
  </div>;
}

export function EntriesEmptyState({ language, filtered, onClear, onWrite }: {
  language: Language; filtered: boolean; onClear: () => void; onWrite: () => void;
}) {
  const fr = language === "fr";
  return <div className="empty-state entries-empty">
    <div className="empty-art"><BookOpen size={40} strokeWidth={1.5} aria-hidden="true" /></div>
    <h2>{filtered ? t(language, "noMatches") : t(language, "noEntries")}</h2>
    <p>{filtered ? fr ? "Essayez d’effacer les filtres pour retrouver vos entrées." : "Clear the filters to see your entries again." : fr ? "Vos idées auront bientôt leur place ici." : "Your ideas will feel at home here."}</p>
    {filtered ? <button type="button" className="button button-secondary" onClick={onClear}>{fr ? "Effacer les filtres" : "Clear filters"}</button> : <button type="button" className="button button-secondary empty-write-action" onClick={onWrite}><Plus size={17} aria-hidden="true" />{t(language, "writeEntry")}</button>}
  </div>;
}
