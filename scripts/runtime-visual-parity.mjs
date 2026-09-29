import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { buildApp } from '../apps/api/app.ts';
import { sign } from '../tests/fixtures.ts';
import { launchPovodBrowser } from './lib/povod-browser.mjs';
import { DEMO_NOTICE } from '../packages/demo/constants.ts';

const databaseUrl = process.env.DEMO_TEST_DATABASE_URL;
if (!databaseUrl || new URL(databaseUrl).hostname !== '127.0.0.1' || new URL(databaseUrl).pathname !== '/povod_demo_verify') throw Error('ISOLATED_DEMO_DB_REQUIRED');
const origin = 'http://127.0.0.1:3000';
const output = path.resolve('artifacts/runtime-visual-parity');
await mkdir(output, { recursive: true });
const cfg = { mode: 'demo', demoCatalogVersion: 'v1', databaseUrl, redisUrl: 'redis://127.0.0.1:6379', publicOrigin: origin,
  sessionKey: randomBytes(32).toString('hex'), escrowKey: randomBytes(32).toString('hex'), botToken: 'DEMO_SYNTHETIC_MAX_SIGNING_TOKEN', webhookSecret: randomBytes(32).toString('hex'),
  credentialScope: 'RUNTIME_VISUAL_PARITY', cookieProfile: 'LAX_FIRST_PARTY', ingressMode: 'WEBHOOK', liveGate: '' };
