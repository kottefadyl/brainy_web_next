import { readFileSync } from "node:fs";

const theme = readFileSync(new URL("../app/theme.css", import.meta.url), "utf8");
const colors = readFileSync(new URL("../lib/format-colors.ts", import.meta.url), "utf8");
const model = readFileSync(new URL("../lib/brainy.ts", import.meta.url), "utf8");
const blocks = [theme.match(/:root\s*\{([^}]+)\}/)?.[1], theme.match(/html\[data-theme="dark"\]\s*\{([^}]+)\}/)?.[1]];
if (blocks.some((block) => !block)) throw new Error("Theme token blocks missing");
const token = (block, name) => block.match(new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})`))?.[1];
const hexes = (source) => [...source.matchAll(/"(#[0-9A-Fa-f]{6})"/g)].map((match) => match[1]);
const array = (source, name) => hexes(source.match(new RegExp(`(?:const|export const) ${name} = \\[([^\\]]+)\\]`))?.[1] ?? "");
const lightFormats = array(model, "formatColors");
const darkSurfaces = array(colors, "darkSurfaces");
const darkMarkers = array(colors, "darkMarkers");
if ([lightFormats, darkSurfaces, darkMarkers].some((values) => values.length !== 24)) throw new Error("Expected 24 format colors in every table");
const luminance = (hex) => {
  const rgb = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255);
  return rgb.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
};
const ratio = (a, b) => { const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (high + 0.05) / (low + 0.05); };
let failed = false;
function check(label, values, minimum) {
  const low = Math.min(...values);
  console.log(`${label}: ${low.toFixed(2)}:1 minimum (target ${minimum}:1)`);
  if (low < minimum) failed = true;
}
for (const [index, block] of blocks.entries()) {
  const mode = index === 0 ? "light" : "dark";
  const surface = token(block, "surface");
  const text = token(block, "ink");
  const muted = token(block, "muted");
  const border = token(block, "control-border");
  const focus = token(block, "focus");
  const chart = Array.from({ length: 8 }, (_, chartIndex) => token(block, `chart-${chartIndex + 1}`));
  if ([surface, text, muted, border, focus, ...chart].some((value) => !value)) throw new Error(`Missing ${mode} token`);
  check(`${mode} text`, [ratio(text, surface), ratio(muted, surface)], 4.5);
  check(`${mode} control/focus`, [ratio(border, surface), ratio(focus, surface)], 3);
  check(`${mode} chart series`, chart.map((value) => ratio(value, surface)), 3);
}
check("light format text", lightFormats.flatMap((background) => [ratio(token(blocks[0], "ink"), background), ratio(token(blocks[0], "muted"), background)]), 4.5);
check("light format marker", lightFormats.map((background, index) => ratio(darkSurfaces[index], background)), 3);
check("dark format text", darkSurfaces.map((background) => ratio(token(blocks[1], "ink"), background)), 4.5);
check("dark format marker", darkSurfaces.map((background, index) => ratio(darkMarkers[index], background)), 3);
if (failed) process.exitCode = 1;
