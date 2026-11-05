import { FileText, FolderHeart } from "lucide-react";
import { t, type Collection, type Language } from "../../../lib/brainy";
import CollectionHeroActions from "../../collection-hero-actions";

type Props = { collection: Collection; entryCount: number; language: Language; onNewEntry: () => void; onInsights: () => void; onRename: () => void; onDelete: () => void };

export function CollectionHeader({ collection, entryCount, language, onNewEntry, onInsights, onRename, onDelete }: Props) {
  return <section className="collection-hero" aria-label={t(language, "collection")}>
    <div className="collection-hero-main">
      <div className="collection-icon" aria-hidden="true"><FolderHeart size={27} /></div>
      <div className="collection-hero-copy">
        <span className="eyebrow">{t(language, "collection")}</span>
        <h1 title={collection.name}>{collection.name}</h1>
        <div className="collection-meta">
          <span><FileText size={15} aria-hidden="true" /> {entryCount} {t(language, "entries")}</span>
          <span className="collection-meta-separator" aria-hidden="true">·</span>
          <span>{collection.formats.length} {t(language, collection.formats.length === 1 ? "format" : "formats")}</span>
        </div>
      </div>
    </div>
    <CollectionHeroActions language={language} onNewEntry={onNewEntry} onInsights={onInsights} onRename={onRename} onDelete={onDelete} />
  </section>;
}
