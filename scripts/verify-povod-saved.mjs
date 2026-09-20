import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const targetUrl = process.env.POVOD_SAVED_VERIFY_URL ?? 'http://127.0.0.1:4173/?design=saved';
const browserCandidates = [
  process.env.POVOD_BROWSER_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean);
const browserPath = browserCandidates.find(candidate => existsSync(candidate));
if (!browserPath) throw new Error('Chrome or Edge not found. Set POVOD_BROWSER_PATH.');

const profileDir = await mkdtemp(path.join(tmpdir(), 'povod-saved-verify-'));
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
    browser.once('exit', code => {
      clearTimeout(timer);
      reject(new Error(`Browser exited before verification (${code ?? 'unknown'}).`));
    });
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
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  await send('Runtime.enable', {}, sessionId);
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390, height: 844, deviceScaleFactor: 1, mobile: true, screenWidth: 390, screenHeight: 844,
  }, sessionId);
  await send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  }, sessionId);
  const loaded = waitForEvent('Page.loadEventFired', sessionId);
  await send('Page.navigate', { url: targetUrl }, sessionId);
  await loaded;

  const { result, exceptionDetails } = await send('Runtime.evaluate', {
    expression: `(async()=>{
      await document.fonts.ready;
      await Promise.all([...document.images].map(image=>image.complete?true:new Promise(resolve=>{
        image.addEventListener('load',resolve,{once:true});
        image.addEventListener('error',resolve,{once:true});
      })));
      const settle=()=>new Promise(resolve=>setTimeout(resolve,60));
      const activeTab=()=>document.querySelector('.saved-segmented button[aria-selected="true"]')?.textContent?.trim();
      const cardCount=()=>document.querySelectorAll('.event-list-card').length;
      const initial={title:document.querySelector('h1')?.textContent?.trim(),activeTab:activeTab(),cardCount:cardCount(),pressedHearts:document.querySelectorAll('.save-action[aria-pressed="true"]').length};
      [...document.querySelectorAll('.saved-segmented button')].find(button=>button.textContent?.trim()==='Позже')?.click();
      await settle();
      const later={activeTab:activeTab(),cardCount:cardCount()};
      document.querySelector('.event-list-card .save-action')?.click();
      await settle();
      const removed={cardCount:cardCount(),undo:document.querySelector('.saved-undo button')?.textContent?.trim()};
      document.querySelector('.saved-undo button')?.click();
      await settle();
      const restored={cardCount:cardCount(),undoVisible:Boolean(document.querySelector('.saved-undo'))};
      [...document.querySelectorAll('.saved-segmented button')].find(button=>button.textContent?.trim()==='Ближайшие')?.click();
      await settle();
      document.querySelector('.event-list-card .event-list-open')?.click();
      await settle();
      return {initial,later,removed,restored,eventHash:location.hash};
    })()`,
    awaitPromise: true,
    returnByValue: true,
  }, sessionId);
  if (exceptionDetails) throw new Error(exceptionDetails.text ?? 'Browser interaction evaluation failed.');
  const checks = result.value;
  assert.deepEqual(checks.initial, { title: 'Сохранённое', activeTab: 'Ближайшие', cardCount: 6, pressedHearts: 6 });
  assert.deepEqual(checks.later, { activeTab: 'Позже', cardCount: 2 });
  assert.deepEqual(checks.removed, { cardCount: 1, undo: 'Вернуть' });
  assert.deepEqual(checks.restored, { cardCount: 2, undoVisible: false });
  assert.equal(checks.eventHash, '#event=design%3Asaved%3Abikini-kill');
  process.stdout.write(`${JSON.stringify(checks)}\n`);
  await send('Target.closeTarget', { targetId });
} finally {
  try { await send('Browser.close'); } catch { browser.kill(); }
  socket.close();
  if (browser.exitCode === null) {
    await Promise.race([once(browser, 'exit'), new Promise(resolve => setTimeout(resolve, 3_000))]);
  }
  await rm(profileDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
