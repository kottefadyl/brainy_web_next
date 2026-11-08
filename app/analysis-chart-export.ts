/** Exports are meant for reports: always the light palette, whatever theme is on screen. */
const REPORT_COLORS: Record<string, string> = {
  "--ink": "#0E1116",
  "--muted": "#586070",
  "--line": "#E4E7EC",
  "--surface": "#FFFFFF",
  "--series-main": "#2463CE",
  "--series-comparison": "#0F8F72",
};
const NS = "http://www.w3.org/2000/svg";
const HEADER = 40;
const FOOTER = 34;
export type ExportLegendItem = { label: string; color: string; dashed: boolean };

const resolveColors = (value: string) => value.replace(/var\((--[\w-]+)\)/g, (_, name: string) => REPORT_COLORS[name] ?? "#000000");

function text(content: string, x: number, y: number, size: number, fill: string, weight = "400"): SVGTextElement {
  const element = document.createElementNS(NS, "text");
  element.textContent = content;
  for (const [name, value] of Object.entries({ x, y, fill, "font-size": size, "font-weight": weight })) element.setAttribute(name, String(value));
  return element;
}

/** A standalone SVG with its title and legend, and none of the interactive layers. */
export function buildChartSvg(source: SVGSVGElement, title: string, legend: ExportLegendItem[]): { markup: string; width: number; height: number } {
  const { width, height: plotHeight } = source.viewBox.baseVal;
  const height = HEADER + plotHeight + FOOTER;
  const copy = source.cloneNode(true) as SVGSVGElement;
  copy.querySelectorAll("[data-export-skip]").forEach((element) => element.remove());
  for (const element of [copy, ...copy.querySelectorAll("*")]) {
    for (const name of ["class", "role", "tabindex", "aria-label", "pathLength", "pathlength"]) element.removeAttribute(name);
    for (const attribute of [...element.attributes]) if (attribute.value.includes("var(")) attribute.value = resolveColors(attribute.value);
  }
  const root = document.createElementNS(NS, "svg");
  for (const [name, value] of Object.entries({ xmlns: NS, width, height, viewBox: `0 0 ${width} ${height}`, "font-family": "Inter, 'Segoe UI', Arial, sans-serif" })) root.setAttribute(name, String(value));
  const background = document.createElementNS(NS, "rect");
  for (const [name, value] of Object.entries({ width, height, fill: REPORT_COLORS["--surface"] })) background.setAttribute(name, String(value));
  root.append(background, text(title, 16, 26, 16, REPORT_COLORS["--ink"], "600"));
  const plot = document.createElementNS(NS, "g");
  plot.setAttribute("transform", `translate(0 ${HEADER})`);
  plot.append(...copy.childNodes);
  root.append(plot);
  let x = 16;
  const y = height - 14;
  for (const item of legend) {
    const key = document.createElementNS(NS, "line");
    for (const [name, value] of Object.entries({ x1: x, x2: x + 22, y1: y - 4, y2: y - 4, stroke: resolveColors(item.color), "stroke-width": 2 })) key.setAttribute(name, String(value));
    if (item.dashed) key.setAttribute("stroke-dasharray", "6 5");
    root.append(key, text(item.label, x + 28, y, 13, REPORT_COLORS["--muted"]));
    x += 28 + item.label.length * 7 + 24;
  }
  return { markup: new XMLSerializer().serializeToString(root), width, height };
}

function saveBlob(name: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const saveText = (name: string, content: string, type: string) => saveBlob(name, new Blob([content], { type }));

/** Draws the SVG on a canvas at twice its size. */
export async function saveSvgAsPng(name: string, svg: { markup: string; width: number; height: number }): Promise<void> {
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("The chart image could not be prepared"));
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.markup)}`;
  });
  const canvas = document.createElement("canvas");
  canvas.width = svg.width * 2;
  canvas.height = svg.height * 2;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable");
  context.scale(2, 2);
  context.drawImage(image, 0, 0, svg.width, svg.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("The chart image could not be encoded");
  saveBlob(name, blob);
}
