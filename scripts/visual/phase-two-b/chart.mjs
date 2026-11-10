// Interactive analysis chart. Run after check.mjs --prepare, with the dev server and the
// dedicated Chrome from README.md. Synthetic data only.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { clampWindow, isZoomed, shiftWindow, zoomWindow } from "../../../lib/chart-zoom.ts";
import { alignSeries, chartCsv, chooseAxisTicks, deltaPercent, lttbIndices, niceScale, splitCrossTab } from "../../../lib/chart-math.ts";

// Pure logic first: it needs neither a browser nor a server.
assert.deepEqual(lttbIndices([1, 2, 3], 10), [0, 1, 2]);
{
  const spike = Array.from({ length: 1000 }, (_, i) => (i === 512 ? 5000 : i % 2));
  const kept = lttbIndices(spike, 100);
  assert.equal(kept.length, 100);
  assert.ok(kept.includes(512), "a peak survives the sampling");
  assert.deepEqual([kept[0], kept.at(-1)], [0, 999]);
  assert.deepEqual(kept, [...kept].sort((a, b) => a - b));
}
assert.equal(deltaPercent(150, 100), 50);
assert.equal(deltaPercent(50, -100), 150, "a change from a negative value uses its magnitude");
assert.equal(deltaPercent(5, 0), null);
assert.equal(deltaPercent(5, undefined), null);
{
  const scale = niceScale([12450, 18250]);
  assert.equal(scale.low, 0);
  assert.ok(scale.high >= 18250);
  assert.deepEqual(niceScale([0.01, 0.04]).high, 0.04);
  assert.ok(niceScale([-5, 20]).low <= -5, "negative values stay on the scale");
  assert.equal(niceScale([0, 0]).high > 0, true);
}
const row = (group, value, count = 1) => ({ group, label: group, value, count, sources: [], sourcesHasMore: false });
{
  const byPeriod = alignSeries([row("2026-01", "1"), row("2026-02", "2")], [row("2025-01", "9"), row("2025-02", "8")]);
  assert.deepEqual(byPeriod.map((slot) => slot.comparison.row.group), ["2025-01", "2025-02"], "periods align by position");
  assert.equal(byPeriod[1].delta, 100);
  const byKey = alignSeries([row("A", "1"), row("B", "2")], [row("B", "7"), row("C", "3")]);
  assert.deepEqual(byKey.map((slot) => [slot.key, slot.main?.value, slot.comparison?.value]), [["A", 1, undefined], ["B", 2, 7], ["C", undefined, 3]], "categories align by key and none is lost");
  const csv = chartCsv([row("=cmd()", "-3.5", 2)], undefined, "EUR", "fr").split("\r\n");
  assert.equal(csv[0], '"Groupe","Libellé","Valeur","Unité","Nombre"');
  assert.equal(csv[1], `"'=cmd()","'=cmd()","-3.5","EUR",2`, "a label cannot run as a formula and a negative value stays a number");
  assert.ok(chartCsv([row("A", "1")], [row("B", "2")], undefined, "en").split("\r\n")[0].endsWith('"Series"'));
}
{
  const days = [0, 3, 40, 41, 75, 120, 200, 300, 400, 499].map((i) => new Date(Date.UTC(2025, 0, 1 + i)).toISOString().slice(0, 10));
  const ticks = chooseAxisTicks(days, days.map((_, i) => 20 + i * 100), "en");
  assert.ok(ticks.length >= 3, "a thinned series still gets calendar ticks");
  assert.equal(new Set(ticks.map((tick) => tick.label)).size, ticks.length, "no repeated tick");
}
{
  // Period × category cross-tabulations become one series per category (T23/2).
  const cell = (period, key, label, value) => ({ group: `${period} × ${key}`, label: `${period} × ${label}`, rowKey: period, columnKey: key, value: String(value), count: 1, sources: [], sourcesHasMore: false });
  const cells = ["2026-02", "2026-01"].flatMap((period) => [["a", "Alpha × bêta", 1], ["b", "B", 50], ["c", "C", -30], ["d", "D", 5], ["e", "E", 2]].map(([key, label, value]) => cell(period, key, label, value)));
  const split = splitCrossTab([...cells, cell("Missing date", "a", "Alpha × bêta", 9)], "MONTH", "CATEGORY");
  assert.deepEqual(split.periods, ["2026-01", "2026-02"], "periods in calendar order");
  assert.deepEqual(split.series.map((series) => series.key), ["b", "c", "d", "e"], "the four largest totals, by magnitude");
  assert.equal(split.hiddenSeries, 1);
  assert.equal(split.skippedRows, 1, "a value without a date is counted, not drawn");
  const swapped = splitCrossTab([cell("2026-01", "a", "Alpha × bêta", 1), cell("2026-02", "a", "Alpha × bêta", 2)].map((row) => ({ ...row, rowKey: row.columnKey, columnKey: row.rowKey, label: `Alpha × bêta × ${row.rowKey}` })), "CATEGORY", "MONTH");
  assert.equal(swapped.series[0].label, "Alpha × bêta", "a label containing × survives when the period is the second axis");
  assert.deepEqual(swapped.series[0].points.map((point) => point.value), [1, 2]);
  assert.equal(splitCrossTab(cells, "CATEGORY", "OBJECT"), null, "no period axis, no series chart");
  const gap = splitCrossTab([cell("2026-01", "a", "A", 1), cell("2026-02", "b", "B", 1)], "MONTH", "CATEGORY");
  assert.equal(gap.series[0].points[1], undefined, "a missing cell is a gap, not a zero");
}
{
  // Zoom windows (T23/4).
  assert.deepEqual(zoomWindow({ start: 0, end: 12 }, 12, 0.5), { start: 3, end: 9 }, "zoom in keeps the centre");
  assert.deepEqual(zoomWindow({ start: 0, end: 12 }, 12, 0.5, 0), { start: 0, end: 6 }, "anchor on the left edge stays there");
  assert.deepEqual(zoomWindow({ start: 0, end: 12 }, 12, 0.1), { start: 4, end: 9 }, "never narrower than five points");
  assert.deepEqual(zoomWindow({ start: 0, end: 3 }, 3, 0.5), { start: 0, end: 3 }, "a short series cannot zoom in");
  assert.deepEqual(zoomWindow({ start: 8, end: 12 }, 12, 4), { start: 0, end: 12 }, "zoom out stops at the whole series");
  assert.deepEqual(shiftWindow({ start: 3, end: 9 }, 12, 10), { start: 6, end: 12 }, "panning stops at the end");
  assert.deepEqual(shiftWindow({ start: 3, end: 9 }, 12, -10), { start: 0, end: 6 });
  assert.deepEqual(clampWindow({ start: 0, end: 12 }, 7), { start: 0, end: 7 }, "fewer rows shrink the window");
  assert.equal(isZoomed({ start: 0, end: 12 }, 12), false);
}
console.log("PASS: chart logic.");
if (process.argv.includes("--logic")) process.exit(0);

