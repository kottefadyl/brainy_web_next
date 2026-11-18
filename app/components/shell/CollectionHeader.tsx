import { FileText, FolderInput, Shapes, Users } from "lucide-react";
import { CollectionGlyph, collectionTint } from "../../../lib/collection-identity";
import { hasCalculations, t, type Collection, type Language } from "../../../lib/brainy";
import CollectionHeroActions from "../../collection-hero-actions";

type Props = { collection: Collection; entryCount: number; language: Language; onNewEntry: () => void; onInsights: () => void; onRename: () => void; onDelete: () => void; onPackages?: () => void; onShare?: () => void; role?: "OWNER" | "EDITOR" | "READER"; onCalculations?: (enabled: boolean) => void };

export function CollectionHeader({ collection, entryCount, language, onNewEntry, onInsights, onRename, onDelete, onPackages, onShare, role = "OWNER", onCalculations }: Props) {
  const fr = language === "fr";
  const owner = role === "OWNER";
  return <section className="collection-hero" aria-label={t(language, "collection")} style={collectionTint(collection)}>
    <div className="collection-hero-main">
      <CollectionGlyph collection={collection} size={24} className="collection-icon" />
      <div className="collection-hero-copy">
        {!owner && <span className="eyebrow">{fr ? `Partagée par ${collection.sharedBy?.name ?? ""}` : `Shared by ${collection.sharedBy?.name ?? ""}`}</span>}
        <h1 title={collection.name}>{collection.name}</h1>
        <div className="collection-meta">
          <span><FileText size={15} aria-hidden="true" /> {entryCount} {t(language, entryCount === 1 ? "entry" : "entries").toLocaleLowerCase(language)}</span>
          <span className="collection-meta-separator" aria-hidden="true">·</span>
          <span><Shapes size={15} aria-hidden="true" /> {collection.formats.length} {t(language, collection.formats.length === 1 ? "format" : "formats").toLocaleLowerCase(language)}</span>
        </div>
        {owner && !!collection.memberCount && <SharedWith count={collection.memberCount} language={language} onOpen={onShare} />}
      </div>
    </div>
    <CollectionHeroActions language={language} onNewEntry={onNewEntry} onInsights={hasCalculations(collection) ? onInsights : undefined} onRename={onRename} onDelete={onDelete} onPackages={onPackages} onShare={onShare} owner={owner} calculations={hasCalculations(collection)} onCalculations={owner ? onCalculations : undefined} />
  </section>;
}

/** Tells the owner that a collection is shared and opens the list of people with access. */
function SharedWith({ count, language, onOpen }: { count: number; language: Language; onOpen?: () => void }) {
  const fr = language === "fr";
  const label = fr ? `Partagée avec ${count.toLocaleString("fr")} personne${count > 1 ? "s" : ""}` : `Shared with ${count.toLocaleString("en")} ${count > 1 ? "people" : "person"}`;
  return onOpen
    ? <button type="button" className="collection-shared-pill" onClick={onOpen} title={fr ? "Voir les personnes ayant accès" : "See who has access"}><Users size={15} aria-hidden="true" />{label}</button>
    : <span className="collection-shared-pill"><Users size={15} aria-hidden="true" />{label}</span>;
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
