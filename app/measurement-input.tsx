"use client";

import { useState } from "react";
import type { Language } from "../lib/brainy";

export type MeasureValueState = {
  value: string;
  status: "MEASURED" | "ESTIMATED" | "CALCULATED" | "ABSENT";
  uncertainty?: string;
  uncertaintyType?: "ABSOLUTE" | "RELATIVE";
  quality?: string;
  instrument?: string;
  observedAt?: string;
};

type Props = {
  value: string;
  measureValue?: {
    status?: string;
    uncertainty?: string;
    uncertaintyType?: string;
    quality?: string;
    instrument?: string;
    observedAt?: string;
  } | null;
  unit?: string | null;
  language: Language;
  onChange: (value: string, measureValue: MeasureValueState) => void;
};

export default function MeasurementInput({
  value,
  measureValue,
  unit,
  language,
  onChange,
}: Props) {
  const fr = language === "fr";
  const [status, setStatus] = useState<"MEASURED" | "ESTIMATED" | "CALCULATED" | "ABSENT">(
    (measureValue?.status as MeasureValueState["status"] | undefined) || "MEASURED"
  );
  const [uncertainty, setUncertainty] = useState(measureValue?.uncertainty || "");
  const [uncertaintyType, setUncertaintyType] = useState<"ABSOLUTE" | "RELATIVE">(
    (measureValue?.uncertaintyType as NonNullable<MeasureValueState["uncertaintyType"]> | undefined) || "ABSOLUTE"
  );
  const [quality, setQuality] = useState(measureValue?.quality || "");
  const [instrument, setInstrument] = useState(measureValue?.instrument || "");
  const [observedAt, setObservedAt] = useState(measureValue?.observedAt || "");
  const [expanded, setExpanded] = useState(
    Boolean(measureValue?.uncertainty || measureValue?.quality || measureValue?.instrument || measureValue?.observedAt)
  );

  const update = (
    nextVal: string,
    nextStatus: "MEASURED" | "ESTIMATED" | "CALCULATED" | "ABSENT",
    nextUncertainty = uncertainty,
    nextUncertaintyType = uncertaintyType,
    nextQuality = quality,
    nextInstrument = instrument,
    nextObserved = observedAt
  ) => {
    onChange(nextStatus === "ABSENT" ? "" : nextVal, {
      value: nextStatus === "ABSENT" ? "" : nextVal,
      status: nextStatus,
      uncertainty: nextUncertainty.trim() || undefined,
      uncertaintyType: nextUncertaintyType,
      quality: nextQuality.trim() || undefined,
      instrument: nextInstrument.trim() || undefined,
      observedAt: nextObserved.trim() || undefined,
    });
  };

  return (
    <div className="measurement-input-group" style={{ display: "grid", gap: "8px" }}>
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <input
          type="text"
          inputMode="decimal"
          disabled={status === "ABSENT"}
          placeholder={status === "ABSENT" ? (fr ? "Valeur absente" : "Absent value") : "0.0"}
          value={status === "ABSENT" ? "" : value}
          onChange={(e) => update(e.target.value, status)}
          style={{ flex: 1, minHeight: "44px" }}
        />
        {unit && (
          <span style={{ fontWeight: 600, color: "var(--muted)", padding: "0 6px" }}>
            {unit}
          </span>
        )}
        <select
          value={status}
          onChange={(e) => {
            const nextStatus = e.target.value as MeasureValueState["status"];
            setStatus(nextStatus);
            update(value, nextStatus);
          }}
          style={{ width: "auto", minHeight: "44px" }}
        >
          <option value="MEASURED">{fr ? "Mesurée" : "Measured"}</option>
          <option value="ESTIMATED">{fr ? "Estimée" : "Estimated"}</option>
          <option value="CALCULATED">{fr ? "Calculée" : "Calculated"}</option>
          <option value="ABSENT">{fr ? "Absente" : "Absent"}</option>
        </select>
      </div>

      <details open={expanded} onToggle={(e) => setExpanded(e.currentTarget.open)}>
        <summary style={{ cursor: "pointer", fontSize: "0.85rem", color: "var(--muted)" }}>
          {fr ? "Détails de mesure (incertitude, instrument, qualité)" : "Measurement details (uncertainty, instrument, quality)"}
        </summary>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "8px" }}>
          <label style={{ display: "grid", gap: "4px", fontSize: "0.8rem" }}>
            <span>{fr ? "Incertitude" : "Uncertainty"}</span>
            <div style={{ display: "flex", gap: "4px" }}>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0.05"
                value={uncertainty}
                onChange={(e) => {
                  setUncertainty(e.target.value);
                  update(value, status, e.target.value);
                }}
              />
              <select
                value={uncertaintyType}
                onChange={(e) => {
                  const t = e.target.value as NonNullable<MeasureValueState["uncertaintyType"]>;
                  setUncertaintyType(t);
                  update(value, status, uncertainty, t);
                }}
                style={{ width: "60px" }}
              >
                <option value="ABSOLUTE">±</option>
                <option value="RELATIVE">%</option>
              </select>
            </div>
          </label>

          <label style={{ display: "grid", gap: "4px", fontSize: "0.8rem" }}>
            <span>{fr ? "Qualité" : "Quality"}</span>
            <input
              type="text"
              placeholder={fr ? "ex. A, Étalonné" : "e.g. A, Calibrated"}
              value={quality}
              onChange={(e) => {
                setQuality(e.target.value);
                update(value, status, uncertainty, uncertaintyType, e.target.value);
              }}
            />
          </label>

          <label style={{ display: "grid", gap: "4px", fontSize: "0.8rem" }}>
            <span>{fr ? "Instrument / Source" : "Instrument / Source"}</span>
            <input
              type="text"
              placeholder={fr ? "ex. Capteur PT100" : "e.g. Sensor PT100"}
              value={instrument}
              onChange={(e) => {
                setInstrument(e.target.value);
                update(value, status, uncertainty, uncertaintyType, quality, e.target.value);
              }}
            />
          </label>

          <label style={{ display: "grid", gap: "4px", fontSize: "0.8rem" }}>
            <span>{fr ? "Date d'observation" : "Observed at"}</span>
            <input
              type="datetime-local"
              value={observedAt ? observedAt.slice(0, 16) : ""}
              onChange={(e) => {
                const iso = e.target.value ? new Date(e.target.value).toISOString() : "";
                setObservedAt(iso);
                update(value, status, uncertainty, uncertaintyType, quality, instrument, iso);
              }}
            />
          </label>
        </div>
      </details>
    </div>
  );
}