const output = new URL("../../../.visual-checks/chart/", import.meta.url);
await mkdir(output, { recursive: true });
const targets = await (await fetch("http://127.0.0.1:9226/json")).json();
const ws = new WebSocket(targets.find((target) => target.type === "page").webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
let serial = 0;
const pending = new Map();
const errors = [];
ws.onmessage = ({ data }) => {
  const message = JSON.parse(data), item = pending.get(message.id);
  if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
  if (!item) return;
  pending.delete(message.id); clearTimeout(item.timer);
  if (message.error) item.reject(Error(message.error.message)); else item.resolve(message.result);
};
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++serial;
  const timer = setTimeout(() => reject(Error(`Timeout: ${method}`)), 30000);
  pending.set(id, { resolve, reject, timer }); ws.send(JSON.stringify({ id, method, params }));
});
const pause = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));
async function evaluate(expression) {
  const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw Error(`${expression.slice(0, 160)}: ${JSON.stringify(result.exceptionDetails).slice(0, 400)}`);
  return result.result.value;
}
const codes = { Tab: 9, Escape: 27, Home: 36, End: 35, ArrowLeft: 37, ArrowRight: 39 };
async function press(key) {
  await send("Input.dispatchKeyEvent", { type: "rawKeyDown", key, code: key, windowsVirtualKeyCode: codes[key] });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key, code: key, windowsVirtualKeyCode: codes[key] });
  await pause();
}
async function capture(name) {
  const { data } = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await writeFile(new URL(`${name}.png`, output), Buffer.from(data, "base64"));
}
async function mouseTo(selector, index = 0) {
  await evaluate(`document.querySelectorAll(${JSON.stringify(selector)})[${index}].scrollIntoView({block:'center'})`);
  await pause(160);
  const point = await evaluate(`(()=>{const r=document.querySelectorAll(${JSON.stringify(selector)})[${index}].getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", ...point });
  await pause(200);
  return point;
}
async function clickAt(selector, index = 0) {
  const point = await mouseTo(selector, index);
  await send("Input.dispatchMouseEvent", { type: "mousePressed", ...point, button: "left", clickCount: 1 });
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", ...point, button: "left", clickCount: 1 });
  await pause(220);
}
const helpers = String.raw`
const rgb=s=>s.match(/[\d.]+/g).map(Number);
const lum=c=>c.slice(0,3).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4}).reduce((s,x,i)=>s+x*[.2126,.7152,.0722][i],0);
const flat=(c,b,o=1)=>{const a=(c[3]??1)*o;return c.slice(0,3).map((v,i)=>v*a+b[i]*(1-a))};
const under=e=>{const layers=[];for(let n=e;n;n=n.parentElement){const c=rgb(getComputedStyle(n).backgroundColor);if((c[3]??1)>0)layers.push(c);if((c[3]??1)===1)break}return layers.reduceRight((b,c)=>flat(c,b),[255,255,255])};
const ratio=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
`;
const layout = () => evaluate(`(()=>{const d=document.documentElement,c=document.querySelector('.analysis-line-chart');return {page:d.scrollWidth-innerWidth,chart:c.scrollWidth-c.clientWidth,right:c.getBoundingClientRect().right-innerWidth}})()`);
async function assertLayout(where) {
  const state = await layout();
  assert(state.page <= 0 && state.chart <= 2 && state.right <= 0, `${where}: overflow ${JSON.stringify(state)}`);
}
const tipState = () => evaluate(`(()=>{const t=document.querySelector('.analysis-tooltip'),r=t.getBoundingClientRect(),c=document.querySelector('.analysis-line-chart').getBoundingClientRect();const trend=t.querySelector('em');return {open:t.dataset.open==='true',text:t.textContent,inside:r.left>=c.left-1&&r.right<=c.right+1&&r.left>=0&&r.right<=innerWidth,trend:trend?.dataset.trend,bg:getComputedStyle(t).backgroundColor}})()`);
const installDownloadTrap = () => evaluate(`(()=>{window.__saved=[];const create=URL.createObjectURL.bind(URL);URL.createObjectURL=b=>{const u=create(b);window.__last=b;return u};const click=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(this.download){window.__saved.push({name:this.download,blob:window.__last});return}click.call(this)};})()`);
const lastDownload = () => evaluate(`(async()=>{const s=window.__saved.at(-1);if(!s)return null;const buffer=await s.blob.arrayBuffer();return {name:s.name,type:s.blob.type,size:s.blob.size,text:s.blob.type.startsWith('image/png')?'':new TextDecoder().decode(buffer)}})()`);
const showView = async (name) => { await evaluate(`[...document.querySelectorAll('.preview-controls button')].find(b=>b.textContent===${JSON.stringify(name)}).click()`); await pause(320); };
const exportAs = async (index) => {
  await evaluate("document.querySelector('.analysis-line-chart .format-menu-trigger').click()");
  await pause(180);
  const fits = await evaluate("(()=>{const m=document.querySelector('.analysis-line-chart .format-card-menu'),r=m.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight&&m.matches(':popover-open')})()");
  assert(fits, "export menu inside the window");
  await evaluate(`document.querySelectorAll('.analysis-line-chart .format-card-menu button')[${index}].click()`);
  await pause(450);
};

async function compareScenario(language, theme, tag) {
  const fr = language === "fr";
  await showView("compare");
  await assertLayout(`${tag} compare`);
  assert.equal(await evaluate("document.querySelectorAll('.analysis-line-chart polyline').length"), 2, "both series drawn");
  assert.equal(await evaluate("document.querySelector('.analysis-line-comparison').getAttribute('stroke-dasharray')"), "6 5", "comparison is dashed");
  assert.ok(await evaluate("!document.querySelector('.analysis-line-chart title')"), "no native title");
  assert.ok(await evaluate("document.querySelector('.analysis-line-chart linearGradient') && [...document.querySelectorAll('.analysis-line-chart path')].some(p=>p.getAttribute('fill')?.startsWith('url('))"), "area fill");
  const contrast = await evaluate(`(()=>{${helpers};const c=document.querySelector('.analysis-line-chart'),b=under(c),line=rgb(getComputedStyle(c.querySelector('.analysis-line-path')).stroke),dash=flat(rgb(getComputedStyle(c.querySelector('.analysis-line-comparison')).stroke),b,.85);return {main:ratio(line,b),comparison:ratio(dash,b),axis:ratio(rgb(getComputedStyle(c.querySelector('.analysis-axis-label')).fill),b)}})()`);
  assert(contrast.main >= 3 && contrast.comparison >= 3 && contrast.axis >= 4.5, `${tag} contrast ${JSON.stringify(contrast)}`);

  // Hover: value, full date, entries, variation (Feb versus Jan: +10.8 %).
  await mouseTo(".analysis-chart-target", 1);
  let tip = await tipState();
  assert(tip.open && tip.inside, `${tag} tooltip ${JSON.stringify(tip)}`);
  assert.match(tip.text.replace(/\s/g, " "), fr ? /13 800,00 EUR/ : /13,800\.00 EUR/);
  assert.match(tip.text, fr ? /février 2026/ : /February 2026/);
  assert.match(tip.text, fr ? /43 entrées/ : /43 entries/);
  assert.match(tip.text.replace(/\s/g, " "), fr ? /\+10,8 %/ : /\+10\.8 %/);
  assert.equal(tip.trend, "up");
  assert.match(tip.text, fr ? /février 2025/ : /February 2025/, "the compared period is in the same tooltip");
  await capture(`${tag}-tooltip`);
  const tipContrast = await evaluate(`(()=>{${helpers};const t=document.querySelector('.analysis-tooltip'),e=t.querySelector('em');return {up:ratio(rgb(getComputedStyle(e).color),flat(rgb(getComputedStyle(e).backgroundColor),under(t))),muted:ratio(rgb(getComputedStyle(t.querySelector('.analysis-tooltip-label')).color),under(t))}})()`);
  assert(tipContrast.up >= 4.5 && tipContrast.muted >= 4.5, `${tag} tooltip contrast ${JSON.stringify(tipContrast)}`);
  // A fall gives a red badge, and edge points keep the tooltip inside the chart.
  await mouseTo(".analysis-chart-target", 2);
  assert.equal((await tipState()).trend, "down");
  for (const edge of [0, 11]) { await mouseTo(".analysis-chart-target", edge); tip = await tipState(); assert(tip.open && tip.inside, `${tag} edge ${edge}`); }
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 1, y: 1 });
  await pause(200);
  assert.equal((await tipState()).open, false, "leaving the chart closes the tooltip");

  // Keyboard: one tab stop, arrows move, Escape hides.
  assert.equal(await evaluate("document.querySelectorAll('.analysis-chart-target[tabindex=\"0\"]').length"), 1, "a single tab stop");
  await evaluate("document.querySelector('.analysis-chart-target[tabindex=\"0\"]').focus()");
  await pause();
  await press("Home");
  assert.match((await tipState()).text, fr ? /janvier 2026/ : /January 2026/);
  await press("ArrowRight");
  tip = await tipState();
  assert.match(tip.text, fr ? /février 2026/ : /February 2026/, "arrow moves the point");
  const focused = await evaluate(`(()=>{${helpers};const a=document.activeElement,s=getComputedStyle(a);return {cls:a.getAttribute('class'),name:a.getAttribute('aria-label'),width:parseFloat(s.outlineWidth),style:s.outlineStyle,ring:ratio(rgb(s.outlineColor),under(document.querySelector('.analysis-line-chart')))}})()`);
  assert.equal(focused.cls, "analysis-chart-target");
  assert(focused.style !== "none" && focused.width >= 2 && focused.ring >= 3, `${tag} focus ${JSON.stringify(focused)}`);
  assert.match(focused.name, /EUR/, "the focused point has a spoken description");
  await press("End");
  assert.match((await tipState()).text, fr ? /décembre 2026/ : /December 2026/);
  await press("Escape");
  assert.equal((await tipState()).open, false, "Escape hides the tooltip");
  await evaluate("document.activeElement.blur()");

  // Legend isolates, then restores.
  await clickAt(".analysis-legend-item", 1);
  assert.deepEqual(await evaluate("[document.querySelectorAll('.analysis-line-path').length,document.querySelectorAll('.analysis-line-comparison').length,document.querySelectorAll('.analysis-legend-item')[1].getAttribute('aria-pressed')]"), [0, 1, "true"], "comparison isolated");
  await clickAt(".analysis-legend-item", 1);
  await clickAt(".analysis-legend-item", 0);
  assert.deepEqual(await evaluate("[document.querySelectorAll('.analysis-line-path').length,document.querySelectorAll('.analysis-line-comparison').length]"), [1, 0], "main isolated");
  await clickAt(".analysis-legend-item", 0);
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 1, y: 1 });
  await pause(150);

  // Bars.
  await capture(`${tag}-line`);
  await evaluate("document.querySelectorAll('.analysis-view-switch:not(.analysis-zoom-switch) button')[1].click()");
  await pause(240);
  assert.equal(await evaluate("document.querySelectorAll('.analysis-view-switch:not(.analysis-zoom-switch) button')[1].getAttribute('aria-pressed')"), "true");
  const bars = await evaluate("(()=>{const b=[...document.querySelectorAll('.analysis-chart-rect')];return {count:b.length,maxWidth:Math.max(...b.map(e=>e.getBBox().width)),polylines:document.querySelectorAll('.analysis-line-chart polyline').length}})()");
  assert(bars.count >= 22 && bars.maxWidth <= 24.01 && bars.polylines === 0, `${tag} bars ${JSON.stringify(bars)}`);
  await assertLayout(`${tag} bars`);
  await mouseTo(".analysis-chart-target", 3);
  assert((await tipState()).open, "bar tooltip");
  await capture(`${tag}-bars`);
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 1, y: 1 });
  await pause(120);

  // Exports.
  const widthBefore = await evaluate("document.querySelector('.analysis-chart-plot').viewBox.baseVal.width");
  await exportAs(0);
  const svg = await lastDownload();
  assert.match(svg.name, /^brainy-chart-\d{4}-\d{2}-\d{2}\.svg$/);
  assert.equal(svg.type, "image/svg+xml");
  assert(!svg.text.includes("var(") && !svg.text.includes("tabindex") && !svg.text.includes("data-export-skip"), "standalone SVG");
  assert.match(svg.text, /viewBox="0 0 960 /, "report width");
  assert.match(svg.text, />Sum</, "title included");
  assert.match(svg.text, /#FFFFFF/, "light report background");
  assert.equal(await evaluate("document.querySelector('.analysis-chart-plot').viewBox.baseVal.width"), widthBefore, "the chart keeps its size on screen");
  const parsed = await evaluate(`new DOMParser().parseFromString(${JSON.stringify(svg.text)},'image/svg+xml').querySelector('parsererror')===null`);
  assert(parsed, "valid XML");
  await exportAs(1);
  const png = await lastDownload();
  assert.equal(png.type, "image/png");
  const size = await evaluate("(async()=>{const b=await createImageBitmap(window.__saved.at(-1).blob);return [b.width,b.height]})()");
  assert.deepEqual(size, [1920, (40 + 210 + 34) * 2], "PNG at twice the report size");
  await exportAs(2);
  const csv = await lastDownload();
  const lines = csv.text.replace(/^﻿/, "").split("\r\n");
  assert.equal(lines.length, 25, "header, 12 rows and 12 compared rows");
  assert.equal(lines[0], fr ? '"Groupe","Libellé","Valeur","Unité","Nombre","Série"' : '"Group","Label","Value","Unit","Count","Series"');
  assert.equal(lines[1].split(",")[2], '"12450"', "exact value");
  assert.equal(await evaluate("document.querySelector('.analysis-line-chart .form-error')"), null, "no export error");
  await evaluate("document.querySelectorAll('.analysis-view-switch:not(.analysis-zoom-switch) button')[0].click()");
  await pause(160);
}

async function denseScenario(tag) {
  await showView("dense");
  await assertLayout(`${tag} dense`);
  const dense = await evaluate(`(()=>{const c=document.querySelector('.analysis-line-chart'),path=c.querySelector('.analysis-line-path'),icons=[...c.querySelectorAll('.analysis-chart-tools svg')].map(e=>e.getBoundingClientRect().width),labels=[...c.querySelectorAll('.analysis-axis-label')].map(e=>e.getBoundingClientRect()).sort((a,b)=>a.left-b.left);return {icons:Math.max(...icons),targets:c.querySelectorAll('.analysis-chart-target').length,points:path.points.numberOfItems,labels:labels.length,overlap:labels.some((r,i)=>i&&r.left<labels[i-1].right),out:labels.some(r=>r.left<0||r.right>innerWidth),note:c.querySelector('.analysis-chart-note')?.textContent,nodes:c.querySelectorAll('svg *').length,top:Math.min(...[...path.points].map(p=>p.y)),length:path.getTotalLength()}})()`);
  assert(dense.icons <= 18 && dense.targets <= 100 && dense.points <= 100 && dense.nodes < 500, `${tag} DOM ${JSON.stringify(dense)}`);
  assert(dense.labels >= 3, `${tag} x ticks ${dense.labels}`);
  assert(!dense.overlap && !dense.out, `${tag} x labels ${JSON.stringify(dense)}`);
  assert.match(dense.note, /100/);
  assert(dense.top < 60, `the peak of 900 is drawn near the top (y=${dense.top})`);
  await capture(`${tag}-dense`);
  // Series longer than the former dash length must still be drawn to the end.
  const drawn = await evaluate("new Promise(r=>setTimeout(()=>{const p=document.querySelector('.analysis-line-path'),s=getComputedStyle(p);r({pathLength:p.getAttribute('pathLength'),offset:parseFloat(s.strokeDashoffset),dash:s.strokeDasharray})},600))");
  assert.equal(drawn.offset, 0, JSON.stringify(drawn));
  assert.equal(drawn.pathLength, "1500", "dash is relative to the whole line");
}

async function zoomScenario(language, tag) {
  const fr = language === "fr";
  const zoomButton = (index) => `document.querySelectorAll('.analysis-line-chart .analysis-zoom-switch button')[${index}]`;
  const slider = () => evaluate("(()=>{const s=document.querySelector('.analysis-scrubber');return s?{now:+s.getAttribute('aria-valuenow'),max:+s.getAttribute('aria-valuemax'),text:s.getAttribute('aria-valuetext'),height:s.getBoundingClientRect().height}:null})()");
  await showView("compare");
  assert.equal(await slider(), null, "no scroll bar before zooming");
  assert.equal(await evaluate(`${zoomButton(1)}.disabled`), true, "zoom out is unavailable at full width");
  await evaluate(`${zoomButton(0)}.click()`);
  await pause(200);
  let state = await slider();
  assert.deepEqual([state.now, state.max], [3, 6], `${tag} zoom in keeps the centre: ${JSON.stringify(state)}`);
  assert(state.height >= 44, `${tag} scroll bar target`);
  assert.match(state.text, fr ? /avril 2026 – septembre 2026/ : /April 2026 – September 2026/);
  assert.equal(await evaluate("document.querySelectorAll('.analysis-line-chart .analysis-chart-target').length"), 6);
  assert.match(await evaluate("document.querySelector('.analysis-line-chart .analysis-chart-note').textContent"), fr ? /Zoom : 6 points sur 12/ : /Zoomed: 6 of 12 points/);
  await assertLayout(`${tag} zoomed`);
  await capture(`${tag}-zoom`);
  // Scroll bar by keyboard, then mouse drag on the plot pans back.
  await evaluate("document.querySelector('.analysis-scrubber').focus()");
  await press("End");
  assert.equal((await slider()).now, 6, "End shows the last periods");
  await evaluate("document.activeElement.blur()");
  const box = await evaluate("(()=>{const r=document.querySelector('.analysis-line-chart .analysis-chart-plot').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,w:r.width}})()");
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: box.x, y: box.y, button: "left", buttons: 1, clickCount: 1 });
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: box.x + box.w / 3, y: box.y, button: "left", buttons: 1 });
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: box.x + box.w / 3, y: box.y, button: "left", buttons: 0, clickCount: 1 });
  await pause(200);
  assert((await slider()).now < 6, `${tag} drag pans to earlier periods`);
  // Keyboard on a point: + zooms around it, 0 shows everything again.
  await evaluate("document.querySelector('.analysis-line-chart .analysis-chart-target[tabindex=\"0\"]').focus()");
  await press("Home");
  await evaluate("document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'0',bubbles:true}))");
  await pause(200);
  assert.equal(await slider(), null, "0 resets the zoom");
  await evaluate("document.querySelector('.analysis-line-chart .analysis-chart-target[tabindex=\"0\"]').focus()");
  await evaluate("document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'+',bubbles:true}))");
  await pause(200);
  assert.ok(await slider(), "+ zooms in");
  await evaluate(`${zoomButton(2)}.click()`);
  await pause(200);
  assert.equal(await slider(), null, "Show all resets");
  // Ctrl + wheel on a dense series zooms in under the pointer; a plain wheel does not.
  await showView("dense");
  const dense = await evaluate("(()=>{const r=document.querySelector('.analysis-line-chart .analysis-chart-plot').getBoundingClientRect();return {x:r.x+r.width*0.5,y:r.y+r.height/2}})()");
  await send("Input.dispatchMouseEvent", { type: "mouseWheel", x: dense.x, y: dense.y, deltaX: 0, deltaY: 120 });
  await pause(200);
  assert.equal(await slider(), null, "a plain wheel leaves the zoom alone");
  await send("Input.dispatchMouseEvent", { type: "mouseWheel", x: dense.x, y: dense.y, deltaX: 0, deltaY: -300, modifiers: 2 });
  await pause(250);
  state = await slider();
  assert(state && state.max > 0, `${tag} ctrl + wheel zooms in`);
  const notes = await evaluate("[...document.querySelectorAll('.analysis-line-chart .analysis-chart-note')].map(n=>n.textContent).join(' | ')");
  assert.doesNotMatch(notes, fr ? /simplifiée/ : /Simplified/, `${tag} a narrow window shows every point: ${notes}`);
  await assertLayout(`${tag} dense zoom`);
  await capture(`${tag}-zoom-dense`);
  await evaluate(`${zoomButton(2)}.click()`);
  await pause(150);
  // Several series zoom the same way.
  await showView("multi");
  await evaluate(`${zoomButton(0)}.click()`);
  await pause(200);
  assert.equal(await evaluate("document.querySelectorAll('.analysis-multi-chart .analysis-chart-target').length"), 6, "multi chart zooms");
  await assertLayout(`${tag} multi zoom`);
  await evaluate(`${zoomButton(2)}.click()`);
  await pause(150);
}

async function multiScenario(language, tag) {
  const fr = language === "fr";
  await showView("multi");
  await assertLayout(`${tag} multi`);
  const drawn = await evaluate("(()=>{const c=document.querySelector('.analysis-multi-chart');return {lines:c.querySelectorAll('polyline.analysis-line-path').length,dashes:[...new Set([...c.querySelectorAll('polyline.analysis-line-path')].map(p=>p.getAttribute('stroke-dasharray')??'solid'))].length,legend:c.querySelectorAll('.analysis-legend-item').length,note:[...c.querySelectorAll('.analysis-chart-note')].map(n=>n.textContent).join(' | ')}})()");
  assert(drawn.lines >= 4 && drawn.dashes === 4 && drawn.legend === 4, `${tag} series ${JSON.stringify(drawn)}`);
  assert.match(drawn.note, fr ? /4 catégories sur 6/ : /4 of 6 categories/);
  assert.match(drawn.note, fr ? /1 valeur sans date/ : /1 value without a date/);
  const contrast = await evaluate(`(()=>{${helpers};const c=document.querySelector('.analysis-multi-chart'),b=under(c);return [...c.querySelectorAll('polyline.analysis-line-path')].map(p=>ratio(rgb(getComputedStyle(p).stroke),b))})()`);
  assert(contrast.every((value) => value >= 3), `${tag} series contrast ${JSON.stringify(contrast)}`);
  const legendFit = await evaluate("(()=>{const r=[...document.querySelectorAll('.analysis-multi-chart .analysis-legend-item')].map(e=>e.getBoundingClientRect());return r.every(x=>x.right<=innerWidth&&x.height>=44)})()");
  assert(legendFit, `${tag} legend targets`);
  // February has no tea: the tooltip says so instead of showing zero.
  await mouseTo(".analysis-multi-chart .analysis-chart-target", 1);
  const tip = await tipState();
  assert(tip.open && tip.inside, `${tag} multi tooltip ${JSON.stringify(tip)}`);
  assert.match(tip.text, fr ? /février 2026/ : /February 2026/);
  assert.match(tip.text, fr ? /aucune donnée/ : /no data/);
  assert.equal(await evaluate("document.querySelectorAll('.analysis-tooltip-series').length"), 4);
  await capture(`${tag}-multi-tooltip`);
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 1, y: 1 });
  await pause(150);
  // Hiding series, but never the last one.
  for (const index of [0, 1, 2, 3]) await clickAt(".analysis-multi-chart .analysis-legend-item", index);
  const left = await evaluate("[document.querySelectorAll('.analysis-multi-chart .analysis-legend-item[aria-pressed=true]').length,document.querySelectorAll('.analysis-multi-chart .analysis-tooltip-series').length]");
  assert.equal(left[0], 1, `${tag} one series always stays`);
  for (const index of [0, 1, 2]) await clickAt(".analysis-multi-chart .analysis-legend-item", index);
  assert.equal(await evaluate("document.querySelectorAll('.analysis-multi-chart .analysis-legend-item[aria-pressed=true]').length"), 4);
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 1, y: 1 });
  await pause(150);
  // Keyboard path.
  await evaluate("document.querySelector('.analysis-multi-chart .analysis-chart-target[tabindex=\"0\"]').focus()");
  await press("End");
  assert.match((await tipState()).text, fr ? /décembre 2026/ : /December 2026/);
  await press("Escape");
  await evaluate("document.activeElement.blur()");
  await capture(`${tag}-multi-line`);
  // Grouped bars.
  await evaluate("document.querySelectorAll('.analysis-multi-chart .analysis-view-switch:not(.analysis-zoom-switch) button')[1].click()");
  await pause(240);
  const bars = await evaluate("document.querySelectorAll('.analysis-multi-chart .analysis-chart-rect').length");
  assert(bars >= 47, `${tag} grouped bars ${bars}`);
  await assertLayout(`${tag} multi bars`);
  await capture(`${tag}-multi-bars`);
  // Export keeps the four patterns and labels.
  await exportAs(0);
  const svg = await lastDownload();
  assert.equal((svg.text.match(/stroke-dasharray/g) ?? []).length >= 3, true, "dash patterns exported");
  assert.match(svg.text, /Café/);
  assert(!svg.text.includes("var("), "export colours resolved");
  await evaluate("document.querySelectorAll('.analysis-multi-chart .analysis-view-switch:not(.analysis-zoom-switch) button')[0].click()");
  await pause(160);
}

await send("Runtime.enable");
await send("Page.enable");
await send("Page.bringToFront");
await send("Emulation.setFocusEmulationEnabled", { enabled: true });
await send("Page.navigate", { url: "http://localhost:3001/phase-two-b-preview" });
await pause(4000);
let done = 0;
for (const width of [320, 390, 1280]) for (const theme of ["light", "dark"]) for (const language of ["fr", "en"]) {
  await send("Emulation.setDeviceMetricsOverride", { width, height: 780, deviceScaleFactor: 1, mobile: false });
  await send("Page.reload"); await pause(1600);
  await evaluate("new Promise(r=>{const t=()=>document.querySelector('.preview-controls')?r():setTimeout(t,50);t()})");
  await pause(250);
  await installDownloadTrap();
  const tag = `${width}-${theme}-${language}`;
  await evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme)}`);
  if (language === "en") await evaluate("[...document.querySelectorAll('.preview-controls button')].find(b=>b.textContent==='Language').click()");
  await pause(200);
  await compareScenario(language, theme, tag);
  await denseScenario(tag);
  await multiScenario(language, tag);
  await zoomScenario(language, tag);
  done += 1;
  console.log("ok", tag);
}
// The report palette written in the export must match the light theme.
await evaluate("document.documentElement.dataset.theme='light'");
await pause(150);
const tokens = await evaluate("(()=>{const c=document.querySelector('.analysis-line-chart'),s=getComputedStyle(c);return ['--ink','--muted','--line','--series-main','--series-comparison'].map(n=>s.getPropertyValue(n).trim().toUpperCase())})()");
assert.deepEqual(tokens, ["#0E1116", "#586070", "#E4E7EC", "#2463CE", "#0F8F72"], "export colors follow the light tokens");
assert.deepEqual(errors, [], "no page exceptions");
console.log(`PASS: ${done} chart configurations.`);
ws.close();
