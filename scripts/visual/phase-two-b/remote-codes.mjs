// Large code lists (T39/3) and referential import (T39/1). Run after check.mjs --prepare,
// with the dev server and the dedicated Chrome from README.md. The GraphQL API is
// simulated by intercepting /api/graphql: synthetic data only, no account needed.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const output = new URL("../../../.visual-checks/remote-codes/", import.meta.url);
await mkdir(output, { recursive: true });

// 10 regions, 100 departments, 5,890 towns, as the API smoke test imports.
const codes = [];
for (let r = 1; r <= 10; r++) codes.push({ code: `R${r}`, fr: `Région ${r}`, en: `Region ${r}` });
for (let d = 1; d <= 100; d++) codes.push({ code: `D${d}`, fr: `Département ${d}`, en: `Department ${d}`, parent: `R${((d - 1) % 10) + 1}` });
for (let t = 1; t <= 5890; t++) codes.push({ code: `T${t}`, fr: `Commune Évry ${t}`, en: `Town ${t}`, parent: `D${((t - 1) % 100) + 1}` });
const byCode = new Map(codes.map((item) => [item.code, item]));
const fold = (text) => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const searches = [];
function respond(body) {
  const { query, variables } = JSON.parse(body);
  if (query.includes("searchClassificationCodes")) {
    searches.push(variables);
    const lang = variables.lang === "fr" ? "fr" : "en";
    const q = variables.q ? fold(variables.q) : "";
    const found = codes.filter((item) => q ? fold(`${item.code} ${item.en} ${item.fr}`).includes(q) : (item.parent ?? "") === (variables.p ?? "")).slice(0, 50);
    const path = (item) => { const out = []; for (let parent = byCode.get(item.parent); parent; parent = byCode.get(parent.parent)) out.unshift(parent[lang]); return out; };
    return { data: { searchClassificationCodes: found.map((item) => ({ code: item.code, label: item[lang], path: path(item), level: path(item).length + 1, active: true, hasChildren: codes.some((child) => child.parent === item.code) })) } };
  }
  if (query.includes("classificationCodesByValue")) return { data: { classificationCodesByValue: variables.codes.map((code) => byCode.get(code)).filter(Boolean).map((item) => ({ code: item.code, labelEn: item.en, labelFr: item.fr, parentCode: item.parent ?? null, active: true })) } };
  if (query.includes("previewReferential")) {
    const lines = variables.c.trim().split(/\r?\n/);
    const repeated = lines.findIndex((line, index) => index > 0 && lines.slice(1, index).some((other) => other.split(/[;,]/)[0] === line.split(/[;,]/)[0]));
    return { data: { previewReferential: { codeCount: lines.length - 1, levels: 2, large: lines.length - 1 > 5000, errors: repeated > 0 ? [{ row: repeated + 1, message: `Repeated code ${lines[repeated].split(/[;,]/)[0]}` }] : [], sample: lines.slice(1, 4).map((line) => { const [code, label] = line.split(/[;,]/); return { code, labelEn: label, labelFr: label, parentCode: null, active: true }; }) } } };
  }
  return { data: {} };
}

const targets = await (await fetch("http://127.0.0.1:9226/json")).json();
const ws = new WebSocket(targets.find((target) => target.type === "page").webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
let serial = 0;
const pending = new Map();
const errors = [];
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++serial;
  const timer = setTimeout(() => reject(Error(`Timeout: ${method}`)), 30000);
  pending.set(id, { resolve, reject, timer }); ws.send(JSON.stringify({ id, method, params }));
});
ws.onmessage = ({ data }) => {
  const message = JSON.parse(data), item = pending.get(message.id);
  if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
  if (message.method === "Fetch.requestPaused") {
    const { requestId, request } = message.params;
    const body = JSON.stringify(respond(request.postData ?? "{}"));
    void send("Fetch.fulfillRequest", { requestId, responseCode: 200, responseHeaders: [{ name: "Content-Type", value: "application/json" }], body: Buffer.from(body).toString("base64") }).catch(() => undefined);
  }
  if (!item) return;
  pending.delete(message.id); clearTimeout(item.timer);
  if (message.error) item.reject(Error(message.error.message)); else item.resolve(message.result);
};
const pause = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));
async function evaluate(expression) {
  const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw Error(`${expression.slice(0, 140)}: ${JSON.stringify(result.exceptionDetails).slice(0, 300)}`);
  return result.result.value;
}
const codesOf = { ArrowDown: 40, ArrowUp: 38, ArrowRight: 39, ArrowLeft: 37, Enter: 13, Escape: 27 };
async function press(key) {
  await send("Input.dispatchKeyEvent", { type: "rawKeyDown", key, code: key, windowsVirtualKeyCode: codesOf[key], ...(key === "Enter" ? { text: "\r" } : {}) });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key, code: key, windowsVirtualKeyCode: codesOf[key] });
  await pause(200);
}
async function type(text) { await send("Input.insertText", { text }); await pause(500); }
async function capture(name) {
  const { data } = await send("Page.captureScreenshot", { format: "png" });
  await writeFile(new URL(`${name}.png`, output), Buffer.from(data, "base64"));
}
const rows = () => evaluate("[...document.querySelectorAll('.code-picker-panel .code-browser-row')].map(r=>({code:r.querySelector('code').textContent,label:r.querySelector('.code-browser-label').textContent,path:r.querySelector('.code-browser-path')?.textContent??'',active:r.dataset.active==='true'}))");
const layout = () => evaluate("(()=>{const d=document.documentElement,p=document.querySelector('.code-picker-panel');const r=p?.getBoundingClientRect();return {page:d.scrollWidth-innerWidth,panel:r?r.left>=0&&r.right<=innerWidth:true}})()");

