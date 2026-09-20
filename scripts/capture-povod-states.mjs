import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const options = Object.fromEntries(process.argv.slice(2).map(argument => {
  const [key, ...value] = argument.replace(/^--/, '').split('=');
  return [key, value.join('=')];
}));
const states = ['loading', 'empty', 'error', 'offline'];
const widths = (options.widths || '360,390,430').split(',').map(Number).filter(Number.isInteger);
const height = 844;
const targetOrigin = process.env.POVOD_CAPTURE_URL ?? 'http://127.0.0.1:4173/';
const outputDir = path.resolve(options.output || 'artifacts/ui-povod-v1/states');
const browserCandidates = [
  process.env.POVOD_BROWSER_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean);
const browserPath = browserCandidates.find(candidate => existsSync(candidate));
if (!browserPath) throw new Error('Chrome or Edge not found. Set POVOD_BROWSER_PATH.');

await mkdir(outputDir, { recursive: true });
const profileDir = await mkdtemp(path.join(tmpdir(), 'povod-states-capture-'));
const browser = spawn(browserPath, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--remote-debugging-port=0',
  `--user-data-dir=${profileDir}`, 'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });

function waitForDebugger() {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timed out waiting for the browser debugger.')), 15_000);
    let buffered = '';
    browser.stderr.setEncoding('utf8');
    browser.stderr.on('data', chunk => {
      buffered += chunk;
      const match = buffered.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) { clearTimeout(timer); resolve(match[1]); }
    });
    browser.once('exit', code => { clearTimeout(timer); reject(new Error(`Browser exited before capture (${code ?? 'unknown'}).`)); });
  });
}

const socket = new WebSocket(await waitForDebugger());
const pending = new Map();
const eventWaiters = new Set();
let sequence = 0;
socket.addEventListener('message', ({ data }) => {
  const message = JSON.parse(data);
  if (message.id) {
    const operation = pending.get(message.id);
    if (!operation) return;
    pending.delete(message.id);
    if (message.error) operation.reject(new Error(message.error.message));
    else operation.resolve(message.result);
    return;
  }
  for (const waiter of eventWaiters) {
    if (waiter.method === message.method && (!waiter.sessionId || waiter.sessionId === message.sessionId)) {
      eventWaiters.delete(waiter);
      waiter.resolve(message.params);
    }
  }
});
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});

function send(method, params = {}, sessionId) {
  const id = ++sequence;
  socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}
function waitForEvent(method, sessionId) {
  return new Promise(resolve => eventWaiters.add({ method, sessionId, resolve }));
}

async function openState(state, width, reducedMotion = true) {
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  await send('Runtime.enable', {}, sessionId);
  await send('Emulation.setDeviceMetricsOverride', {
    width, height, deviceScaleFactor: 1, mobile: true, screenWidth: width, screenHeight: height,
  }, sessionId);
  if (reducedMotion) {
    await send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    }, sessionId);
  }
  const loaded = waitForEvent('Page.loadEventFired', sessionId);
  const url = new URL(targetOrigin);
  url.searchParams.set('design', state);
  await send('Page.navigate', { url: url.toString() }, sessionId);
  await loaded;
  await send('Runtime.evaluate', {
    expression: `(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(image=>image.complete?true:new Promise(resolve=>{image.addEventListener('load',resolve,{once:true});image.addEventListener('error',resolve,{once:true})})));await new Promise(resolve=>setTimeout(resolve,120));return true})()`,
    awaitPromise: true, returnByValue: true,
  }, sessionId);
  return { targetId, sessionId };
}

async function evaluate(sessionId, expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId);
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Browser evaluation failed');
  return result.result.value;
}

async function auditAction(state, selector, expectedDesign) {
  const page = await openState(state, 390);
  const loaded = waitForEvent('Page.loadEventFired', page.sessionId);
  const clicked = await evaluate(page.sessionId, `(()=>{const action=document.querySelector(${JSON.stringify(selector)});if(!action)return false;action.click();return true})()`);
  if (!clicked) throw new Error(`Missing action ${selector} in ${state}`);
  await Promise.race([loaded, new Promise((_, reject) => setTimeout(() => reject(new Error(`Navigation timeout for ${state}`)), 5_000))]);
  const actual = await evaluate(page.sessionId, `new URL(location.href).searchParams.get('design')`);
  await send('Target.closeTarget', { targetId: page.targetId });
  if (actual !== expectedDesign) throw new Error(`${state} ${selector} navigated to ${actual}, expected ${expectedDesign}`);
  return { state, selector, expectedDesign, actual };
}

const audit = { captures: [], actions: [], reducedMotion: null, offlineCachedCards: 0 };
try {
  for (const state of states) {
    for (const width of widths) {
      const page = await openState(state, width);
      const { data } = await send('Page.captureScreenshot', {
        format: 'png', fromSurface: true, captureBeyondViewport: false,
      }, page.sessionId);
      const file = path.join(outputDir, `${state}-${width}.png`);
      await writeFile(file, Buffer.from(data, 'base64'));
      audit.captures.push({ state, width, height, file: path.basename(file) });
      await send('Target.closeTarget', { targetId: page.targetId });
      process.stdout.write(`captured ${state} ${width}x${height}\n`);
    }
  }

  const reducedPage = await openState('loading', 390, true);
  audit.reducedMotion = await evaluate(reducedPage.sessionId, `(()=>{const style=getComputedStyle(document.querySelector('.skeleton'));return {animationName:style.animationName,animationDuration:style.animationDuration}})()`);
  await send('Target.closeTarget', { targetId: reducedPage.targetId });
  if (audit.reducedMotion.animationName !== 'none') throw new Error(`Reduced motion left skeleton animation enabled: ${JSON.stringify(audit.reducedMotion)}`);

  const offlinePage = await openState('offline', 390);
  audit.offlineCachedCards = await evaluate(offlinePage.sessionId, `document.querySelectorAll('.offline-content .event-list-card').length`);
  await send('Target.closeTarget', { targetId: offlinePage.targetId });
  if (audit.offlineCachedCards !== 2) throw new Error(`Offline preview rendered ${audit.offlineCachedCards} cached cards, expected 2`);

  audit.actions.push(await auditAction('error', '[data-state-action="retry"]', 'home'));
  audit.actions.push(await auditAction('empty', '[data-state-action="reset-filters"]', 'home'));
  await writeFile(path.join(outputDir, 'state-capture-audit.json'), `${JSON.stringify(audit, null, 2)}\n`);
  process.stdout.write('state action, cached-content, and reduced-motion audits passed\n');
} finally {
  try { await send('Browser.close'); } catch { browser.kill(); }
  socket.close();
  if (browser.exitCode === null) await Promise.race([once(browser, 'exit'), new Promise(resolve => setTimeout(resolve, 3_000))]);
  await rm(profileDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
