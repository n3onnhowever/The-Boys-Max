import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

/** Shared, dependency-free CDP harness for the POVOD production-build evidence scripts. */
export async function launchPovodBrowser() {
  const executable = [process.env.POVOD_BROWSER_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'].filter(Boolean).find(existsSync);
  if (!executable) throw new Error('Chrome or Edge not found. Set POVOD_BROWSER_PATH.');
  const profile = await mkdtemp(path.join(tmpdir(), 'povod-ui-'));
  const processHandle = spawn(executable, ['--headless=new', '--disable-gpu', '--hide-scrollbars',
    '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'],
    { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });
  const endpoint = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Browser launch timeout')), 15000);
    let buffer = '';
    processHandle.stderr.on('data', chunk => {
      buffer += chunk;
      const match = buffer.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) { clearTimeout(timer); resolve(match[1]); }
    });
    processHandle.once('exit', code => { clearTimeout(timer); reject(new Error('Browser exited: ' + code)); });
  });
  const socket = new WebSocket(endpoint);
  const pending = new Map();
  const requests = [];
  const errors = [];
  let sequence = 0;
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, 12000);
    pending.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (message.id) {
      const operation = pending.get(message.id);
      if (!operation) return;
      clearTimeout(operation.timer); pending.delete(message.id);
      if (message.error) operation.reject(new Error(message.error.message)); else operation.resolve(message.result);
    } else if (message.method === 'Network.requestWillBeSent') {
      requests.push({ sessionId: message.sessionId, url: message.params.request.url, method: message.params.request.method });
    } else if (message.method === 'Runtime.exceptionThrown') {
      errors.push({ sessionId: message.sessionId, text: message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text });
    } else if (message.method === 'Fetch.requestPaused') {
      if (message.params.request.url === 'https://st.max.ru/js/max-web-app.js') {
        void send('Fetch.fulfillRequest', { requestId: message.params.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'application/javascript' }], body: Buffer.from('/* MAX SDK is not exercised in offline UI evidence. */').toString('base64') }, message.sessionId);
        return;
      }
      // Normal-runtime negative control: deterministic unavailable API, not a live backend claim.
      void send('Fetch.fulfillRequest', { requestId: message.params.requestId, responseCode: 401,
        responseHeaders: [{ name: 'Content-Type', value: 'application/json' }], body: Buffer.from('{"error":"unauthorized"}').toString('base64') }, message.sessionId);
    }
  });
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  const evaluate = async (page, expression) => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, page.sessionId);
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
    return result.result.value;
  };
  const until = async (page, expression) => {
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline) {
      try { if (await evaluate(page, expression)) return; } catch (error) { if (!/context|navigation/i.test(error.message)) throw error; }
      await new Promise(resolve => setTimeout(resolve, 60));
    }
    throw new Error('Browser condition timeout: ' + expression);
  };
  const ready = async page => {
    await until(page, "Boolean(document.querySelector('main'))");
    await evaluate(page, "(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(image=>image.complete?true:new Promise(resolve=>{image.addEventListener('load',resolve,{once:true});image.addEventListener('error',resolve,{once:true})})));await new Promise(resolve=>setTimeout(resolve,150));return true})()");
  };
  const open = async (url, width = 390, { reducedMotion = true, unavailableApi = false } = {}) => {
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    const page = { targetId, sessionId };
    await send('Page.enable', {}, sessionId); await send('Runtime.enable', {}, sessionId); await send('Network.enable', {}, sessionId);
    await send('Fetch.enable', { patterns: [{ urlPattern: 'https://st.max.ru/js/max-web-app.js' }, ...(unavailableApi ? [{ urlPattern: '*/api/*' }] : [])] }, sessionId);
    await send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: true, screenWidth: width, screenHeight: 844 }, sessionId);
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: reducedMotion ? 'reduce' : 'no-preference' }] }, sessionId);
    await send('Page.navigate', { url }, sessionId); await ready(page); return page;
  };
  const capture = async (page, file) => {
    const { data } = await send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false }, page.sessionId);
    await writeFile(file, Buffer.from(data, 'base64'));
  };
  return { send, evaluate, until, ready, open, capture, requests, errors,
    closePage: page => send('Target.closeTarget', { targetId: page.targetId }),
    async close() {
      try { await send('Browser.close'); } catch { processHandle.kill(); }
      socket.close();
      if (processHandle.exitCode === null) await Promise.race([once(processHandle, 'exit'), new Promise(resolve => setTimeout(resolve, 3000))]);
      if (path.dirname(path.resolve(profile)) !== path.resolve(tmpdir()) || !path.basename(profile).startsWith('povod-ui-')) throw new Error('Unexpected temporary browser profile path');
      await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    },
  };
}