async function scenario(language, tag) {
  const fr = language === "fr";
  await evaluate("[...document.querySelectorAll('.preview-controls button')].find(b=>b.textContent==='large').click()");
  await pause(600);
  // The saved code shows its label, fetched by value.
  const shown = await evaluate("document.querySelector('.code-picker-trigger').textContent");
  assert.match(shown, fr ? /Commune Évry 11/ : /Town 11/, `${tag} saved label ${shown}`);
  await evaluate("document.querySelector('.code-picker-trigger').click()");
  await pause(600);
  // Roots first, then a level opens with →, ← goes back.
  let list = await rows();
  assert.equal(list.length, 10, `${tag} roots`);
  assert.equal(list[0].code, "R1");
  await press("ArrowRight");
  await pause(300);
  list = await rows();
  assert.ok(list.length === 10 && list.every((row) => row.code.startsWith("D")), `${tag} departments of R1 ${JSON.stringify(list.slice(0, 2))}`);
  assert.match(await evaluate("document.querySelector('.remote-code-trail small').textContent"), fr ? /Région 1/ : /Region 1/);
  await capture(`${tag}-level`);
  await press("ArrowLeft");
  await pause(300);
  assert.equal((await rows()).length, 10, `${tag} back to roots`);
  // Search ignores accents, shows the path, stops at 50, and Enter chooses.
  await type("evry 589");
  list = await rows();
  assert.ok(list.length > 0 && list.length <= 50 && list.every((row) => row.code.includes("589")), `${tag} search ${list.length}`);
  assert.match(list.find((row) => row.code === "T5890").path, fr ? /Région 10 › Département 90/ : /Region 10 › Department 90/);
  const lastSearch = searches.at(-1);
  assert.equal(lastSearch.q, "evry 589", "debounced: one request for the whole word");
  const state = await layout();
  assert(state.page <= 0 && state.panel, `${tag} layout ${JSON.stringify(state)}`);
  await capture(`${tag}-search`);
  while (!(await rows()).find((row) => row.active)?.code.startsWith("T5890")) await press("ArrowDown");
  await press("Enter");
  assert.equal(await evaluate("document.querySelector('.large-value').textContent"), "T5890");
  assert.match(await evaluate("document.querySelector('.code-picker-trigger').textContent"), fr ? /Commune Évry 5890/ : /Town 5890/);
  // Referential import: preview, then a repeated code blocks the import.
  const content = ["code;label", ...Array.from({ length: 6000 }, (_, i) => `C${i};Code ${i}`), "C5;Again"].join("\n");
  await evaluate(`(()=>{const input=document.querySelector('.referential-file input');const data=new DataTransfer();data.items.add(new File([${JSON.stringify(content)}],'communes.csv',{type:'text/csv'}));input.files=data.files;input.dispatchEvent(new Event('change',{bubbles:true}))})()`);
  await pause(800);
  const preview = await evaluate("(()=>({text:document.querySelector('.referential-preview')?.textContent??'',name:document.querySelector('.referential-import input:not([type=file])').value,disabled:document.querySelector('.referential-import .btn').disabled}))()");
  assert.match(preview.text, fr ? /6\s?001 codes sur 2 niveaux/ : /6,001 codes on 2 levels/, `${tag} preview ${preview.text}`);
  assert.match(preview.text, fr ? /Ligne 6002/ : /Row 6002/);
  assert.equal(preview.name, "communes", "the file name proposes the list name");
  assert.equal(preview.disabled, true, "an error blocks the import");
  await capture(`${tag}-import`);
}

await send("Runtime.enable");
await send("Page.enable");
await send("Fetch.enable", { patterns: [{ urlPattern: "*/api/graphql*" }] });
await send("Page.navigate", { url: "http://localhost:3001/phase-two-b-preview" });
await pause(4000);
let done = 0;
for (const width of [320, 390, 1280]) for (const theme of ["light", "dark"]) for (const language of ["fr", "en"]) {
  await send("Emulation.setDeviceMetricsOverride", { width, height: 780, deviceScaleFactor: 1, mobile: false });
  await send("Page.reload"); await pause(1600);
  await evaluate("new Promise(r=>{const t=()=>document.querySelector('.preview-controls')?r():setTimeout(t,50);t()})");
  await evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme)}`);
  if (language === "en") await evaluate("[...document.querySelectorAll('.preview-controls button')].find(b=>b.textContent==='Language').click()");
  await pause(200);
  const tag = `${width}-${theme}-${language}`;
  await scenario(language, tag);
  done += 1;
  console.log("ok", tag);
}
assert.deepEqual(errors, [], "no page exceptions");
console.log(`PASS: ${done} large code list configurations.`);
ws.close();
