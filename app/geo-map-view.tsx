"use client";

import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Collection, EntryFilter, GeoPage, Language } from "../lib/brainy";

export default function GeoMapView({ collection, language, initialSearch = "", filters, viewId, onOpenEntry, onImported }: { collection: Collection; language: Language; initialSearch?: string; filters?: EntryFilter[]; viewId?: string; onOpenEntry: (id: string) => void; onImported: () => void }) {
  const fr = language === "fr";
  const positions = collection.formats.flatMap((format) => format.fields.filter((field) => field.kind === "POSITION").map((field) => ({ format, field })));
  const zones = collection.formats.flatMap((format) => format.fields.filter((field) => field.kind === "ZONE").map((field) => ({ format, field })));
  const [chosen, setChosen] = useState(positions[0] ? `${positions[0].format.id}:${positions[0].field.id}` : "");
  const [search, setSearch] = useState(initialSearch);
  const [after, setAfter] = useState<string | undefined>();
  const [history, setHistory] = useState<(string | undefined)[]>([]);
  const [page, setPage] = useState<GeoPage | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [distance, setDistance] = useState("");
  const [zoneChoice, setZoneChoice] = useState("");
  const [zoneCounts, setZoneCounts] = useState<{ zoneEntryId: string; label: string; count: number }[]>([]);
  const [importText, setImportText] = useState("");
  const [kind, setKind] = useState<"GEOJSON" | "CSV">("GEOJSON");
  const [preview, setPreview] = useState<{ count: number; errors: { row: number; message: string }[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [formatId, fieldId] = chosen.split(":");
  const filterKey = JSON.stringify(filters ?? []);

  useEffect(() => {
    if (!formatId || !fieldId) return;
    let active = true;
    api.geoPage(collection.id, formatId, fieldId, 100, after, search || undefined, JSON.parse(filterKey) as EntryFilter[] | undefined, viewId).then((result) => { if (active) { setPage(result); setError(""); } }).catch((cause) => { if (active) setError(String(cause)); });
    return () => { active = false; };
  }, [collection.id, formatId, fieldId, after, search, filterKey, viewId]);

  async function choosePoint(id: string) {
    const next = selected.includes(id) ? selected.filter((item) => item !== id) : [...selected.slice(-1), id];
    setSelected(next); setDistance("");
    if (next.length === 2) try { const result = await api.geoDistance(collection.id, formatId, fieldId, next[0], next[1], "km"); setDistance(`${Number(result.value).toLocaleString(language, { maximumFractionDigits: 2 })} km`); } catch (cause) { setError(String(cause)); }
  }

  async function exportFile(exportKind: "GEOJSON" | "CSV") {
    setBusy(true); setError("");
    try {
      const text = await api.exportGeoPoints(collection.id, formatId, fieldId, exportKind);
      const url = URL.createObjectURL(new Blob([text], { type: exportKind === "CSV" ? "text/csv" : "application/geo+json" }));
      const link = document.createElement("a"); link.href = url; link.download = `${collection.name}.${exportKind === "CSV" ? "csv" : "geojson"}`; link.click(); URL.revokeObjectURL(url);
    } catch (cause) { setError(String(cause)); } finally { setBusy(false); }
  }

  async function importFile(commit: boolean) {
    setBusy(true); setError("");
    try {
      if (!commit) setPreview(await api.previewGeoImport(collection.id, formatId, fieldId, importText, kind));
      else { const result = await api.importGeoPoints(collection.id, formatId, fieldId, importText, kind, crypto.randomUUID()); setPreview(result); if (!result.errors.length) { setNotice(fr ? `${result.count} points importés` : `${result.count} points imported`); onImported(); setAfter(undefined); setHistory([]); } }
    } catch (cause) { setError(String(cause)); } finally { setBusy(false); }
  }

  return <section className="geo-map-view">
    <h1>{fr ? "Carte des positions" : "Position map"}</h1><p>{fr ? "Grille WGS84 locale, sans fond de carte externe ni envoi des coordonnées à un tiers." : "Local WGS84 grid, with no external map tiles or coordinate sharing."}</p>
    {!positions.length ? <p>{fr ? "Ajoutez un champ position à un format de données pour commencer." : "Add a position field to a data format to begin."}</p> : <>
      <div className="geo-map-toolbar"><label>{fr ? "Champ position" : "Position field"}<select value={chosen} onChange={(event) => { setChosen(event.target.value); setAfter(undefined); setHistory([]); setPage(null); setZoneCounts([]); }} >{positions.map(({ format, field }) => <option key={field.id} value={`${format.id}:${field.id}`}>{format.name} · {field.name}</option>)}</select></label><label>{fr ? "Rechercher" : "Search"}<input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setAfter(undefined); setHistory([]); setZoneCounts([]); }} /></label></div>
      <svg className="geo-map-canvas" viewBox="0 0 720 360" role="img" aria-label={fr ? "Carte des points de la page courante" : "Map of points on the current page"}>
        <rect width="720" height="360" fill="var(--surface, #f5f7fa)" />
        {[-120, -60, 0, 60, 120].map((lon) => <line key={`lon:${lon}`} x1={(lon + 180) * 2} x2={(lon + 180) * 2} y1="0" y2="360" stroke="var(--border, #cbd5e1)" strokeWidth="1" />)}
        {[-60, -30, 0, 30, 60].map((lat) => <line key={`lat:${lat}`} y1={(90 - lat) * 2} y2={(90 - lat) * 2} x1="0" x2="720" stroke="var(--border, #cbd5e1)" strokeWidth="1" />)}
        {page?.points.map((point) => <circle key={point.entryId} cx={(point.longitude + 180) * 2} cy={(90 - point.latitude) * 2} r={selected.includes(point.entryId) ? 7 : 5} fill={selected.includes(point.entryId) ? "#b34242" : "#2866a3"} stroke="#fff" strokeWidth="1"><title>{point.name || point.entryId}: {point.latitude}, {point.longitude}</title></circle>)}
      </svg>
      <p>{fr ? "Sélectionnez deux lignes pour mesurer la distance." : "Select two rows to measure distance."} {distance}</p>
      <div className="geo-point-list">{page?.points.map((point) => <div key={point.entryId} className="geo-point-row"><button type="button" aria-pressed={selected.includes(point.entryId)} onClick={() => void choosePoint(point.entryId)}>{selected.includes(point.entryId) ? "✓ " : "○ "}{point.name || point.entryId}</button><span>{point.latitude}, {point.longitude}{point.accuracy === undefined || point.accuracy === null ? "" : ` ±${point.accuracy} m`}</span><button type="button" onClick={() => onOpenEntry(point.entryId)}>{fr ? "Ouvrir" : "Open"}</button></div>)}{page && !page.points.length && <p>{fr ? "Aucun point pour ces filtres." : "No points for these filters."}</p>}</div>
      <div className="geo-page-actions"><button type="button" disabled={!history.length} onClick={() => { const prior = [...history]; setAfter(prior.pop()); setHistory(prior); }}>{fr ? "Précédent" : "Previous"}</button><button type="button" disabled={!page?.hasMore} onClick={() => { setHistory((current) => [...current, after]); setAfter(page?.nextCursor ?? undefined); }}>{fr ? "Page suivante" : "Next page"}</button></div>
      {!!zones.length && <details><summary>{fr ? "Regrouper par zone" : "Group by zone"}</summary><label>{fr ? "Champ zone" : "Zone field"}<select value={zoneChoice} onChange={(event) => { setZoneChoice(event.target.value); setZoneCounts([]); }}><option value="">—</option>{zones.map(({ format, field }) => <option key={field.id} value={`${format.id}:${field.id}`}>{format.name} · {field.name}</option>)}</select></label><button type="button" disabled={!zoneChoice} onClick={async () => { try { const [zoneFormatId, zoneFieldId] = zoneChoice.split(":"); setZoneCounts(await api.geoZoneSummary(collection.id, formatId, fieldId, zoneFormatId, zoneFieldId, search || undefined, JSON.parse(filterKey) as EntryFilter[], viewId)); } catch (cause) { setError(String(cause)); } }}>{fr ? "Calculer" : "Calculate"}</button>{zoneCounts.map((row) => <p key={row.zoneEntryId}>{row.label}: {row.count}</p>)}</details>}
      <details><summary>{fr ? "Importer ou exporter des points" : "Import or export points"}</summary><div className="geo-import-actions"><button type="button" disabled={busy} onClick={() => void exportFile("GEOJSON")}>GeoJSON</button><button type="button" disabled={busy} onClick={() => void exportFile("CSV")}>CSV</button></div><label>{fr ? "Fichier" : "File"}<input type="file" accept=".geojson,.json,.csv" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; setKind(file.name.toLowerCase().endsWith(".csv") ? "CSV" : "GEOJSON"); setImportText(await file.text()); setPreview(null); }} /></label><p>{kind} · {fr ? "500 points maximum par import" : "Up to 500 points per import"}</p><button type="button" disabled={busy || !importText} onClick={() => void importFile(false)}>{fr ? "Aperçu" : "Preview"}</button>{preview && <p>{preview.count} {fr ? "points valides" : "valid points"}</p>}{preview?.errors.map((item) => <p key={`${item.row}:${item.message}`} role="alert">{fr ? "Ligne" : "Row"} {item.row}: {item.message}</p>)}<button type="button" disabled={busy || !preview || !!preview.errors.length || !preview.count} onClick={() => void importFile(true)}>{fr ? "Confirmer l’import" : "Confirm import"}</button></details>
    </>}
    {notice && <p role="status">{notice}</p>}{error && <p role="alert" className="form-error">{error}</p>}
  </section>;
}
