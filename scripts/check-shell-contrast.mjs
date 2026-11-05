import { readFileSync } from "node:fs";

const theme = readFileSync(new URL("../app/theme.css", import.meta.url), "utf8");
const light = theme.match(/:root\s*\{([^}]+)\}/)?.[1];
const dark = theme.match(/html\[data-theme="dark"\]\s*\{([^}]+)\}/)?.[1];
if (!light || !dark) throw new Error("Theme token blocks missing");

function token(block, name) {
  const value = block.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1]?.trim();
  if (!value) throw new Error(`Missing token --${name}`);
  return value;
}
function channels(color) {
  if (color.startsWith("#")) return [1, 3, 5].map((offset) => Number.parseInt(color.slice(offset, offset + 2), 16));
  const parts = color.match(/^rgba?\(([^)]+)\)$/)?.[1].split(",").map((part) => Number(part.trim()));
  if (!parts || parts.length < 3) throw new Error(`Unsupported color ${color}`);
  return parts;
}
function composite(foreground, background) {
  const fg = channels(foreground), bg = channels(background), alpha = fg[3] ?? 1;
  return fg.slice(0, 3).map((channel, index) => channel * alpha + bg[index] * (1 - alpha));
}
function luminance(color) {
  const rgb = Array.isArray(color) ? color : channels(color);
  return rgb.slice(0, 3).map((value) => {
    const normalized = value / 255;
    return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
}
function ratio(a, b) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + 0.05) / (values[1] + 0.05);
}
let failures = 0;
for (const [mode, block] of [["light", light], ["dark", dark]]) {
  const get = (name) => token(block, name);
  const sidebar = get("sidebar-surface"), canvas = get("canvas"), surface = get("surface");
  const selectedSidebar = composite(get("accent-soft"), sidebar);
  const selectedTab = composite(get("accent-soft"), canvas);
  const checks = [
    ["sidebar inactive text", get("muted"), sidebar, 4.5],
    ["sidebar active text", get("ink"), selectedSidebar, 4.5],
    ["sidebar hover text", get("ink"), get("hover"), 4.5],
    ["sidebar count", get("muted"), selectedSidebar, 4.5],
    ["tab inactive text", get("muted"), canvas, 4.5],
    ["tab active text", get("ink"), selectedTab, 4.5],
    ["tonal button text", get("blue-dark"), selectedSidebar, 4.5],
    ["tonal button hover text", get("blue-dark"), get("hover"), 4.5],
    ["breadcrumb", get("muted"), surface, 4.5],
    ["breadcrumb current", get("ink"), surface, 4.5],
    ["search border", get("control-border"), surface, 3],
    ["focus on sidebar", get("focus"), sidebar, 3],
    ["active indicator", get("blue"), selectedSidebar, 3],
    ["primary button text", get("on-primary"), get("blue"), 4.5],
  ];
  for (const [name, foreground, background, minimum] of checks) {
    const value = ratio(foreground, background);
    console.log(`${mode} ${name}: ${value.toFixed(2)}:1 (target ${minimum}:1)`);
    if (value < minimum) failures++;
  }
}
if (failures) process.exitCode = 1;
