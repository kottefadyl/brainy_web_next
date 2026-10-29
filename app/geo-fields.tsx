"use client";

import { useState } from "react";
import type { Field, Language } from "../lib/brainy";

const number = (raw: string) => Number(raw.replace(",", "."));

export function GeoFieldInput({ field, language, value, onChange }: { field: Field; language: Language; value: string; onChange: (value: string) => void }) {
  const initial = (() => { try { return JSON.parse(value) as Record<string, unknown>; } catch { return {}; } })();
  const [latitude, setLatitude] = useState(String(initial.latitude ?? (Array.isArray(initial.center) ? initial.center[1] : "")));
  const [longitude, setLongitude] = useState(String(initial.longitude ?? (Array.isArray(initial.center) ? initial.center[0] : "")));
  const [accuracy, setAccuracy] = useState(String(initial.accuracy ?? ""));
  const [radius, setRadius] = useState(String(initial.radiusMeters ?? ""));
  const [shape, setShape] = useState(initial.type === "Polygon" ? "Polygon" : "Circle");
  const [vertices, setVertices] = useState(Array.isArray(initial.coordinates) ? (initial.coordinates as number[][]).map((item) => item.join(", ")).join("\n") : "");

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
    {field.kind === "POSITION" ? <label>{language === "fr" ? "Précision en mètres (facultative)" : "Accuracy in metres (optional)"}<input inputMode="decimal" value={accuracy} onChange={(event) => { setAccuracy(event.target.value); emit({ accuracy: event.target.value }); }} /></label> : shape === "Circle" ? <label>{language === "fr" ? "Rayon en mètres" : "Radius in metres"}<input inputMode="decimal" value={radius} onChange={(event) => { setRadius(event.target.value); emit({ radius: event.target.value }); }} /></label> : <label>{language === "fr" ? "Sommets : longitude, latitude par ligne" : "Vertices: longitude, latitude per line"}<textarea rows={5} value={vertices} onChange={(event) => { setVertices(event.target.value); emit({ vertices: event.target.value }); }} placeholder={"3.35, 6.50\n3.40, 6.50\n3.38, 6.55"} /></label>}
    <small>{language === "fr" ? "Ces coordonnées restent dans Brainy ; aucun fond de carte externe n’est chargé." : "These coordinates stay in Brainy; no external map tiles are loaded."}</small>
  </fieldset>;
}
