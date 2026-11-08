// Hierarchical code picker. Run after check.mjs --prepare, with the dev server and the
// dedicated Chrome from README.md. Synthetic data only.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { buildCodeTree, descendantCodes, foldText, maxCodeLevels, reachableCodes, searchCodes } from "../../../lib/code-tree.ts";

const code = (id, labelFr, parentCode, active = true) => ({ code: id, labelEn: `${labelFr} EN`, labelFr, parentCode, active });
const sample = [code("G", "Commerce"), code("47", "Vente de détail", "G"), code("47.1", "Magasins non spécialisés", "47"), code("47.11B", "Commerce d'alimentation générale", "47.1"), code("47.2", "Épicerie fine", "47"), code("OLD", "Ancien code", "47", false), code("A", "Agriculture"), code("01", "Alimentation animale", "A")];
{
  assert.equal(foldText("Épicerie Œuvre"), "epicerie oeuvre");
  const tree = buildCodeTree(sample, "fr");
  assert.deepEqual(tree.nodes.get("47.11B").path, ["Commerce", "Vente de détail", "Magasins non spécialisés"]);
  assert.equal(tree.nodes.get("47.11B").level, 4);
  assert.deepEqual(tree.roots, ["G", "A"]);
  const all = () => true;
  assert.deepEqual(searchCodes(tree, "epice", all).results.map((node) => node.code), ["47.2"], "accents are ignored");
  assert.deepEqual(searchCodes(tree, "ÉPICE", all).results.map((node) => node.code), ["47.2"], "case is ignored");
  assert.deepEqual(searchCodes(tree, "alim", all).results.map((node) => node.code), ["01", "47.11B"], "a label start ranks before a word inside");
  assert.equal(searchCodes(tree, "47", all).results[0].code, "47", "code fragments match first");
  assert.deepEqual([...descendantCodes(tree, "47")].sort(), ["47.1", "47.11B", "47.2", "OLD"]);
  assert.equal(maxCodeLevels(sample), 4);
  assert.deepEqual([...reachableCodes(tree, (node) => node.code === "47.11B")].sort(), ["47", "47.1", "47.11B", "G"], "ancestors of a choice stay reachable");
  const cyclic = buildCodeTree([code("a", "A", "b"), code("b", "B", "a")], "fr");
  assert.equal(cyclic.nodes.size, 2, "a draft with a cycle does not hang");
  assert.equal(searchCodes(buildCodeTree(Array.from({ length: 200 }, (_, i) => code(`c${i}`, "Même nom")), "fr"), "meme", all, 60).total, 200);
}
console.log("PASS: code tree.");
if (process.argv.includes("--logic")) process.exit(0);

const output = new URL("../../../.visual-checks/code-picker/", import.meta.url);
await mkdir(output, { recursive: true });
const targets = await (await fetch("http://127.0.0.1:9226/json")).json();
const ws = new WebSocket(targets.find((target) => target.type === "page").webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
let serial = 0;
const pending = new Map();
const errors = [];
ws.onmessage = ({ data }) => { const m = JSON.parse(data), item = pending.get(m.id); if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text); if (!item) return; pending.delete(m.id); clearTimeout(item.timer); if (m.error) item.reject(Error(m.error.message)); else item.resolve(m.result); };
const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++serial; const timer = setTimeout(() => reject(Error(`Timeout: ${method}`)), 30000); pending.set(id, { resolve, reject, timer }); ws.send(JSON.stringify({ id, method, params })); });
const pause = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));
async function evaluate(expression) { const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw Error(`${expression.slice(0, 120)}: ${JSON.stringify(r.exceptionDetails).slice(0, 300)}`); return r.result.value; }
const codes = { Enter: 13, Escape: 27, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40, Backspace: 8 };
async function press(key) { const text = key === "Enter" ? { text: "\r" } : {}; await send("Input.dispatchKeyEvent", { type: text.text ? "keyDown" : "rawKeyDown", key, code: key, windowsVirtualKeyCode: codes[key], ...text }); await send("Input.dispatchKeyEvent", { type: "keyUp", key, code: key, windowsVirtualKeyCode: codes[key] }); await pause(); }
const type = async (text) => { await send("Input.insertText", { text }); await pause(160); };
const capture = async (name) => { const { data } = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }); await writeFile(new URL(`${name}.png`, output), Buffer.from(data, "base64")); };
const clearSearch = async () => { await evaluate("(()=>{const i=document.querySelector('.code-browser-search input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,'');i.dispatchEvent(new Event('input',{bubbles:true}))})()"); await pause(160); };
const rows = () => evaluate("[...document.querySelectorAll('.code-picker-panel .code-browser-row')].map(r=>({code:r.querySelector('.code-browser-code').textContent,path:r.querySelector('.code-browser-path')?.textContent??'',role:r.getAttribute('role'),active:r.dataset.active==='true',level:r.getAttribute('aria-level'),expanded:r.getAttribute('aria-expanded'),disabled:r.getAttribute('aria-disabled')}))");
const activeCode = async () => (await rows()).find((row) => row.active)?.code;
const trigger = "document.querySelector('.modal .code-picker-trigger')";

