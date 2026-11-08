// Dates, keyboard paths and focus rings. Run after check.mjs --prepare, with the
// dev server and the dedicated Chrome from README.md. Synthetic data only.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const output = new URL("../../../.visual-checks/date-focus/", import.meta.url);
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
const pause = (ms = 90) => new Promise((resolve) => setTimeout(resolve, ms));
async function evaluate(expression) {
  const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw Error(`${expression}: ${JSON.stringify(result.exceptionDetails)}`);
  return result.result.value;
}
const codes = { Tab: 9, Enter: 13, Escape: 27, " ": 32, PageUp: 33, PageDown: 34, End: 35, Home: 36, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40 };
async function press(key, modifiers = 0) {
  const text = key === "Enter" ? { text: "\r" } : key === " " ? { text: " " } : {};
  const code = key === " " ? "Space" : key;
  await send("Input.dispatchKeyEvent", { type: text.text ? "keyDown" : "rawKeyDown", key, code, windowsVirtualKeyCode: codes[key], modifiers, ...text });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode: codes[key], modifiers });
  await pause();
}
const type = async (text) => { await send("Input.insertText", { text }); await pause(); };
const focus = (selector) => evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`);
const values = () => evaluate("JSON.parse(document.querySelector('[data-values]').dataset.values)");
const lastAction = () => evaluate("document.querySelector('output[data-last-action]').dataset.lastAction");
const active = () => evaluate(`(()=>{const a=document.activeElement;return {tag:a.tagName,text:(a.getAttribute('aria-label')||a.textContent||'').trim().slice(0,50),id:a.id,calendar:!!a.closest('.brainy-calendar'),inTools:!!a.closest('.workspace-tools-modal'),trigger:a.classList.contains('brainy-date-trigger'),isDay:a.hasAttribute('data-active')}})()`);
async function capture(name) {
  const { data } = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await writeFile(new URL(`${name}.png`, output), Buffer.from(data, "base64"));
}
const helpers = String.raw`
const rgb=s=>s.match(/[\d.]+/g).map(Number);
const lum=c=>c.slice(0,3).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4}).reduce((s,x,i)=>s+x*[.2126,.7152,.0722][i],0);
const flat=(c,b)=>{const a=c[3]??1;return c.slice(0,3).map((v,i)=>v*a+b[i]*(1-a))};
const under=e=>{const layers=[];for(let n=e;n;n=n.parentElement){const c=rgb(getComputedStyle(n).backgroundColor);if((c[3]??1)>0)layers.push(c);if((c[3]??1)===1)break}return layers.reduceRight((b,c)=>flat(c,b),[255,255,255])};
const ratio=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
const textRatio=e=>{const b=under(e);return ratio(flat(rgb(getComputedStyle(e).color),b),b)};
const ringOf=e=>{const s=getComputedStyle(e);const w=parseFloat(s.outlineWidth);const on=s.outlineStyle!=='none'&&w>=2;const off=parseFloat(s.outlineOffset);return {on,width:w,offset:off,contrast:on?ratio(rgb(s.outlineColor),under(off<0?e:(e.parentElement||e))):0}};
`;
const ring = () => evaluate(`(()=>{${helpers};const a=document.activeElement;const r=a.getBoundingClientRect();return {...ringOf(a),tag:a.tagName,label:(a.getAttribute('aria-label')||a.textContent||'').trim().slice(0,40),inView:r.width>0&&r.right<=innerWidth+1&&r.left>=-1}})()`);
async function assertRing(where) {
  const state = await ring();
  assert(state.on, `${where}: no visible focus ring on ${state.tag} ${state.label}`);
  assert(state.contrast >= 3, `${where}: focus ring ${state.contrast.toFixed(2)} on ${state.tag} ${state.label}`);
  return state;
}
const overflow = () => evaluate(`(()=>{const d=document.documentElement,m=document.querySelector('.modal');return {page:d.scrollWidth-innerWidth,modal:m?m.scrollWidth-m.clientWidth:0,out:[...document.querySelectorAll('.brainy-date,.brainy-date input,.brainy-date-trigger,.brainy-time,.modal button,.modal input,.modal select,.modal summary,.collection-hub-card,.collection-tools-toggle')].filter(e=>e.getClientRects().length&&e.getBoundingClientRect().right>innerWidth+1).map(e=>e.className||e.tagName).slice(0,5)}})()`);
async function assertNoOverflow(where) {
  const state = await overflow();
  assert(state.page <= 0 && state.modal <= 0 && !state.out.length, `${where}: overflow ${JSON.stringify(state)}`);
}
const field = (index) => `document.querySelectorAll('.modal .input-label')[${index}]`;
const fill = async (index, text) => {
  await evaluate(`${field(index)}.querySelector('input').focus()`);
  await evaluate(`${field(index)}.querySelector('input').select()`);
  await type(text);
  await press("Tab");
};

const sweep = (root) => evaluate(`(()=>{${helpers};const low=[];const scope=document.querySelector(${JSON.stringify(root)});if(!scope)return {missing:true,low};for(const e of scope.querySelectorAll('*')){const own=[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());if(own&&e.getClientRects().length&&!e.closest('[disabled]')){const v=textRatio(e);if(v<4.5)low.push(['text',e.tagName,e.textContent.trim().slice(0,30),+v.toFixed(2)])}if(e.matches('input:not([type=checkbox]):not([type=file]):not([type=range]),select,textarea')&&e.getClientRects().length){const s=getComputedStyle(e);const v=ratio(rgb(s.borderTopColor),under(e.parentElement));if(v<3)low.push(['border',e.tagName,s.borderTopColor,+v.toFixed(2)])}}return {low}})()`);
async function assertLegible(where, root) {
  const state = await sweep(root);
  assert(!state.missing && !state.low.length, `${where}: ${JSON.stringify(state)}`);
}

async function datesScenario(language, tag) {
  const fr = language === "fr";
  await focus("#preview-dates"); await press("Enter"); await pause(150);
  assert.equal(await evaluate("!!document.querySelector('.modal')"), true, "dates modal open");
  await assertNoOverflow(`${tag} dates`);

  await fill(0, fr ? "08/11/2026" : "11/08/2026");
  assert.equal((await values()).date, "2026-11-08", "typed date stored as ISO");
  assert.equal(await evaluate(`${field(0)}.querySelector('input').value`), fr ? "08/11/2026" : "11/08/2026");
  assert.equal(await evaluate(`${field(0)}.querySelector('input').getAttribute('aria-label')`), fr ? "Date simple" : "Plain date", "field name excludes the calendar button");

  await fill(0, fr ? "31/02/2026" : "02/31/2026");
  assert.equal((await values()).date, "", "invalid date is not stored");
  assert.match(await evaluate("document.querySelector('.brainy-date-error').textContent"), fr ? /JJ\/MM\/AAAA/ : /MM\/DD\/YYYY/);
  assert.equal(await evaluate(`${field(0)}.querySelector('input').getAttribute('aria-invalid')`), "true");
  const errorContrast = await evaluate(`(()=>{${helpers};return textRatio(document.querySelector('.brainy-date-error'))})()`);
  assert(errorContrast >= 4.5, `error contrast ${errorContrast}`);
  await assertNoOverflow(`${tag} error`);
  await capture(`${tag}-error`);
  await focus("#preview-submit"); await press("Enter");
  assert.notEqual(await lastAction(), "submitted", "invalid text blocks submit");
  await fill(0, fr ? "8/11" : "11/8");
  assert.match((await values()).date, /^\d{4}-11-08$/, "short form uses the current year");
  assert.equal(await evaluate("document.querySelector('.brainy-date-error')"), null, "error removed");

  // Calendar by keyboard: Enter opens, arrows move, Enter chooses, focus returns.
  await fill(0, fr ? "08/11/2026" : "11/08/2026");
  await evaluate(`${field(0)}.querySelector('.brainy-date-trigger').focus()`);
  await assertRing(`${tag} trigger`);
  await press("Enter"); await pause(220);
  let now = await active();
  assert(now.isDay, `calendar focuses the current day: ${JSON.stringify(now)}`);
  await assertRing(`${tag} day`);
  const box = await evaluate("(()=>{const c=document.querySelector('.brainy-calendar'),r=c.getBoundingClientRect(),d=c.querySelector('[role=gridcell] button').getBoundingClientRect();return {l:r.left,r:r.right,t:r.top,b:r.bottom,w:innerWidth,h:innerHeight,cell:d.width,cellH:d.height,open:c.matches(':popover-open')}})()");
  assert(box.open && box.l >= 0 && box.r <= box.w && box.t >= 0 && box.b <= box.h, `calendar inside viewport ${JSON.stringify(box)}`);
  assert(box.cellH >= 44 && box.cell >= 40, `day size ${box.cell}x${box.cellH}`);
  const firstDay = await evaluate("document.querySelector('.brainy-calendar-row:nth-child(2) [role=gridcell] button').getAttribute('aria-label')");
  assert.match(firstDay, fr ? /^lundi/ : /^Sunday/, `first column ${firstDay}`);
  const contrast = await evaluate(`(()=>{${helpers};const c=document.querySelector('.brainy-calendar');return {weekday:textRatio(c.querySelector('.brainy-calendar-weekday')),day:textRatio(c.querySelector('[data-outside=false]:not([data-selected=true])')),outside:textRatio(c.querySelector('[data-outside=true]')),selected:textRatio(c.querySelector('[data-selected=true]')),nav:textRatio(c.querySelector('.brainy-calendar-head button')),today:textRatio(c.querySelector('.brainy-calendar-foot button'))}})()`);
  for (const [name, value] of Object.entries(contrast)) assert(value >= 4.5, `${tag} calendar ${name} contrast ${value}`);
  await capture(`${tag}-calendar`);
  await press("ArrowRight"); await press("ArrowDown");
  now = await active();
  assert(now.isDay && (fr ? /16 novembre/ : /November 16/).test(now.text), `arrows move the day: ${now.text}`);
  await press("PageDown");
  now = await active();
  assert((fr ? /16 décembre/ : /December 16/).test(now.text), `PageDown moves a month: ${now.text}`);
  await press("PageUp");
  await press("Enter"); await pause(120);
  now = await active();
  assert(now.trigger, `focus returns to the calendar button: ${JSON.stringify(now)}`);
  assert.equal((await values()).date, "2026-11-16", "calendar selection stored without shift");

  // Tab stays in the calendar; Escape closes it and keeps the dialog.
  await press("Enter"); await pause(220);
  const stops = [];
  for (let i = 0; i < 7; i++) {
    now = await active();
    assert(now.calendar, `Tab stays in calendar: ${JSON.stringify(now)}`);
    stops.push(now.text);
    await assertRing(`${tag} calendar stop ${now.text}`);
    await press("Tab");
  }
  assert.equal(stops[0], stops[6], `Tab cycle wraps: ${stops.join(" | ")}`);
  await press("Escape"); await pause(120);
  now = await active();
  assert(now.trigger && await evaluate("!!document.querySelector('.modal') && !document.querySelector('.brainy-calendar')"), `Escape closes only the calendar: ${JSON.stringify(now)}`);

  // Bounds.
  await fill(1, fr ? "05/11/2026" : "11/05/2026");
  assert.equal((await values()).limited, "", "date below min refused");
  assert.match(await evaluate(`${field(1)}.querySelector('.brainy-date-error').textContent`), /10/);
  await fill(1, fr ? "12/11/2026" : "11/12/2026");
  assert.equal((await values()).limited, "2026-11-12");
  await evaluate(`${field(1)}.querySelector('.brainy-date-trigger').click()`); await pause(220);
  assert.equal(await evaluate(`document.querySelector('.brainy-calendar [aria-label*="${fr ? "9 novembre" : "November 9,"}"]').disabled`), true, "calendar disables days below min");
  await press("Escape"); await pause(100);

  // Date and time: stored as this device's wall clock, without an offset.
  await evaluate(`${field(2)}.querySelector('input').focus()`);
  await type(fr ? "29/03/2026" : "03/29/2026");
  await press("Tab"); await press("Tab");
  await type(fr ? "14h30" : "2:30 PM"); await press("Tab");
  assert.equal((await values()).dateTime, "2026-03-29T14:30", "date and time stored without offset");
  assert.equal(await evaluate(`${field(2)}.querySelector('.brainy-time input').value`), fr ? "14:30" : "2:30 PM");
  assert.equal(await evaluate(`${field(2)}.querySelector('.brainy-time input').getAttribute('aria-label')`), fr ? "Heure" : "Time");
  await fill(3, "0905");
  assert.equal((await values()).time, "09:05");
  await assertNoOverflow(`${tag} dates complete`);
  await assertLegible(`${tag} dates`, ".modal");
  await capture(`${tag}-fields`);

  await press("Escape"); await pause(150);
  assert.equal((await active()).id, "preview-dates", "focus restored after the dialog");
}

async function workspaceScenario(tag) {
  await focus("#preview-tools"); await press("Enter"); await pause(180);
  assert((await active()).inTools, "focus enters workspace tools");
  await assertNoOverflow(`${tag} tools`);
  await evaluate("document.querySelectorAll('.workspace-tools-modal summary').forEach(s=>{if(!s.parentElement.open)s.click()})"); await pause(240);
  await assertNoOverflow(`${tag} tools open`);
  await assertLegible(`${tag} workspace tools`, ".workspace-tools-modal");
  await capture(`${tag}-workspace-tools`);
  await focus(".workspace-tools-modal .icon-button");
  const seen = [];
  for (let i = 0; i < 40; i++) {
    const now = await active();
    assert(now.inTools, `Tab stays in workspace tools: ${JSON.stringify(now)}`);
    const state = await assertRing(`${tag} tools ${now.text}`);
    assert(state.inView, `${tag} focus visible in viewport ${now.text}`);
    const key = `${now.tag}:${now.text}`;
    if (seen.length && key === seen[0]) break;
    seen.push(key);
    await press("Tab");
  }
  assert(seen.length >= 6, `workspace tools stops: ${seen.join(", ")}`);
  await press("Tab", 8);
  assert((await active()).inTools, "Shift+Tab stays in workspace tools");
  await evaluate("document.querySelector('.workspace-tools-modal summary').focus()");
  const wasOpen = await evaluate("document.querySelector('.workspace-tools-modal details').open");
  await press("Enter"); await pause(150);
  assert.notEqual(await evaluate("document.querySelector('.workspace-tools-modal details').open"), wasOpen, "Enter toggles a panel");
  await press("Escape"); await pause(150);
  assert.equal(await evaluate("document.querySelector('.workspace-tools-modal')"), null, "Escape closes workspace tools");
  assert.equal((await active()).id, "preview-tools", "focus restored after workspace tools");
  return seen.length;
}

async function hubScenario(tag) {
  await evaluate("[...document.querySelectorAll('.preview-controls button')].find(b=>b.textContent==='tools').click()"); await pause(180);
  await focus(".collection-tools-toggle");
  await assertRing(`${tag} hub toggle`);
  assert.equal(await evaluate("document.querySelector('.collection-tools-toggle').getAttribute('aria-expanded')"), "false");
  await press("Enter"); await pause(220);
  assert.equal(await evaluate("document.getElementById(document.querySelector('.collection-tools-toggle').getAttribute('aria-controls'))?.className"), "collection-tools-drawer", "toggle controls the drawer");
  assert.equal(await evaluate("document.querySelector('.collection-tools-toggle div')"), null, "no block element inside the toggle");
  await assertNoOverflow(`${tag} hub`);
  await assertLegible(`${tag} hub`, ".collection-tools-wrapper");
  await capture(`${tag}-hub`);
  const count = await evaluate("document.querySelectorAll('.collection-hub-card').length");
  assert.equal(String(count), await evaluate("document.querySelector('.tools-badge').textContent"), "badge matches cards");
  for (let i = 0; i < count; i++) {
    await press("Tab");
    const state = await assertRing(`${tag} hub card ${i}`);
    assert(state.inView, `${tag} card ${i} in viewport`);
    assert.equal(await evaluate("document.activeElement.classList.contains('collection-hub-card')"), true, `Tab order reaches card ${i}`);
  }
  for (const [tool, key] of [["stock", "Enter"], ["ledger", " "]]) {
    await focus(`.collection-hub-card[data-tool="${tool}"]`);
    await press(key); await pause(180);
    assert.equal(await evaluate("document.activeElement.id"), "preview-back", `${tool}: focus moves into the opened section`);
    await assertRing(`${tag} back`);
    await press("Enter"); await pause(220);
    assert.equal(await evaluate("document.activeElement.dataset.tool"), tool, `${tool}: focus returns to its card`);
    assert.equal(await lastAction(), `section:${tool}`, "the keyboard opens a tool");
    assert.equal(await evaluate("!!document.querySelector('.collection-tools-drawer')"), true, "the hub stays open on return");
    await assertRing(`${tag} returned card`);
  }
  await focus(".collection-tools-toggle"); await press("Enter"); await pause(140);
  assert.equal(await evaluate("document.querySelector('.collection-tools-drawer')"), null, "Enter collapses the hub");
  return count;
}

async function drawerToToolsScenario() {
  await evaluate("[...document.querySelectorAll('.preview-controls button')].find(b=>b.textContent==='Collections').focus()");
  await press("Enter"); await pause(340);
  await evaluate("[...document.querySelectorAll('.mobile-drawer-panel button')].find(b=>/Outils|Workspace tools/.test(b.textContent)).focus()");
  await press("Enter"); await pause(460);
  const inside = await active();
  assert(inside.inTools, `drawer opens tools with focus inside: ${JSON.stringify(inside)}`);
  await press("Escape"); await pause(320);
  assert.equal(await evaluate("document.querySelector('.workspace-tools-modal')"), null);
  assert.equal(await evaluate("document.activeElement===document.body"), false, "focus does not fall back to the page after drawer and tools");
}

await send("Runtime.enable");
await send("Page.enable");
await send("Page.bringToFront");
await send("Emulation.setFocusEmulationEnabled", { enabled: true });
await send("Page.navigate", { url: "http://localhost:3001/phase-two-b-preview" });
await pause(4000);
const results = [];
for (const width of [320, 390, 1280]) for (const theme of ["light", "dark"]) for (const language of ["fr", "en"]) {
  await send("Emulation.setDeviceMetricsOverride", { width, height: 780, deviceScaleFactor: 1, mobile: width < 700 });
  await send("Page.reload"); await pause(1600);
  await evaluate("new Promise(r=>{const t=()=>document.querySelector('.preview-controls')?r():setTimeout(t,50);t()})");
  await pause(250);
  const tag = `${width}-${theme}-${language}`;
  await evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme)}`);
  if (language === "en") await evaluate("[...document.querySelectorAll('.preview-controls button')].find(b=>b.textContent==='Language').click()");
  await pause(200);
  await datesScenario(language, tag);
  const toolStops = await workspaceScenario(tag);
  const cards = await hubScenario(tag);
  if (width < 700) await drawerToToolsScenario();
  results.push({ tag, toolStops, cards, page: (await overflow()).page });
  console.log("ok", tag, `tool stops ${toolStops}, hub cards ${cards}`);
}
assert.deepEqual(errors, [], "no page exceptions");
await writeFile(new URL("metrics.json", output), JSON.stringify(results, null, 2));
console.log(`${results.length} combinations passed`);
ws.close();
