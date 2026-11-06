import assert from "node:assert/strict";
import { access, mkdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = new URL("../../../", import.meta.url);
const route = new URL("app/phase-two-b-preview/", root);
const page = new URL("page.tsx", route);
const routeText = 'export { default } from "../../scripts/visual/phase-two-b/fixture";\n';
if (process.argv.includes("--prepare")) {
  await mkdir(route, { recursive: true });
  const existing = await readFile(page, "utf8").catch((error) => { if (error.code !== "ENOENT") throw error; });
  assert(!existing || existing === routeText, "Refusing to replace an existing page");
  await writeFile(page, routeText);
  console.log("Temporary fixture ready; start the dev server on port 3001.");
  process.exit(0);
}
if (process.argv.includes("--cleanup")) {
  const devRunning = await access(new URL(".next/dev/lock", root)).then(() => true, () => false);
  assert(!devRunning, "Stop the dev server before removing the fixture");
  const existing = await readFile(page, "utf8").catch((error) => { if (error.code !== "ENOENT") throw error; });
  assert(!existing || existing === routeText, "Refusing to remove a different page");
  await rm(page, { force: true });
  // Next includes dev route validators in production typechecking. Retire only
  // this generated cache so it cannot reference the removed temporary route.
  const generatedTypes = await realpath(new URL(".next/dev/types", root)).catch((error) => { if (error.code !== "ENOENT") throw error; });
  if (generatedTypes) {
    const workspace = await realpath(root);
    assert(generatedTypes.startsWith(`${workspace}${sep}.next${sep}dev${sep}`), "Unexpected generated types path");
    await rm(generatedTypes, { recursive: true });
  }
  console.log("Temporary route removed.");
  process.exit(0);
}

const output = new URL(".visual-checks/phase-two-b/", root);
await mkdir(output, { recursive: true });
const target = (await (await fetch("http://127.0.0.1:9226/json")).json()).find((item) => item.type === "page");
assert(target, "Launch a dedicated headless Chrome on port 9226");
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
let id = 0;
const pending = new Map();
const errors = [];
ws.onmessage = ({ data }) => {
  const message = JSON.parse(data);
  if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.text);
  const item = pending.get(message.id);
  if (!item) return;
  pending.delete(message.id);
  clearTimeout(item.timeout);
  if (message.error) item.reject(Error(message.error.message));
  else item.resolve(message.result);
};
function send(method, params = {}) {
  const messageId = ++id;
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { pending.delete(messageId); reject(Error(`Timeout: ${method}`)); }, 30000);
    pending.set(messageId, { resolve, reject, timeout });
    ws.send(JSON.stringify({ id: messageId, method, params }));
  });
}
async function evaluate(expression) {
  const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitFor(expression) {
  for (let attempt = 0; attempt < 150; attempt++) {
    if (await evaluate(expression)) return;
    await pause(200);
  }
  throw Error(`Not ready: ${expression}`);
}
async function click(selector) { await evaluate(`document.querySelector(${JSON.stringify(selector)})?.click()`); await pause(100); }
async function control(label) { await evaluate(`[...document.querySelectorAll('.preview-controls button')].find(b => b.textContent === ${JSON.stringify(label)})?.click()`); await pause(100); }
async function key(key, modifiers = 0) {
  const windowsVirtualKeyCode = { Enter: 13, Tab: 9, Escape: 27, Home: 36, End: 35, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40 }[key] ?? key.toUpperCase().charCodeAt(0);
  await send("Input.dispatchKeyEvent", { type: "keyDown", key, modifiers, windowsVirtualKeyCode, ...(key === "Enter" ? { text: "\r" } : {}) });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key, modifiers, windowsVirtualKeyCode });
  await pause(60);
}
async function screenshot(name) {
  const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await writeFile(new URL(`${name}.png`, output), Buffer.from(shot.data, "base64"));
}
const report = [];
try {
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Page.navigate", { url: "http://localhost:3001/phase-two-b-preview" });
  await waitFor("!!document.querySelector('.format-card')");
  for (const width of [320, 390, 1280, 640]) {
    await send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: false });
    for (const theme of ["light", "dark"]) {
      await evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme)}`);
      for (const view of ["formats", "entries", "empty", "tools", "one", "many"]) {
        await control(view);
        if (view === "tools") await click(".collection-tools-toggle");
        await evaluate("document.querySelector('.workspace').scrollTop=0");
        await pause(250);
        const metrics = await evaluate(`(() => {
          const all=s=>[...document.querySelectorAll(s)], css=e=>getComputedStyle(e);
          const ctx=document.createElement('canvas').getContext('2d');ctx.canvas.width=1;ctx.canvas.height=1;
          const px=colors=>{ctx.clearRect(0,0,1,1);for(const color of colors){ctx.fillStyle=color;ctx.fillRect(0,0,1,1)}return [...ctx.getImageData(0,0,1,1).data].slice(0,3)};
          const lum=a=>a.map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4}).reduce((n,x,i)=>n+x*[.2126,.7152,.0722][i],0);
          const ratio=(a,b)=>{a=lum(px(a));b=lum(px(b));return (Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
          const min=a=>a.length?+Math.min(...a).toFixed(2):null;
          const cards=all('.format-card'),icons=all('.collection-hub-icon'), chart=document.querySelector('.analysis-line-chart svg');
          return {
            overflow:document.documentElement.scrollWidth>innerWidth+1,
            clipped:all('.workspace,.format-card,.analysis-line-chart').some(e=>e.scrollWidth>e.clientWidth+2),
            cards:cards.length,
            title:min(cards.map(e=>ratio([css(e.querySelector('strong')).color],[css(e).backgroundColor]))),
            metadata:min(cards.map(e=>ratio([css(e.querySelector('.format-card-subtitle')).color],[css(e).backgroundColor]))),
            marker:min(cards.map(e=>ratio([css(e).borderTopColor],[css(e).backgroundColor]))),
            control:min(cards.map(e=>ratio([css(e.querySelector('.format-add-entry')).borderTopColor],[css(e).backgroundColor]))),
            focus:min(cards.map(e=>ratio([css(e).getPropertyValue('--focus')],[css(e).backgroundColor]))),
            icons:min(icons.map(e=>ratio([css(e).color],[css(e.closest('.collection-hub-card')).backgroundColor,css(e).backgroundColor]))),
            axis:chart?+(13*chart.getBoundingClientRect().width/chart.viewBox.baseVal.width).toFixed(1):null,
            chartContrast:chart?+ratio([css(chart.querySelector('polyline')).stroke],[css(chart.parentElement).backgroundColor]).toFixed(2):null,
          };
        })()`);
        report.push({ width, theme, view, ...metrics });
        assert(!metrics.overflow && !metrics.clipped, `Overflow: ${width}/${theme}/${view}`);
        if (view === "formats") {
          assert.equal(metrics.cards, 24);
          assert(metrics.title >= 4.5 && metrics.metadata >= 4.5 && metrics.marker >= 3 && metrics.control >= 3 && metrics.focus >= 3, "Format contrasts");
        }
        if (view === "tools") assert(metrics.icons >= 3, "Tool contrast");
        if (view === "many") assert(metrics.axis >= 12.9 && metrics.chartContrast >= 3, "Chart legibility");
        if (width !== 640) await screenshot(`${view}-${theme}-${width}`);
      }
    }
  }

  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 900, deviceScaleFactor: 1, mobile: false });
  await control("entries");
  await click(".brainy-listbox-trigger");
  assert.equal(await evaluate("document.activeElement?.getAttribute('role')"), "option");
  await key("End");
  assert.equal(await evaluate("document.activeElement?.textContent"), "Données personnelles 24");
  await key("Home");
  await key("l");
  assert.equal(await evaluate("document.activeElement?.textContent"), "Livres");
  await key("Enter");
  assert.equal(await evaluate("document.querySelector('.brainy-listbox-value').textContent"), "Livres");
  await click(".brainy-listbox-trigger");
  await key("Escape");
  assert.equal(await evaluate("document.activeElement?.className"), "brainy-listbox-trigger");
  await control("Modal");
  await click(".modal .brainy-listbox-trigger");
  await key("Escape");
  assert(await evaluate("!!document.querySelector('.modal') && document.activeElement.matches('.modal .brainy-listbox-trigger')"), "Escape must preserve parent modal");
  await key("Escape");
  assert(await evaluate("!document.querySelector('.modal')"));

  await evaluate("[...document.querySelectorAll('.preview-controls button')].find(b=>b.textContent==='Collections').focus()");
  await control("Collections");
  await pause(250);
  assert(await evaluate("document.activeElement.matches('.mobile-drawer input')"));
  assert(await evaluate("document.querySelector('.mobile-drawer-panel').getBoundingClientRect().right <= innerWidth + 1"));
  await screenshot("drawer-dark-390");
  await key("Escape");
  assert.equal(await evaluate("document.activeElement?.textContent"), "Collections");

  await control("formats");
  await click(".format-card-more summary");
  assert(await evaluate("document.querySelector('.format-card-more').open"));
  await evaluate("document.querySelector('.format-card-more summary').focus()");
  await key("Escape");
  assert(await evaluate("!document.querySelector('.format-card-more').open"));
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await evaluate("document.querySelector('#collection-tab-entries').focus()");
  await key("ArrowRight");
  assert(await evaluate("getComputedStyle(document.querySelector('.ui-tabs-indicator')).transform !== 'none'"), "Reduced motion must preserve indicator position");
  await evaluate("document.documentElement.style.fontSize='200%'");
  assert(await evaluate("document.documentElement.scrollWidth<=innerWidth+1 && document.querySelector('.workspace').scrollWidth<=document.querySelector('.workspace').clientWidth+1"));
  await screenshot("formats-text-200-dark-390");
  await evaluate("document.documentElement.style.fontSize=''");
  await control("Language");
  assert.equal(await evaluate("document.querySelector('.format-add-entry').textContent.trim()"), "Add entry");

  await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await control("entries");
  const scroll = await evaluate(`(() => { const w=document.querySelector('.workspace'),s=document.querySelector('.sidebar'),t=document.querySelector('.topbar');w.scrollTop=900;return {sidebar:s.getBoundingClientRect().top,topbar:t.getBoundingClientRect().top,scroll:w.scrollTop,window:scrollY}; })()`);
  assert(scroll.scroll > 0 && scroll.sidebar === 0 && scroll.topbar === 0 && scroll.window === 0, "Independent workspace scroll");
  await evaluate("document.querySelectorAll('.collection-nav button')[3].click()");
  assert(await evaluate("getComputedStyle(document.querySelector('.collection-nav'),'::before').transform !== 'none'"));
  const navHeight = await evaluate("document.querySelector('.collection-nav').clientHeight");
  await click(".sidebar-more summary");
  assert.equal(await evaluate("document.querySelector('.collection-nav').clientHeight"), navHeight);
  await screenshot("sidebar-menu-dark-1280");
  await send("Page.navigate", { url: "http://localhost:3001/" });
  await waitFor("!!document.querySelector('.auth-shell')");
  for (const theme of ["light", "dark"]) {
    await evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme)}`);
    await pause(250);
    await screenshot(`login-${theme}-1280`);
  }
  assert.equal(errors.length, 0, errors.join("\n"));
  console.log(`PASS: ${report.length} layouts, 24 colors, keyboard, nested Escape, drawer, reduced motion, text enlargement, scroll, login.`);
} finally {
  await writeFile(new URL("metrics.json", output), JSON.stringify({ report, errors }, null, 2));
  ws.close();
  console.log(`Artifacts: ${fileURLToPath(output)}`);
}