async function scenario(language, tag) {
  const fr = language === "fr";
  await evaluate("document.querySelector('#preview-codes').click()"); await pause(220);
  await evaluate(`${trigger}.focus()`);
  await press("Enter"); await pause(240);
  assert.equal(await evaluate("document.activeElement.getAttribute('role')"), "combobox", "focus goes to the search box");
  const panel = await evaluate("(()=>{const p=document.querySelector('.code-picker-panel'),r=p.getBoundingClientRect();return {open:p.matches(':popover-open'),in:r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight,page:document.documentElement.scrollWidth-innerWidth,row:Math.min(...[...p.querySelectorAll('.code-browser-row')].map(x=>x.getBoundingClientRect().height))}})()");
  assert(panel.open && panel.in && panel.page <= 0 && panel.row >= 44, `${tag} panel ${JSON.stringify(panel)}`);
  const inset = await evaluate("(()=>{const i=document.querySelector('.code-browser-search input'),g=document.querySelector('.code-browser-search svg');return {text:i.getBoundingClientRect().left+parseFloat(getComputedStyle(i).paddingLeft),icon:g.getBoundingClientRect().right}})()");
  assert(inset.text >= inset.icon, `${tag} the search icon overlaps the text ${JSON.stringify(inset)}`);
  let list = await rows();
  assert.deepEqual(list.map((row) => row.code), ["G", "A", "H"], "the tree starts folded");
  assert.equal(list[0].role, "treeitem");

  // Expand with the keyboard, down five levels.
  for (const expected of ["47", "47.1", "47.11", "47.11B"]) { await press("ArrowRight"); await press("ArrowRight"); assert.equal(await activeCode(), expected, `${tag} descend to ${expected}`); }
  list = await rows();
  assert.equal(list.find((row) => row.code === "47.11B").level, "5", "five levels deep");
  await capture(`${tag}-tree`);
  await press("ArrowLeft");
  assert.equal(await activeCode(), "47.11", "left goes to the parent");
  await press("ArrowLeft");
  assert.equal((await rows()).some((row) => row.code === "47.11B"), false, "left collapses the branch");

  // Search: accent and case free, breadcrumb on homonyms, code fragments.
  await type(fr ? "ALIMENT" : "FOOD");
  list = await rows();
  assert(list.length >= 2 && list.every((row) => row.role === "option"), `${tag} results ${JSON.stringify(list)}`);
  assert.equal(new Set(list.map((row) => row.path)).size, list.length, "homonyms are told apart by their path");
  assert.match(list.find((row) => row.code === "47.11B").path, fr ? /^Commerce › Vente de détail › Magasins non spécialisés › / : /^Trade › Retail › Non-specialised stores › /);
  await capture(`${tag}-search`);
  if (fr) { await clearSearch(); await type("epice"); assert.deepEqual((await rows()).map((row) => row.code), ["47.2"], "accents are ignored"); }
  await clearSearch(); await type("47.11");
  assert.equal((await rows())[0].code, "47.11", "a code fragment finds the code");
  assert.equal((await rows()).some((row) => row.code === "OLD"), false, "obsolete codes are not offered");
  await press("ArrowDown");
  assert.equal(await activeCode(), "47.11B");
  await press("Enter"); await pause(200);
  assert.equal(await evaluate("document.querySelector('.code-picker-panel')"), null, "choosing closes the panel");
  assert.equal(await evaluate("document.activeElement.className"), "code-picker-trigger", "focus returns to the button");
  assert.equal(await evaluate("document.querySelector('[data-code-value]').dataset.codeValue"), "47.11B", "the code is stored");
  const shown = await evaluate(`${trigger}.innerText.replace(/\\n/g,' | ')`);
  assert.match(shown, fr ? /Commerce › Vente de détail/ : /Trade › Retail/, "the button shows the path");
  assert.match(await evaluate(`${trigger}.getAttribute('aria-label')`), /^(Activité|Activity): /, "name of the field and value");
  await capture(`${tag}-chosen`);

  // Reopening reveals the chosen code; Escape leaves the dialog open.
  await press("Enter"); await pause(240);
  assert.equal((await rows()).some((row) => row.code === "47.11B"), true, "the tree opens on the chosen code");
  const contrast = await evaluate(String.raw`(()=>{const rgb=s=>s.match(/[\d.]+/g).map(Number),lum=c=>c.slice(0,3).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4}).reduce((s,x,i)=>s+x*[.2126,.7152,.0722][i],0),ratio=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};const p=document.querySelector('.code-picker-panel'),bg=rgb(getComputedStyle(p).backgroundColor),t=e=>ratio(rgb(getComputedStyle(e).color),bg);return {code:t(p.querySelector('.code-browser-code')),label:t(p.querySelector('.code-browser-label'))}})()`);
  assert(contrast.code >= 4.5 && contrast.label >= 4.5, `${tag} contrast ${JSON.stringify(contrast)}`);
  await press("Escape"); await pause(160);
  assert.equal(await evaluate("!!document.querySelector('.modal') && !document.querySelector('.code-picker-panel')"), true, "Escape closes only the panel");
  await evaluate(`${trigger}.click()`); await pause(220);
  await evaluate("document.querySelector('.code-browser-clear').click()"); await pause(180);
  assert.equal(await evaluate("document.querySelector('[data-code-value]').dataset.codeValue"), "", "the value can be cleared");
  await evaluate("document.querySelector('.modal .icon-button').click()"); await pause(200);
}

await send("Runtime.enable"); await send("Page.enable"); await send("Page.bringToFront");
await send("Emulation.setFocusEmulationEnabled", { enabled: true });
await send("Page.navigate", { url: "http://localhost:3001/phase-two-b-preview" });
await pause(4000);
let done = 0;
for (const width of [320, 390, 1280]) for (const theme of ["light", "dark"]) for (const language of ["fr", "en"]) {
  await send("Emulation.setDeviceMetricsOverride", { width, height: 780, deviceScaleFactor: 1, mobile: false });
  await send("Page.reload"); await pause(1600);
  await evaluate("new Promise(r=>{const t=()=>document.querySelector('.preview-controls')?r():setTimeout(t,50);t()})");
  await pause(250);
  await evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme)}`);
  if (language === "en") await evaluate("[...document.querySelectorAll('.preview-controls button')].find(b=>b.textContent==='Language').click()");
  await pause(200);
  await scenario(language, `${width}-${theme}-${language}`);
  done += 1;
  console.log("ok", `${width}-${theme}-${language}`);
}
assert.deepEqual(errors, [], "no page exceptions");
console.log(`PASS: ${done} code picker configurations.`);
ws.close();
