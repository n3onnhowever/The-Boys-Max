import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const options = Object.fromEntries(process.argv.slice(2).map(argument => {
  const [key, ...value] = argument.replace(/^--/, '').split('=');
  return [key, value.join('=')];
}));
const design = options.design || 'home';
const widths = (options.widths || process.env.POVOD_CAPTURE_WIDTHS || '360,390,430')
  .split(',').map(Number).filter(width => Number.isInteger(width) && width > 0);
const height = 844;
const targetUrl = process.env.POVOD_CAPTURE_URL ?? `http://127.0.0.1:4173/?design=${encodeURIComponent(design)}`;
const outputDir = path.resolve(options.output || process.env.POVOD_CAPTURE_DIR || `artifacts/ui-povod-v1/${design}`);
const browserCandidates = [
  process.env.POVOD_BROWSER_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean);
const browserPath = browserCandidates.find(candidate => existsSync(candidate));
if (!browserPath) throw new Error('Chrome or Edge not found. Set POVOD_BROWSER_PATH.');

await mkdir(outputDir, { recursive: true });
const profileDir = await mkdtemp(path.join(tmpdir(), 'povod-capture-'));
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

try {
  for (const width of widths) {
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    await send('Page.enable', {}, sessionId);
    await send('Runtime.enable', {}, sessionId);
    await send('Emulation.setDeviceMetricsOverride', {
      width, height, deviceScaleFactor: 1, mobile: true, screenWidth: width, screenHeight: height,
    }, sessionId);
    const loaded = waitForEvent('Page.loadEventFired', sessionId);
    await send('Page.navigate', { url: targetUrl }, sessionId);
    await loaded;
    await send('Runtime.evaluate', {
      expression: `(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(image=>image.complete?true:new Promise(resolve=>{image.addEventListener('load',resolve,{once:true});image.addEventListener('error',resolve,{once:true})})));await new Promise(resolve=>setTimeout(resolve,150));return true})()`,
      awaitPromise: true, returnByValue: true,
    }, sessionId);
    const { data } = await send('Page.captureScreenshot', {
      format: 'png', fromSurface: true, captureBeyondViewport: false,
    }, sessionId);
    await writeFile(path.join(outputDir, `${width}.png`), Buffer.from(data, 'base64'));
    await send('Target.closeTarget', { targetId });
    process.stdout.write(`captured ${width}x${height}\n`);
  }
} finally {
  try { await send('Browser.close'); } catch { browser.kill(); }
  socket.close();
  if (browser.exitCode === null) await Promise.race([once(browser, 'exit'), new Promise(resolve => setTimeout(resolve, 3_000))]);
  await rm(profileDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
