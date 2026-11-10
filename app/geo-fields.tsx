"use client";

import { useState } from "react";
import { Crosshair, LocateFixed, X } from "lucide-react";
import type { Field, Language } from "../lib/brainy";
import { roundCoordinate } from "../lib/map-math";
import OsmMap from "./osm-map";
import "./geo-classification.css";

const number = (raw: string) => Number(raw.replace(",", "."));

export function GeoFieldInput({ field, language, value, onChange }: { field: Field; language: Language; value: string; onChange: (value: string) => void }) {
  const initial = (() => { try { return JSON.parse(value) as Record<string, unknown>; } catch { return {}; } })();
  const [latitude, setLatitude] = useState(String(initial.latitude ?? (Array.isArray(initial.center) ? initial.center[1] : "")));
  const [longitude, setLongitude] = useState(String(initial.longitude ?? (Array.isArray(initial.center) ? initial.center[0] : "")));
  const [accuracy, setAccuracy] = useState(String(initial.accuracy ?? ""));
  const [radius, setRadius] = useState(String(initial.radiusMeters ?? ""));
  const [shape, setShape] = useState(initial.type === "Polygon" ? "Polygon" : "Circle");
  const [vertices, setVertices] = useState(Array.isArray(initial.coordinates) ? (initial.coordinates as number[][]).map((item) => item.join(", ")).join("\n") : "");

  const fr = language === "fr";
  const [picking, setPicking] = useState(false);
  const [locating, setLocating] = useState(false);
  const [notice, setNotice] = useState("");
  const pointable = field.kind === "POSITION" || shape === "Circle";
  const current = (() => { const lat = number(latitude), lon = number(longitude); return latitude.trim() && longitude.trim() && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? [{ entryId: "position", name: field.name, latitude: lat, longitude: lon }] : []; })();

  /** A clicked or located point replaces the coordinates; accuracy comes only from a device. */
  function place(lat: number, lon: number, accuracyMeters?: number) {
    const next = { latitude: String(roundCoordinate(lat)), longitude: String(roundCoordinate(lon)), accuracy: accuracyMeters === undefined ? "" : String(Math.round(accuracyMeters)) };
    setLatitude(next.latitude); setLongitude(next.longitude); setAccuracy(next.accuracy);
    emit(next);
  }
  function locate() {
    // Product rule 13: the device position is read only when the person asks for it.
    if (typeof navigator === "undefined" || !navigator.geolocation) { setNotice(fr ? "Ce navigateur ne donne pas de position." : "This browser does not provide a position."); return; }
    setLocating(true); setNotice(fr ? "Localisation en cours…" : "Locating…");
    navigator.geolocation.getCurrentPosition((position) => {
      setLocating(false);
      place(position.coords.latitude, position.coords.longitude, position.coords.accuracy);
      setNotice(fr ? `Position enregistrée, précise à ${Math.round(position.coords.accuracy)} m.` : `Position set, accurate to ${Math.round(position.coords.accuracy)} m.`);
    }, (error) => {
      setLocating(false);
      setNotice(error.code === error.PERMISSION_DENIED
        ? (fr ? "Accès à la position refusé. Autorisez-le dans le navigateur ou choisissez sur la carte." : "Location access was denied. Allow it in the browser or pick on the map.")
        : error.code === error.TIMEOUT
          ? (fr ? "La position n’a pas été trouvée à temps. Réessayez." : "The position took too long. Please try again.")
          : (fr ? "Position indisponible. Réessayez ou choisissez sur la carte." : "Position unavailable. Try again or pick on the map."));
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  }

  function emit(next: { latitude?: string; longitude?: string; accuracy?: string; radius?: string; shape?: string; vertices?: string }) {
    const lat = next.latitude ?? latitude, lon = next.longitude ?? longitude, acc = next.accuracy ?? accuracy, rad = next.radius ?? radius;
    const selectedShape = next.shape ?? shape, lines = next.vertices ?? vertices;
    if (field.kind === "POSITION") {
      if (!lat.trim() || !lon.trim()) return onChange(lat.trim() || lon.trim() ? "{" : "");
      onChange(JSON.stringify({ latitude: number(lat), longitude: number(lon), ...(acc.trim() ? { accuracy: number(acc) } : {}) }));
      return;
    }
    if (selectedShape === "Circle") {
      if (!lat.trim() || !lon.trim() || !rad.trim()) return onChange(lat.trim() || lon.trim() || rad.trim() ? "{" : "");
      onChange(JSON.stringify({ type: "Circle", center: [number(lon), number(lat)], radiusMeters: number(rad) }));
    } else {
      const coordinates = lines.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => line.split(/[;,]/).map((part) => number(part.trim())));
      onChange(coordinates.length >= 3 ? JSON.stringify({ type: "Polygon", coordinates }) : lines.trim() ? "{" : "");
    }
  }

  return <fieldset className="geo-field-input"><legend>{field.name} · {field.kind === "POSITION" ? language === "fr" ? "Position WGS84" : "WGS84 position" : language === "fr" ? "Zone" : "Zone"}</legend>
    {field.kind === "ZONE" && <label>{language === "fr" ? "Forme" : "Shape"}<select value={shape} onChange={(event) => { setShape(event.target.value); emit({ shape: event.target.value }); }}><option value="Circle">{language === "fr" ? "Cercle" : "Circle"}</option><option value="Polygon">{language === "fr" ? "Polygone" : "Polygon"}</option></select></label>}
    {(field.kind === "POSITION" || shape === "Circle") && <div className="geo-coordinate-row">
      <label>{language === "fr" ? "Latitude (−90 à 90)" : "Latitude (−90 to 90)"}<input inputMode="decimal" value={latitude} onChange={(event) => { setLatitude(event.target.value); emit({ latitude: event.target.value }); }} placeholder="6.5244" /></label>
      <label>{language === "fr" ? "Longitude (−180 à 180)" : "Longitude (−180 to 180)"}<input inputMode="decimal" value={longitude} onChange={(event) => { setLongitude(event.target.value); emit({ longitude: event.target.value }); }} placeholder="3.3792" /></label>
    </div>}
    {pointable && <div className="geo-pick-actions">
      <button type="button" className="btn secondary" disabled={locating} onClick={locate}><LocateFixed size={17} aria-hidden="true" />{fr ? "Utiliser ma position" : "Use my location"}</button>
      <button type="button" className="btn secondary" aria-expanded={picking} onClick={() => setPicking(!picking)}>{picking ? <X size={17} aria-hidden="true" /> : <Crosshair size={17} aria-hidden="true" />}{picking ? (fr ? "Fermer la carte" : "Close the map") : (fr ? "Choisir sur la carte" : "Pick on the map")}</button>
    </div>}
    {notice && <p className="geo-pick-notice" role="status">{notice}</p>}
    {pointable && picking && <div className="geo-pick-map">
      <p>{fr ? "Touchez ou cliquez l’endroit voulu ; au clavier, Entrée choisit le centre." : "Tap or click the place; with the keyboard, Enter picks the centre."}</p>
      <OsmMap points={current} language={language} selected={current.map((item) => item.entryId)} onOpenEntry={() => undefined} onPick={(lat, lon) => { place(lat, lon); setNotice(fr ? "Position choisie sur la carte." : "Position picked on the map."); }} />
    </div>}
    {field.kind === "POSITION" ? <label>{language === "fr" ? "Précision en mètres (facultative)" : "Accuracy in metres (optional)"}<input inputMode="decimal" value={accuracy} onChange={(event) => { setAccuracy(event.target.value); emit({ accuracy: event.target.value }); }} /></label> : shape === "Circle" ? <label>{language === "fr" ? "Rayon en mètres" : "Radius in metres"}<input inputMode="decimal" value={radius} onChange={(event) => { setRadius(event.target.value); emit({ radius: event.target.value }); }} /></label> : <label>{language === "fr" ? "Sommets : longitude, latitude par ligne" : "Vertices: longitude, latitude per line"}<textarea rows={5} value={vertices} onChange={(event) => { setVertices(event.target.value); emit({ vertices: event.target.value }); }} placeholder={"3.35, 6.50\n3.40, 6.50\n3.38, 6.55"} /></label>}
    <small>{fr ? "Ces coordonnées restent dans Brainy. La carte ne charge le fond OpenStreetMap qu’avec votre accord." : "These coordinates stay in Brainy. The map loads the OpenStreetMap background only with your consent."}</small>
  </fieldset>;
}
