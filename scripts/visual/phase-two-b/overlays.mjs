import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const output = new URL('../../../.visual-checks/collection-overlays/', import.meta.url);
await mkdir(output, { recursive: true });
const targets = await (await fetch('http://127.0.0.1:9226/json')).json();
const ws = new WebSocket(targets.find((target) => target.type === 'page').webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
let serial = 0;
const pending = new Map();
ws.onmessage = ({ data }) => {
  const message = JSON.parse(data), item = pending.get(message.id);
  if (!item) return;
  pending.delete(message.id); clearTimeout(item.timer);
  if (message.error) item.reject(Error(message.error.message)); else item.resolve(message.result);
};
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++serial;
  const timer = setTimeout(() => reject(Error(`Timeout: ${method}`)), 30000);
  pending.set(id, { resolve, reject, timer }); ws.send(JSON.stringify({ id, method, params }));
});
const pause = (ms = 180) => new Promise((resolve) => setTimeout(resolve, ms));
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
async function click(selector) {
  const point = await evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 });
  await pause();
}
async function key(key, code) {
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key, windowsVirtualKeyCode: code });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key, windowsVirtualKeyCode: code });
  await pause();
}
async function capture(name) {
  const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await writeFile(new URL(`${name}.png`, output), Buffer.from(data, 'base64'));
}
const contrastHelpers = `
const rgb=s=>s.match(/[\\d.]+/g).map(Number);
const lum=c=>c.slice(0,3).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4}).reduce((s,x,i)=>s+x*[.2126,.7152,.0722][i],0);
const ratio=(a,b,base='rgb(255,255,255)')=>{const bg=rgb(b),alpha=bg[3]??1,under=rgb(base);const x=lum(rgb(a)),y=lum(bg.slice(0,3).map((v,i)=>v*alpha+under[i]*(1-alpha)));return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
const css=getComputedStyle;
`;
const metrics = [];
try {
  await send('Page.navigate', { url: 'http://localhost:3001/phase-two-b-preview' });
  for (let attempt = 0; attempt < 100; attempt++) {
    if (await evaluate(`!!document.querySelector('.format-menu-trigger')`)) break;
    await pause(300);
  }
  await pause(1500);
  for (const width of [320, 390, 1280]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
    for (const theme of ['light', 'dark']) for (const language of ['fr', 'en']) {
      await evaluate(`document.documentElement.dataset.theme='${theme}';document.querySelector('.workspace').scrollTop=0;document.querySelector('.language-picker-menu [lang="${language}"]').click();document.querySelector('.language-picker').open=false`);
      await pause(260);
      const hero = await evaluate(`(()=>{${contrastHelpers}const e=document.querySelector('.collection-hero'),c=css(e),r=e.getBoundingClientRect();return {contrast:ratio(css(e.querySelector('h1')).color,c.backgroundColor),metadata:ratio(css(e.querySelector('.collection-meta')).color,c.backgroundColor),blue:c.backgroundColor,width:r.width,height:r.height,fits:r.left>=0&&r.right<=innerWidth}})()`);
      assert(hero.contrast >= 4.5 && hero.metadata >= 4.5 && hero.fits, JSON.stringify({ width, theme, hero }));
      assert(hero.blue === (theme === 'dark' ? 'rgb(48, 79, 96)' : 'rgb(214, 238, 249)'), hero.blue);
      if (width === 1280) assert(hero.height >= 184 && hero.width >= 900, 'Collection header must be spacious');
      await capture(`collection-${theme}-${language}-${width}`);
      await click('.collection-hero-more summary');
      const manage = await evaluate(`(()=>{${contrastHelpers}const m=document.querySelector('.collection-hero-menu'),r=m.getBoundingClientRect();return {fits:r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight,contrast:[...m.querySelectorAll('button')].map(b=>ratio(css(b).color,css(m).backgroundColor)),hits:[...m.querySelectorAll('button')].map(b=>{const x=b.getBoundingClientRect();return b.contains(document.elementFromPoint(x.x+x.width/2,x.y+x.height/2))})}})()`);
      assert(manage.fits && manage.contrast.every(value => value >= 4.5) && manage.hits.every(Boolean), JSON.stringify(manage));
      await capture(`manage-${theme}-${language}-${width}`);
      await key('Escape', 27);
      assert.equal(await evaluate(`document.querySelector('.collection-hero-more').open`), false);
      await click('.language-picker summary');
      assert.equal(await evaluate(`document.querySelector('.language-picker').open`), true);
      const languageContrast = await evaluate(`(()=>{${contrastHelpers}const m=document.querySelector('.language-picker-menu');return [...m.querySelectorAll('button')].map(b=>ratio(css(b).color,css(b).backgroundColor,css(m).backgroundColor))})()`);
      assert(languageContrast.every((ratio) => ratio >= 4.5), `Language contrast ${languageContrast}`);
      await capture(`language-${theme}-${language}-${width}`);
      await click(`.language-picker-menu [lang="${language === 'fr' ? 'en' : 'fr'}"]`);
      assert.equal(await evaluate(`document.querySelector('.language-picker').open`), false);
      assert.equal(await evaluate(`document.activeElement===document.querySelector('.language-picker summary')`), true);
      await evaluate(`document.querySelector('.language-picker').open=true;document.querySelector('.language-picker-menu [lang="${language}"]').click();document.querySelector('.format-menu-trigger').scrollIntoView({block:'center'})`);
      await pause();
      await click('.format-menu-trigger');
      const menu = await evaluate(`(()=>{const m=document.querySelector('.format-card-menu:popover-open'),r=m.getBoundingClientRect();return {fits:r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight,hits:[...m.querySelectorAll('button')].map(b=>{const x=b.getBoundingClientRect();return b.contains(document.elementFromPoint(x.x+x.width/2,x.y+x.height/2))})}})()`);
      assert(menu.fits && menu.hits.length === 4 && menu.hits.every(Boolean), `Clipped actions ${JSON.stringify(menu)}`);
      await capture(`actions-${theme}-${language}-${width}`);
      await key('ArrowDown', 40);
      assert.equal(await evaluate(`document.activeElement===document.querySelector('.format-card-menu:popover-open button:nth-child(2)')`), true);
      await key('Escape', 27);
      assert.equal(await evaluate(`!!document.querySelector(':popover-open')`), false);
      assert.equal(await evaluate(`document.activeElement===document.querySelector('.format-menu-trigger')`), true);
      await click('.format-menu-trigger');
      await click('.format-card-menu:popover-open button');
      assert.equal(await evaluate(`document.querySelector('[data-last-action]').dataset.lastAction`), 'edit:f0');
      await click('.format-menu-trigger');
      await click('.format-card-title');
      assert.equal(await evaluate(`!!document.querySelector(':popover-open')`), false, 'Outside click must close actions');
      await evaluate(`document.querySelector('.format-menu-trigger').scrollIntoView({block:'end'})`);
      await pause();
      await click('.format-menu-trigger');
      assert.equal(await evaluate(`document.querySelector('.format-card-menu:popover-open').getBoundingClientRect().bottom<=innerHeight`), true);
      await key('Escape', 27);
      metrics.push({ width, theme, language, hero, languageContrast, menu, manage });
    }
  }
  await writeFile(new URL('metrics.json', output), JSON.stringify(metrics, null, 2));
  console.log('PASS: 12 header/language/action-menu configurations; contrast, hit testing, viewport edges, selection, outside click, keyboard and focus restoration.');
} finally { ws.close(); }