const { app, pool, sessions } = await buildApp(cfg);
let rejectMutation = false;
let failView = false;
let holdView = null;
app.addHook('preHandler', async (request, reply) => {
  if (rejectMutation && request.method === 'PUT' && request.url.startsWith('/api/v1/me/saved/')) {
    rejectMutation = false;
    return reply.code(503).send({ error: { code: 'TEST_REJECTED' } });
  }
  if (failView && request.url.startsWith('/api/ui/v1/view')) {
    failView = false;
    return reply.code(503).send({ error: { code: 'TEST_UNAVAILABLE' } });
  }
  if (holdView && request.url.startsWith('/api/ui/v1/view')) await holdView;
});
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const assets = [
  ['fonts/Onest-Variable.ttf', 'font/ttf'], ['fonts/IBMPlexMono-Regular.ttf', 'font/ttf'],
  ['brand/povod-wordmark-home.png', 'image/png'], ['brand/povod-wordmark.png', 'image/png'],
  ['brand/povod-icon-app.png', 'image/png'], ['brand/povod-icon-square.png', 'image/png'], ['brand/povod-icon-circle.png', 'image/png'],
  ['states/povod-error-cable.png', 'image/png'], ['states/povod-empty-magnifier.png', 'image/png'],
  ['events/home-hero.jpg', 'image/jpeg'], ['events/for-you-gallery.jpg', 'image/jpeg'],
  ['events/for-you-concert.jpg', 'image/jpeg'], ['events/for-you-club.jpg', 'image/jpeg'], ['events/nearby-dance.jpg', 'image/jpeg'],
];
const receipt = { build: {}, assets: [], screenshots: [], checks: [] };
let browser;
try {
  await app.ready();
  const html = await app.inject({ url: '/' });
  assert.equal(html.statusCode, 200);
  receipt.build.index = sha(html.rawPayload);
  for (const [name, mime] of assets) {
    const response = await app.inject({ url: `/assets/${name}` });
    const expected = await readFile(path.resolve('dist/miniapp/assets', name));
    assert.equal(response.statusCode, 200, name);
    assert.match(response.headers['content-type'], new RegExp('^' + mime), name);
    assert.equal(sha(response.rawPayload), sha(expected), name);
    receipt.assets.push({ path: name, mime, sha256: sha(expected), bytes: expected.length });
  }
  for (const file of html.body.matchAll(/\/assets\/[^"']+\.(?:js|css)/g)) {
    const response = await app.inject({ url: file[0] });
    assert.equal(response.statusCode, 200, file[0]);
    receipt.build[file[0]] = sha(response.rawPayload);
  }
  assert.equal((await app.inject({ url: '/assets/%2e%2e/%2e%2e/anything.png' })).statusCode, 404);
  receipt.checks.push('Fastify nested assets: MIME, bytes, build JS/CSS and traversal');

  const boot = await sessions.bootstrap();
  const external = BigInt('0x' + randomBytes(7).toString('hex')).toString();
  const exchange = await sessions.exchange(boot.binding, boot.body.csrfToken,
    sign(cfg.botToken, `{"id":${external},"first_name":"DEMO_VISUAL"}`, Math.floor(Date.now() / 1000), { query_id: randomUUID() }), randomUUID(), undefined);
  await app.listen({ host: '127.0.0.1', port: 3000 });
  browser = await launchPovodBrowser();
  await browser.send('Storage.setCookies', { cookies: [{ name: '__Host-max_session', value: exchange.token, url: origin, secure: true, httpOnly: true, sameSite: 'Lax' }] });
  const page = await browser.open(origin + '/');
  const wait = expression => browser.until(page, expression);
  const evalJs = expression => browser.evaluate(page, expression);
  const click = async selector => assert.equal(await evalJs(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el||el.disabled)return false;el.click();return true})()`), true, selector);
  const size = async (width, height = 844) => browser.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: true, screenWidth: width, screenHeight: height }, page.sessionId);
  const capture = async (name, width = 390, height = 844) => {
    await size(width, height);
    await browser.ready(page);
    await evalJs('(async()=>{await document.fonts.load("16px Onest");await document.fonts.load("12px \\\"IBM Plex Mono\\\"");await document.fonts.ready;return true})()');
    const metrics = await evalJs('({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,font:document.fonts.check("16px Onest"),mono:document.fonts.check("12px \\\"IBM Plex Mono\\\"")})');
    assert.equal(metrics.width, width);
    assert.ok(metrics.scrollWidth <= width, `${name}: ${JSON.stringify(metrics)}`);
    assert.ok(metrics.font && metrics.mono, `${name}: fonts not ready`);
    const file = `${name}-${width}x${height}.png`;
    await browser.capture(page, path.join(output, file));
    receipt.screenshots.push({ file, ...metrics });
  };

  await wait('Boolean(document.querySelector(".home-screen .event-card-compact"))');
  assert.equal(await evalJs('document.querySelector(".demo-catalog-notice")?.getAttribute("aria-label")'), DEMO_NOTICE);
  assert.equal(await evalJs('document.body.innerText.includes("SYNTHETIC Save")'), false);
  await capture('home');
  for (const width of [360, 430]) await capture('home', width);
  await click('.bottom-nav button:nth-child(5)');
  await wait('Boolean(document.querySelector(".saved-screen .saved-empty"))');
  await capture('saved-empty');
  for (const width of [360, 430]) await capture('saved-empty', width);
  await click('.bottom-nav button:nth-child(2)');
  await wait('Boolean(document.querySelector(".runtime-search"))');
  await capture('search');
  for (const width of [360, 430]) await capture('search', width);
  await click('.runtime-search .filter-control');
  await wait('Boolean(document.querySelector(".filter-sheet-layer.is-open"))');
  await capture('filters');
  for (const width of [360, 430]) await capture('filters', width);
  await capture('filters-keyboard-stress', 390, 500);
  const actions = await evalJs('({date:document.querySelector("#runtime-filter-date").getBoundingClientRect().bottom,footer:document.querySelector(".filter-sheet-footer").getBoundingClientRect().bottom,height:innerHeight})');
  assert.ok(actions.date < actions.footer && actions.footer <= actions.height + 1, JSON.stringify(actions));
  await size(390);
  await evalJs('(()=>{const input=document.querySelector("#runtime-filter-date");Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(input,"2026-10-24");input.dispatchEvent(new Event("input",{bubbles:true}));input.dispatchEvent(new Event("change",{bubbles:true}));return true})()');
  await click('.filter-sheet-scroll .filter-sheet-section:nth-of-type(2) .sheet-filter-chip:nth-child(2)');
  await click('.filter-sheet-footer .filter-apply');
  await wait('document.querySelector(".runtime-search")?.innerText.includes("Вымышленный бумажный театр")');
  assert.ok((await evalJs('document.querySelectorAll(".runtime-search .event-list-card").length')) >= 1);
  await capture('search-filtered');
  await click('.runtime-search .event-list-open');
  await wait('Boolean(document.querySelector(".runtime-detail"))');
  assert.match(await evalJs('document.querySelector(".detail-primary-action")?.getAttribute("href")'), /\/demo\/source\/paper-stage$/);
  await capture('detail');
  for (const width of [360, 430]) await capture('detail', width);
  assert.equal(await evalJs('document.querySelector(".runtime-detail .event-detail-hero-artwork")'), null);
  await size(390);
  await click('.runtime-detail .event-detail-hero-control:first-child');
  await wait('Boolean(document.querySelector(".runtime-search"))');
  assert.ok((await evalJs('document.querySelectorAll(".search-selected-filters .selected-filter-chip").length')) > 0);
  await click('.runtime-search .event-list-open');
  await wait('Boolean(document.querySelector(".runtime-detail .detail-secondary-actions button:first-child:not(:disabled)"))');
  const save = '.runtime-detail .detail-secondary-actions button:first-child';
  assert.equal(await evalJs(`document.querySelector(${JSON.stringify(save)}).getAttribute("aria-pressed")`), 'false');
  rejectMutation = true;
  await click(save);
  await wait('Boolean(document.querySelector(".runtime-detail [role=alert]"))');
  assert.equal(await evalJs(`document.querySelector(${JSON.stringify(save)}).getAttribute("aria-pressed")`), 'false');
  await capture('mutation-rejected');
  await click(save);
  await wait(`document.querySelector(${JSON.stringify(save)})?.getAttribute("aria-pressed")==="true"`);
  await click('.bottom-nav button:nth-child(5)');
  await wait('Boolean(document.querySelector(".saved-screen .event-list-card"))');
  await capture('saved-populated');
  for (const width of [360, 430]) await capture('saved-populated', width);
  await click('.saved-screen .event-list-open');
  await wait('Boolean(document.querySelector(".runtime-detail"))');
  await capture('saved-reopened-detail');
  await browser.send('Page.reload', {}, page.sessionId);
  await wait('Boolean(document.querySelector(".bottom-nav button:nth-child(5):not(:disabled)"))');
  await click('.bottom-nav button:nth-child(5)');
  await wait('Boolean(document.querySelector(".saved-screen .event-list-card"))');
  await capture('saved-after-reload');
  await click('.saved-screen .event-list-open');
  await wait('Boolean(document.querySelector(".runtime-detail .detail-secondary-actions button:first-child:not(:disabled)"))');
  await click(save);
  await wait(`document.querySelector(${JSON.stringify(save)})?.getAttribute("aria-pressed")==="false"`);
  await click('.runtime-detail .event-detail-hero-control:first-child');
  await wait('Boolean(document.querySelector(".saved-screen .saved-empty"))');
  await capture('saved-after-unsave');
  const count = await pool.query('SELECT count(*)::int AS n FROM saved_occurrences WHERE actor_id=$1', [exchange.body.actor.id]);
  assert.equal(count.rows[0].n, 0);
  receipt.checks.push('Authenticated demo journey: Home, Search, Filters, Detail, Save, Saved, reopen, reload, unsave');
  receipt.checks.push('Onest and IBM Plex Mono loaded in browser before every capture');
  assert.deepEqual(browser.errors, []);
  await browser.closePage(page);
  holdView = new Promise(resolve => { receipt.releaseView = resolve; });
  await browser.send('Storage.setCookies', { cookies: [{ name: '__Host-max_session', value: exchange.token, url: origin, secure: true, httpOnly: true, sameSite: 'Lax' }] });
  const loadingPage = await browser.open(origin + '/');
  await browser.until(loadingPage, 'Boolean(document.querySelector(".system-state-loading"))');
  await browser.capture(loadingPage, path.join(output, 'loading-390x844.png'));
  receipt.screenshots.push({ file: 'loading-390x844.png', width: 390 });
  receipt.releaseView();
  delete receipt.releaseView;
  holdView = null;
  await browser.closePage(loadingPage);
  failView = true;
  const errorPage = await browser.open(origin + '/');
  await browser.until(errorPage, 'Boolean(document.querySelector(".system-state-error"))');
  await browser.ready(errorPage);
  await browser.capture(errorPage, path.join(output, 'error-retry-390x844.png'));
  receipt.screenshots.push({ file: 'error-retry-390x844.png', width: 390 });
  await browser.evaluate(errorPage, 'document.querySelector("[data-state-action=retry]").click()');
  await browser.until(errorPage, 'Boolean(document.querySelector(".home-screen"))');
  await browser.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 }, errorPage.sessionId);
  await browser.evaluate(errorPage, 'document.querySelector(".category-rail button:nth-child(2)").click()');
  await browser.until(errorPage, 'Boolean(document.querySelector(".system-state-offline"))');
  await browser.ready(errorPage);
  await browser.capture(errorPage, path.join(output, 'offline-390x844.png'));
  receipt.screenshots.push({ file: 'offline-390x844.png', width: 390 });
  await browser.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }, errorPage.sessionId);
  await browser.closePage(errorPage);
  await browser.send('Storage.clearCookies');
  const unauth = await browser.open(origin + '/');
  await browser.until(unauth, 'Boolean(document.querySelector(".launch-state-screen"))');
  await browser.ready(unauth);
  await browser.capture(unauth, path.join(output, 'auth-launch-guidance-390x844.png'));
  receipt.screenshots.push({ file: 'auth-launch-guidance-390x844.png', width: 390 });
  await browser.closePage(unauth);
  console.log(JSON.stringify({ status: 'PASS', screenshots: receipt.screenshots.length, assets: receipt.assets.length, checks: receipt.checks }));
} finally {
  if (browser) await browser.close();
  await app.close();
  await writeFile(path.join(output, 'runtime-receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
}
