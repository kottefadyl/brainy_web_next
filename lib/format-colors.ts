import type { CSSProperties } from "react";
import { formatColors } from "./brainy";

// Presentation only: the canonical color value remains the saved data format ID.
const darkSurfaces = [
  "#24344A", "#203C32", "#443325", "#322B43", "#442D36", "#203A3E",
  "#403B26", "#303D2A", "#3E2D43", "#2B3543", "#423328", "#263C49",
  "#422D3C", "#263847", "#374029", "#443027", "#30314A", "#243D37",
  "#3E352B", "#263B40", "#44312F", "#343E2A", "#33344A", "#263C30",
] as const;

const darkMarkers = [
  "#A6C9FF", "#93DDB8", "#FFD0A0", "#CBB9FF", "#FFB7CB", "#8ADDE6",
  "#E8D991", "#B6DC94", "#E7B4E9", "#AFCAEB", "#F0C69F", "#9BD7F4",
  "#F0B4D9", "#9DCDF2", "#D1E292", "#FFC2A2", "#BDBDFF", "#8DE1C6",
  "#E4C9A5", "#91D7DA", "#FFB7AC", "#C7DF8C", "#C4C5FF", "#A4DEAA",
] as const;

export const formatColorPresentation = Object.fromEntries(
  formatColors.map((id, index) => [id, {
    lightSurface: id,
    lightMarker: darkSurfaces[index],
    darkSurface: darkSurfaces[index],
    darkMarker: darkMarkers[index],
  }]),
) as Record<(typeof formatColors)[number], { lightSurface: string; lightMarker: string; darkSurface: string; darkMarker: string }>;

export function formatColorStyle(color: string): CSSProperties {
  const presentation = formatColorPresentation[color as (typeof formatColors)[number]];
  return {
    "--format-color": color,
    "--format-surface-light": presentation?.lightSurface ?? color,
    "--format-marker-light": presentation?.lightMarker ?? "#20242C",
    "--format-surface-dark": presentation?.darkSurface ?? "#22262D",
    "--format-marker-dark": presentation?.darkMarker ?? "#A9CBFF",
  } as CSSProperties;
}
