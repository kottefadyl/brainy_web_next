import { FileText, FolderHeart, FolderInput } from "lucide-react";
import { t, type Collection, type Language } from "../../../lib/brainy";
import CollectionHeroActions from "../../collection-hero-actions";

type Props = { collection: Collection; entryCount: number; language: Language; onNewEntry: () => void; onInsights: () => void; onRename: () => void; onDelete: () => void; onPackages?: () => void; onShare?: () => void; role?: "OWNER" | "EDITOR" | "READER" };

export function CollectionHeader({ collection, entryCount, language, onNewEntry, onInsights, onRename, onDelete, onPackages, onShare, role = "OWNER" }: Props) {
  const fr = language === "fr";
  const owner = role === "OWNER";
  return <section className="collection-hero" aria-label={t(language, "collection")}>
    <div className="collection-hero-main">
      <div className="collection-icon" aria-hidden="true">{owner ? <FolderHeart size={27} /> : <FolderInput size={27} />}</div>
      <div className="collection-hero-copy">
        <span className="eyebrow">{owner ? t(language, "collection") : fr ? `Partagée par ${collection.sharedBy?.name ?? ""}` : `Shared by ${collection.sharedBy?.name ?? ""}`}</span>
        <h1 title={collection.name}>{collection.name}</h1>
        <div className="collection-meta">
          <span><FileText size={15} aria-hidden="true" /> {entryCount} {t(language, entryCount === 1 ? "entry" : "entries").toLocaleLowerCase(language)}</span>
          <span className="collection-meta-separator" aria-hidden="true">·</span>
          <span>{collection.formats.length} {t(language, collection.formats.length === 1 ? "format" : "formats").toLocaleLowerCase(language)}</span>
        </div>
      </div>
    </div>
    <CollectionHeroActions language={language} onNewEntry={onNewEntry} onInsights={onInsights} onRename={onRename} onDelete={onDelete} onPackages={onPackages} onShare={onShare} owner={owner} />
  </section>;
}

/** T52: reminds a collaborator what they can do in a collection shared with them. */
export function SharedCollectionBanner({ collection, role, language }: { collection: Collection; role: "EDITOR" | "READER"; language: Language }) {
  const fr = language === "fr";
  return <div className="shared-banner" role="note">
    <FolderInput size={18} aria-hidden="true" />
    <strong>{fr ? `Partagée par ${collection.sharedBy?.name ?? ""}` : `Shared by ${collection.sharedBy?.name ?? ""}`}</strong>
    <span className="shared-role">{role === "EDITOR" ? fr ? "Lecture et écriture" : "Read and write" : fr ? "Lecture seule" : "Read only"}</span>
    <p>{role === "EDITOR" ? fr ? "Vous pouvez ajouter, modifier et supprimer des entrées. La structure reste gérée par le propriétaire." : "You can add, edit and delete entries. The owner keeps managing the structure." : fr ? "Vous pouvez consulter et copier les entrées, sans les modifier." : "You can view and copy entries, without changing them."}</p>
  </div>;
}
