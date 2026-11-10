// Interactive map. Run after check.mjs --prepare, with the dev server and the dedicated
// Chrome from README.md. Tile requests are intercepted: nothing reaches OpenStreetMap.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { clampView, fitBounds, minZoomFor, panBy, project, tileLevel, toScreen, visibleTiles, zoomAround } from "../../../lib/map-math.ts";

const near = (actual, expected, tolerance = 1e-6) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} ≠ ${expected}`);
{
  near(project(0, 0).x, 0.5); near(project(0, 0).y, 0.5);
  near(project(0, -180).x, 0); near(project(0, 180).x, 1);
  near(project(85.05112878, 0).y, 0, 1e-6);
  near(project(-90, 0).y, 1, 1e-6);
  // Paris in tile 8/129/88, a reference value of the OSM slippy-map convention.
  const paris = project(48.8566, 2.3522);
  assert.deepEqual([Math.floor(paris.x * 256), Math.floor(paris.y * 256)], [129, 88]);
  const view = { x: 0.3, y: 0.4, zoom: 5 };
  const zoomed = zoomAround(view, 7, 100, 50, 800, 400);
  const world = { x: view.x + (100 - 400) / (256 * 32), y: view.y + (50 - 200) / (256 * 32) };
  near(toScreen(world, zoomed, 800, 400).left, 100, 1e-6);
  near(toScreen(world, zoomed, 800, 400).top, 50, 1e-6);
  near(panBy(view, 256, 0).x, 0.3 - 256 / (256 * 32));
  near(minZoomFor(512, 256), 1);
  const edge = clampView({ x: 0, y: 0, zoom: 3 }, 800, 400);
  assert.ok(edge.x * 256 * 8 >= 400 - 1e-6 && edge.y * 256 * 8 >= 200 - 1e-6, "the world edge cannot enter the viewport");
  const points = [project(48.85, 2.35), project(43.3, 5.37), project(50.63, 3.06)];
  const fit = fitBounds(points, 800, 400);
  for (const point of points) { const at = toScreen(point, fit, 800, 400); assert.ok(at.left >= 56 - 1 && at.left <= 744 + 1 && at.top >= 56 - 1 && at.top <= 344 + 1, JSON.stringify(at)); }
  assert.equal(fitBounds([project(10, 10)], 800, 400).zoom, 13, "a single point gets a street-level zoom");
  assert.equal(fitBounds([project(10, 10), project(10, 10)], 800, 400).zoom, 13);
  assert.ok(fitBounds([], 800, 400).zoom >= minZoomFor(800, 400));
  const tiles = visibleTiles({ x: 0.5, y: 0.5, zoom: 4 }, 4, 800, 400);
  assert.ok(tiles.every((tile) => /^https:\/\/tile\.openstreetmap\.org\/4\/\d+\/\d+\.png$/.test(tile.url)));
  assert.ok(tiles.length <= 20, "only visible tiles");
  assert.ok(tiles.some((tile) => tile.left <= 0) && tiles.some((tile) => tile.left + tile.width >= 800), "the width is covered");
  for (const tile of visibleTiles({ x: 0.5, y: 0.5, zoom: 4.4 }, 4, 800, 400)) { const right = tiles.length && tile.left + tile.width; assert.ok(Number.isInteger(right), "whole pixels leave no seam"); }
  assert.deepEqual([tileLevel(3.4), tileLevel(3.6), tileLevel(25)], [3, 4, 19]);
}
console.log("PASS: map math.");
if (process.argv.includes("--logic")) process.exit(0);

const output = new URL("../../../.visual-checks/osm-map/", import.meta.url);
await mkdir(output, { recursive: true });
const targets = await (await fetch("http://127.0.0.1:9226/json")).json();
const ws = new WebSocket(targets.find((target) => target.type === "page").webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
let serial = 0;
const pending = new Map();
const errors = [];
const tileRequests = [];
let offlineTiles = false;
// A valid 256x256 light PNG stands for every tile.
const png = await (async () => {
  const { deflateSync, crc32 } = await import("node:zlib");
  const chunk = (type, data) => { const body = Buffer.concat([Buffer.from(type), data]); const size = Buffer.alloc(4); size.writeUInt32BE(data.length); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body)); return Buffer.concat([size, body, crc]); };
  const header = Buffer.alloc(13); header.writeUInt32BE(256, 0); header.writeUInt32BE(256, 4); header[8] = 8; header[9] = 0;
  const raw = Buffer.alloc(257 * 256, 0xE8); for (let row = 0; row < 256; row++) raw[row * 257] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", header), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]).toString("base64");
})();
ws.onmessage = ({ data }) => {
  const message = JSON.parse(data), item = pending.get(message.id);
  if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
  if (message.method === "Fetch.requestPaused") {
    const { requestId, request } = message.params;
    tileRequests.push(request.url);
    // A tile scrolled away is aborted by the map: its request may already be gone.
    if (offlineTiles) void send("Fetch.failRequest", { requestId, errorReason: "InternetDisconnected" }).catch(() => undefined);
    else void send("Fetch.fulfillRequest", { requestId, responseCode: 200, responseHeaders: [{ name: "Content-Type", value: "image/png" }, { name: "Access-Control-Allow-Origin", value: "*" }, { name: "Cache-Control", value: "max-age=86400, stale-if-error=604800" }], body: png }).catch(() => undefined);
  }
  if (!item) return;
  pending.delete(message.id); clearTimeout(item.timer);
  if (message.error) item.reject(Error(message.error.message)); else item.resolve(message.result);
};
const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++serial; const timer = setTimeout(() => reject(Error(`Timeout: ${method}`)), 30000); pending.set(id, { resolve, reject, timer }); ws.send(JSON.stringify({ id, method, params })); });
const pause = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));
async function evaluate(expression) { const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw Error(`${expression.slice(0, 140)}: ${JSON.stringify(result.exceptionDetails).slice(0, 300)}`); return result.result.value; }
const codes = { Tab: 9, Enter: 13, Escape: 27, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40 };
async function press(key) { const text = key === "Enter" ? { text: "\r" } : key === "+" ? { text: "+" } : {}; await send("Input.dispatchKeyEvent", { type: text.text ? "keyDown" : "rawKeyDown", key, code: key, windowsVirtualKeyCode: codes[key] ?? 187, ...text }); await send("Input.dispatchKeyEvent", { type: "keyUp", key, code: key, windowsVirtualKeyCode: codes[key] ?? 187 }); await pause(); }
const capture = async (name) => { const { data } = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }); await writeFile(new URL(`${name}.png`, output), Buffer.from(data, "base64")); };
// Tiles load asynchronously through the tile cache: wait for the current level (2 s at most).
const tilesSettled = () => evaluate("new Promise(r=>{const end=Date.now()+2000;const t=()=>{const m=document.querySelector('.osm-map'),c=[...document.querySelectorAll('.osm-map-tile[data-current]')];if(m?.dataset.tiles!=='on'||(c.length&&c.every(i=>i.complete))||Date.now()>end)r(true);else setTimeout(t,30)};t()})");
const state = async () => (await tilesSettled(), stateNow());
const stateNow = () => evaluate(`(()=>{const v=document.querySelector('.osm-map-viewport'),b=v.getBoundingClientRect(),m=[...v.querySelectorAll('.osm-map-marker')].map(e=>{const r=e.getBoundingClientRect();return {x:r.left+r.width/2-b.left,y:r.bottom-b.top}});return {w:b.width,h:b.height,markers:m,tiles:v.querySelectorAll('.osm-map-tile').length,popup:v.querySelector('.osm-map-popup')?.textContent??null,offline:v.querySelector('.osm-map-offline')?.textContent??null,consent:!!v.querySelector('.osm-map-consent'),attribution:v.querySelector('.osm-map-attribution')?.textContent??null,tileZ:Number([...v.querySelectorAll('.osm-map-tile[data-current]')].at(-1)?.dataset.url.match(/org\\/(\\d+)\\//)?.[1]),zoom:(t=>t?Number(t.dataset.url.match(/org\\/(\\d+)\\//)[1])+Math.log2(t.getBoundingClientRect().width/256):null)([...v.querySelectorAll('.osm-map-tile[data-current]')].at(-1))}})()`);
const box = () => evaluate("(()=>{const r=document.querySelector('.osm-map-viewport').getBoundingClientRect();return {x:r.left,y:r.top,w:r.width,h:r.height}})()");
const center = async () => { await evaluate("document.querySelector('.osm-map-viewport').scrollIntoView({block:'center'})"); await pause(180); const b = await box(); return { x: b.x + b.w / 2, y: b.y + b.h / 2, ...b }; };
const mouse = (type, x, y, extra = {}) => send("Input.dispatchMouseEvent", { type, x, y, button: "left", ...extra });
async function assertLayout(where) { const s = await evaluate("(()=>{const d=document.documentElement,m=document.querySelector('.osm-map-viewport'),c=[...m.querySelectorAll('.osm-map-controls button,.osm-map-consent')];return {page:d.scrollWidth-innerWidth,out:c.some(e=>{const r=e.getBoundingClientRect(),b=m.getBoundingClientRect();return r.left<b.left-1||r.right>b.right+1})}})()"); assert(s.page <= 0 && !s.out, `${where} ${JSON.stringify(s)}`); }
// Headless Chrome does not deliver CDP wheel input here, so a DOM WheelEvent is dispatched.
const wheel = (x, y, deltaY) => evaluate(`document.querySelector('.osm-map-viewport').dispatchEvent(new WheelEvent('wheel',{deltaY:${deltaY},clientX:${x},clientY:${y},bubbles:true,cancelable:true}))`);

async function scenario(language, tag) {
  const fr = language === "fr";
  tileRequests.length = 0;
  await evaluate("[...document.querySelectorAll('.preview-controls button')].find(b=>b.textContent==='map').click()");
  await pause(700);
  await assertLayout(`${tag} consent`);
  let s = await state();
  assert.equal(s.consent, true, "the consent is offered");
  assert.equal(s.tiles, 0, "no tile element before consent");
  assert.equal(tileRequests.length, 0, "rule 13: no request to OpenStreetMap before consent");
  assert.equal(s.markers.length, 4, "points stay visible without a background");
  for (const marker of s.markers) assert(marker.x >= 0 && marker.x <= s.w && marker.y >= 0 && marker.y <= s.h, `${tag} fitted ${JSON.stringify(marker)}`);
  await capture(`${tag}-consent`);

  await evaluate("document.querySelector('.osm-map-consent button').click()");
  await pause(600);
  s = await state();
  assert(s.tiles > 0 && tileRequests.length > 0, "tiles requested after consent");
  assert(tileRequests.every((url) => /^https:\/\/tile\.openstreetmap\.org\/\d+\/\d+\/\d+\.png$/.test(url)), "only standard tile URLs");
  assert.equal(s.attribution, "© OpenStreetMap", "attribution is shown");
  assert.equal(s.consent, false);
  await assertLayout(`${tag} tiles`);
  await capture(`${tag}-tiles`);

  // Drag.
  const c = await center();
  const before = await state();
  await mouse("mouseMoved", c.x + 90, c.y + 60); await mouse("mousePressed", c.x + 90, c.y + 60, { clickCount: 1 });
  for (let step = 1; step <= 4; step++) { await mouse("mouseMoved", c.x + 90 - step * 15, c.y + 60 + step * 5); await pause(30); }
  await mouse("mouseReleased", c.x + 30, c.y + 80, { clickCount: 1 });
  await pause(200);
  const dragged = await state();
  near(dragged.markers[0].x - before.markers[0].x, -60, 2.5);
  near(dragged.markers[0].y - before.markers[0].y, 20, 2.5);

  // Wheel keeps the point under the cursor, and the page does not scroll.
  assert.equal(await wheel(c.x, c.y, -400), false, "the wheel event is cancelled, so the page does not scroll");
  await pause(400);
  const wheeled = await state();
  near(wheeled.zoom - dragged.zoom, 1, 0.05);

  // Buttons and fit.
  await evaluate("document.querySelectorAll('.osm-map-controls button')[2].click()"); await pause(420);
  const fitted = await state();
  for (const marker of fitted.markers) assert(marker.x >= 0 && marker.x <= fitted.w && marker.y >= 0 && marker.y <= fitted.h, `${tag} fit all ${JSON.stringify(marker)}`);
  assert.equal(fitted.markers.length, 4, "fit brings every marker back");
  await evaluate("document.querySelectorAll('.osm-map-controls button')[0].click()"); await pause(420);
  near((await state()).zoom - fitted.zoom, 1, 0.05);
  await evaluate("document.querySelectorAll('.osm-map-controls button')[1].click()"); await pause(420);
  near((await state()).zoom, fitted.zoom, 0.05);

  // Tile level follows the zoom after a pause, without a request per wheel step.
  const beforeZoomRequests = tileRequests.length;
  for (let step = 0; step < 8; step++) { await wheel(c.x, c.y, -200); await pause(20); }
  await pause(500);
  const afterWheel = await state();
  assert(afterWheel.tileZ > fitted.tileZ, `tile level follows ${fitted.tileZ} -> ${afterWheel.tileZ}`);
  assert(tileRequests.length - beforeZoomRequests < 30 + afterWheel.tiles, `no burst of requests (${tileRequests.length - beforeZoomRequests})`);
  await evaluate("document.querySelectorAll('.osm-map-controls button')[2].click()"); await pause(500);

  // Marker: click shows the popup, its button opens the entry, Escape returns focus.
  const opened = await evaluate(`(()=>{const m=document.querySelector('.osm-map-marker'),r=m.getBoundingClientRect();return {x:r.left+22,y:r.bottom-20}})()`);
  await mouse("mouseMoved", opened.x, opened.y); await mouse("mousePressed", opened.x, opened.y, { clickCount: 1 }); await mouse("mouseReleased", opened.x, opened.y, { clickCount: 1 });
  await pause(220);
  s = await state();
  assert.match(s.popup, /Chantier Nord/, `${tag} popup title`);
  assert.match(s.popup, fr ? /Ouvrir la fiche/ : /Open entry/);
  const popupBox = await evaluate("(()=>{const p=document.querySelector('.osm-map-popup').getBoundingClientRect(),b=document.querySelector('.osm-map-viewport').getBoundingClientRect();return {in:p.left>=b.left&&p.right<=b.right&&p.top>=b.top&&p.bottom<=b.bottom}})()");
  assert(popupBox.in, `${tag} popup inside the map`);
  await capture(`${tag}-popup`);
  await evaluate("document.querySelector('.osm-map-popup-open').click()"); await pause(120);
  assert.match(await evaluate("document.querySelector('output[data-last-action]').dataset.lastAction"), /^open:p0$/, "the entry opens");
  await evaluate("document.querySelector('.osm-map-marker').focus()");
  await press("Escape");
  assert.equal((await state()).popup, null, "Escape closes the popup");

  // Keyboard: a single stop among markers, arrows between them, the map pans.
  assert.equal(await evaluate("document.querySelectorAll('.osm-map-marker[tabindex=\"0\"]').length"), 1, "one marker tab stop");
  await evaluate("document.querySelector('.osm-map-marker[tabindex=\"0\"]').focus()");
  const firstName = await evaluate("document.activeElement.getAttribute('aria-label')");
  await press("ArrowRight");
  assert.notEqual(await evaluate("document.activeElement.getAttribute('aria-label')"), firstName, "arrows move between markers");
  await press("Enter"); await pause(120);
  assert.notEqual((await state()).popup, null, "Enter opens the popup");
  await press("Escape");
  await evaluate("document.querySelector('.osm-map-viewport').focus()");
  const panFrom = (await state()).markers[0].x;
  await press("ArrowLeft"); await pause(350);
  near((await state()).markers[0].x - panFrom, 80, 3);
  const ring = await evaluate("(()=>{const e=document.querySelector('.osm-map-viewport'),s=getComputedStyle(e);return [s.outlineStyle,parseFloat(s.outlineWidth)]})()");
  assert(ring[0] !== "none" && ring[1] >= 2, "visible focus");

  // T38/2: tiles already seen stay offline, and nothing was fetched ahead.
  await evaluate("document.querySelectorAll('.osm-map-controls button')[2].click()"); await pause(500);
  const cached = await evaluate("caches.open('brainy-osm-tiles-v1').then(c=>c.keys()).then(k=>k.map(r=>r.url))");
  assert(cached.length > 0, `${tag} seen tiles are cached`);
  assert(cached.every((url) => tileRequests.includes(url)), "only tiles actually shown are cached: no prefetch");
  await send("Network.setCacheDisabled", { cacheDisabled: true });
  offlineTiles = true;
  const beforeOffline = tileRequests.length;
  await evaluate("window.dispatchEvent(new Event('online'))");
  await pause(900);
  s = await state();
  assert.equal(s.offline, null, `${tag} seen tiles show offline`);
  assert(s.tiles > 0, `${tag} tiles visible offline`);
  assert.equal(tileRequests.length, beforeOffline, "fresh cached tiles need no request");
  await capture(`${tag}-offline-cached`);

  // Offline: tiles never seen fail, a discreet mention appears, the points stay.
  await evaluate("caches.delete('brainy-osm-tiles-v1')");
  await evaluate("window.dispatchEvent(new Event('online'))");
  await pause(900);
  s = await state();
  assert.equal(s.offline, fr ? "Fond de carte hors-ligne" : "Map background offline", `${tag} offline mention ${JSON.stringify(s.offline)}`);
  assert.equal(s.attribution, null);
  assert(s.markers.length > 0, "points stay visible offline");
  await assertLayout(`${tag} offline`);
  await capture(`${tag}-offline`);
  offlineTiles = false;
  await send("Network.setCacheDisabled", { cacheDisabled: false });
  await evaluate("window.dispatchEvent(new Event('online'))");
  await pause(500);
  assert.equal((await state()).offline, null, "back online");

  // The choice is remembered, and can be undone.
  await evaluate("document.querySelector('.osm-map-disable').click()"); await pause(200);
  s = await state();
  assert.equal(s.tiles, 0, "turning off removes the tiles");
  assert.equal(s.consent, true);
  assert.equal(await evaluate("localStorage.getItem('brainy:map:osm-tiles')"), null);
}

await send("Runtime.enable");
await send("Page.enable");
await send("Network.enable");
await send("Fetch.enable", { patterns: [{ urlPattern: "https://tile.openstreetmap.org/*" }] });
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
  await evaluate("localStorage.removeItem('brainy:map:osm-tiles')");
  await evaluate("caches.delete('brainy-osm-tiles-v1')");
  await evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme)}`);
  if (language === "en") await evaluate("[...document.querySelectorAll('.preview-controls button')].find(b=>b.textContent==='Language').click()");
  await pause(200);
  await scenario(language, `${width}-${theme}-${language}`);
  done += 1;
  console.log("ok", `${width}-${theme}-${language}`);
}
assert.deepEqual(errors, [], "no page exceptions");
console.log(`PASS: ${done} map configurations.`);
ws.close();
