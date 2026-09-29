import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { launchPovodBrowser } from './lib/povod-browser.mjs';
const options = Object.fromEntries(process.argv.slice(2).map(argument => { const [key, ...value] = argument.replace(/^--/, '').split('='); return [key, value.join('=') || true]; }));
const output = path.resolve(options.output || 'artifacts/ui-povod-v1/integrated');
const origin = new URL(process.env.POVOD_CAPTURE_URL || process.env.POVOD_SAVED_VERIFY_URL || 'http://127.0.0.1:4173/').origin;
const states = ['loading', 'empty', 'error', 'offline'];
const primary = ['home', 'search', 'filters', 'detail', 'saved', 'profile', 'my-plans', 'plan-detail', ...states];
const core = primary.filter(route => !['filters', 'plan-detail'].includes(route));
const variants = ['detail-price-unknown', 'detail-venue-unknown', 'detail-source-unavailable', 'plan-detail-solo', 'plan-detail-empty-discussion'];
const scope = options.only || 'all';
const normalSessionIds = new Set();
const urlFor = route => origin + '/?design=' + route;
const audit = { generatedUtc: new Date().toISOString(), scope, origin, captures: [], checks: [], runtimeNegativeControls: [], build: [] };
for (const name of ['index.html', ...await readdir('dist/miniapp/assets').then(files => files.filter(file => /\.(js|css)$/.test(file)).map(file => 'assets/' + file))]) {
  audit.build.push({ file: name, sha256: createHash('sha256').update(await readFile('dist/miniapp/' + name)).digest('hex') });
}
await mkdir(output, { recursive: true });
const browser = await launchPovodBrowser();
const check = async (name, run) => { const evidence = await run(); audit.checks.push({ name, status: 'PASS', evidence }); console.log('PASS ' + name); };
const click = async (page, selector) => {
  assert.equal(await browser.evaluate(page, '(()=>{const el=document.querySelector(' + JSON.stringify(selector) + ');if(!el || el.disabled)return false;el.click();return true})()'), true, selector);
  await browser.evaluate(page, 'new Promise(resolve=>setTimeout(()=>resolve(true),60))');
};
const navigate = async (page, selector, expected) => {
  assert.equal(await browser.evaluate(page, '(()=>{const el=document.querySelector(' + JSON.stringify(selector) + ');if(!el || el.disabled)return false;setTimeout(()=>el.click(),0);return true})()'), true, selector);
  await browser.until(page, 'new URL(location.href).searchParams.get("design")===' + JSON.stringify(expected));
  await browser.ready(page);
};
try {
  if (!options['no-capture']) {
    const widths = (options.widths || '390,360,430').split(',').map(Number);
    for (const width of widths) {
      const routes = scope === 'states' ? states : scope === 'saved' ? ['saved'] : scope === 'detail-navigation' ? ['saved', 'detail', ...variants.filter(route => route.startsWith('detail-'))] : width === 390 ? [...primary, ...variants] : core;
      const directory = options.layout === 'legacy-states' ? output : path.join(output, String(width));
      await mkdir(directory, { recursive: true });
      for (const route of routes) {
        const page = await browser.open(urlFor(route), width);
        const layout = await browser.evaluate(page, `(()=>{const nav=document.querySelector('.bottom-nav');return {viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,navCount:document.querySelectorAll('.bottom-nav').length,navItems:nav?.querySelectorAll('button').length??0,active:nav?.querySelector('[aria-current="page"]')?.textContent.trim(),navBottom:nav?.getBoundingClientRect().bottom??null,backHeader:!!document.querySelector('.v2-back-header .v2-back'),brokenImages:[...document.images].filter(image=>!image.complete||!image.naturalWidth).length,offlineCopyWidths:[...document.querySelectorAll('.offline-content .event-list-copy')].map(node=>node.getBoundingClientRect().width)}})()`);
        assert.equal(layout.viewport, width); assert.ok(layout.documentWidth <= width, route + ' horizontal overflow');
        const detailRoute = route === 'detail' || route.startsWith('detail-');
        assert.equal(layout.brokenImages, 0);
        if (detailRoute) { assert.equal(layout.navCount, 0); assert.equal(layout.backHeader, true); }
        else { assert.equal(layout.navCount, 1); assert.equal(layout.navItems, 5); assert.ok(Math.abs(layout.navBottom - 844) < 1); }
        const expectedActive = ['search', 'filters'].includes(route) ? 'Поиск' : ['saved', 'profile'].includes(route) ? 'Профиль' : route.startsWith('plan-detail') || route === 'my-plans' ? 'План' : 'Главная';
        if (!detailRoute) assert.equal(layout.active, expectedActive, route + ' active navigation');
        assert.ok(layout.offlineCopyWidths.every(value => value > 150), 'Offline retains readable shared row geometry');
        const filename = options.layout === 'legacy-states' ? route + '-' + width + '.png' : route + '.png';
        await browser.capture(page, path.join(directory, filename));
        audit.captures.push({ route, width, height: 844, file: path.relative(output, path.join(directory, filename)).replaceAll('\\', '/'), layout });
        await browser.closePage(page); console.log('captured ' + route + ' ' + width + 'x844');
      }
    }
  }
  if (scope === 'all' || scope === 'saved' || scope === 'detail-navigation') {
    await check('Saved segments, remove, undo, empty and selected-event navigation', async () => {
      const page = await browser.open(urlFor('saved'));
      const count = () => browser.evaluate(page, "document.querySelectorAll('.event-list-card').length");
      assert.equal(await count(), 6); await click(page, '#saved-tab-later'); assert.equal(await count(), 2);
      await click(page, '.save-action'); assert.equal(await count(), 1); await click(page, '.saved-undo button'); assert.equal(await count(), 2);
      await click(page, '.save-action'); await click(page, '.save-action'); assert.equal(await count(), 0);
      assert.ok(await browser.evaluate(page, "Boolean(document.querySelector('.saved-empty'))"));
      await click(page, '#saved-tab-upcoming'); await navigate(page, '.event-list-open', 'detail');
      assert.equal(await browser.evaluate(page, "document.querySelector('#event-detail-title').textContent"), 'БИКИНИ KILL');
      assert.equal(await browser.evaluate(page, "document.querySelector('.v2-back-header h1').textContent"), 'Событие');
      assert.equal(await browser.evaluate(page, "document.querySelectorAll('.bottom-nav').length"), 0);
      const eventId = await browser.evaluate(page, "new URL(location.href).searchParams.get('event')");
      await navigate(page, '.v2-back', 'saved');
      assert.equal(await browser.evaluate(page, "document.querySelector('.bottom-nav [aria-current]').textContent.trim()"), 'Профиль');
      await browser.closePage(page); return { upcoming: 6, later: 2, empty: 0, eventId };
    });
  }
  if (scope === 'detail-navigation') {
    await check('Accepted V2 detail returns to Search and retains header Save', async () => {
      const page = await browser.open(urlFor('search'));
      await navigate(page, '.event-list-open', 'detail');
      assert.equal(await browser.evaluate(page, "document.querySelectorAll('.bottom-nav').length"), 0);
      const selector = '.v2-detail-header-actions button[aria-pressed]';
      const before = await browser.evaluate(page, `document.querySelector('${selector}').getAttribute('aria-pressed')`);
      await click(page, selector);
      assert.notEqual(await browser.evaluate(page, `document.querySelector('${selector}').getAttribute('aria-pressed')`), before);
      await navigate(page, '.v2-back', 'search');
      assert.equal(await browser.evaluate(page, "document.querySelector('.bottom-nav [aria-current]').textContent.trim()"), 'Поиск');
      await browser.closePage(page); return { backDestination: 'search', headerSave: true };
    });
  }
  if (scope === 'all') {
    await check('Home search, local Save, and navigation availability', async () => {
      const page = await browser.open(urlFor('home'));
      await click(page, '.event-card-compact .save-action');
      assert.equal(await browser.evaluate(page, "document.querySelector('.event-card-compact .save-action').getAttribute('aria-pressed')"), 'true');
      assert.equal(await browser.evaluate(page, "document.querySelectorAll('.bottom-nav button:disabled').length"), 1);
      await browser.evaluate(page, "document.querySelector('.home-search').requestSubmit()");
      await browser.until(page, "new URL(location.href).searchParams.get('design')==='search'"); await browser.ready(page);
      await browser.closePage(page); return { friendsDisabled: true, search: true, save: true };
    });
    await check('Search sorting, filter reset/apply/close and safe event navigation', async () => {
      const page = await browser.open(urlFor('search'));
      await click(page, '.sort-tabs button:nth-child(2)');
      await click(page, '.search-filter-controls button');
      assert.equal(await browser.evaluate(page, "document.querySelector('.filter-sheet-layer').getAttribute('aria-hidden')"), 'false');
      await click(page, '.filter-reset'); await click(page, '.filter-apply');
      assert.equal(await browser.evaluate(page, "document.querySelectorAll('.selected-filter-chip').length"), 0);
      await click(page, '.search-filter-controls button'); await click(page, '.filter-sheet-close');
      assert.equal(await browser.evaluate(page, "document.querySelector('.filter-sheet-layer').getAttribute('aria-hidden')"), 'true');
      await navigate(page, '.event-list-open', 'detail');
      assert.equal(await browser.evaluate(page, "document.querySelectorAll('.bottom-nav').length"), 0);
      await navigate(page, '.v2-back', 'search');
      assert.equal(await browser.evaluate(page, "document.querySelector('.bottom-nav [aria-current]').textContent.trim()"), 'Поиск');
      await browser.closePage(page); return { sort: true, filters: true, detail: true };
    });
    await check('Detail UNKNOWN variants retain facts and safe source actions', async () => {
      const expected = { 'detail-price-unknown': 'Цена не указана', 'detail-venue-unknown': 'Место уточняется', 'detail-source-unavailable': 'Источник недоступен' };
      for (const [route, text] of Object.entries(expected)) {
        const page = await browser.open(urlFor(route));
        assert.ok(await browser.evaluate(page, 'document.body.innerText.includes(' + JSON.stringify(text) + ')'));
        assert.equal(await browser.evaluate(page, "document.querySelectorAll('a[href^=\"http\"]').length"), 0);
        if (route === 'detail-source-unavailable') assert.equal(await browser.evaluate(page, "document.querySelector('.detail-primary-action').disabled"), true);
        await browser.closePage(page);
      }
      const page = await browser.open(urlFor('detail')); await click(page, '.v2-detail-header-actions button[aria-pressed]');
      assert.equal(await browser.evaluate(page, "document.querySelector('.v2-detail-header-actions button[aria-pressed]').getAttribute('aria-pressed')"), 'true');
      await browser.evaluate(page, 'scrollTo(0,document.documentElement.scrollHeight)');
      assert.ok(await browser.evaluate(page, "document.querySelector('.detail-attendance').getBoundingClientRect().bottom <= innerHeight"));
      await browser.closePage(page); return Object.keys(expected);
    });
    await check('Profile VK+OK placeholders, preference editing and Saved subsection', async () => {
      const page = await browser.open(urlFor('profile'));
      assert.equal(await browser.evaluate(page, "document.querySelectorAll('.profile-contact-list button').length"), 3);
      assert.equal(await browser.evaluate(page, "document.querySelectorAll('.profile-contact-list button:not(:disabled)').length"), 0);
      assert.equal(await browser.evaluate(page, "/telegram/i.test(document.body.innerHTML)"), false);
      assert.ok(await browser.evaluate(page, "Boolean(document.querySelector('.profile-contact-ok svg'))"));
      await click(page, '.profile-preference-section .profile-section-heading button');
      await click(page, '.profile-preference-section .profile-chip');
      assert.equal(await browser.evaluate(page, "document.querySelector('.profile-preference-section .profile-chip').getAttribute('aria-pressed')"), 'false');
      await click(page, '.profile-preference-row-notifications');
      assert.ok(await browser.evaluate(page, "document.querySelector('.profile-preference-row-notifications').textContent.includes('Выключены')"));
      await navigate(page, 'button[aria-label="Сохранённое"]', 'saved'); await browser.closePage(page);
      return { services: ['VK', 'OK', '+'], linking: 'UNAVAILABLE', savedActive: 'profile' };
    });
    await check('Plans RSVP, selected solo plan, empty discussion and local composer', async () => {
      const page = await browser.open(urlFor('my-plans'));
      await click(page, '.nearest-plan-card .rsvp-pill');
      assert.equal(await browser.evaluate(page, "document.querySelector('.nearest-plan-card').getAttribute('data-rsvp-state')"), 'THINKING');
      await navigate(page, '.plan-list-card:nth-child(2) .plan-event-summary', 'plan-detail');
      assert.ok(await browser.evaluate(page, "document.querySelector('.personal-plan-card').textContent.includes('Пойду один')"));
      assert.equal(await browser.evaluate(page, "document.querySelectorAll('.discussion-message').length"), 0); await browser.closePage(page);
      const detail = await browser.open(urlFor('plan-detail'));
      assert.equal(await browser.evaluate(detail, "document.querySelector('.participant-invite').disabled"), true);
      await browser.evaluate(detail, `(()=>{const el=document.querySelector('.discussion-composer input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,'Локальный дизайн-пример');el.dispatchEvent(new Event('input',{bubbles:true}));return true})()`);
      await browser.until(detail, "!document.querySelector('.discussion-composer button').disabled"); await click(detail, '.discussion-composer button');
      assert.equal(await browser.evaluate(detail, "document.querySelectorAll('.discussion-message').length"), 4);
      await browser.closePage(detail); return { soloParticipants: 1, emptyMessages: 0, localMessages: 4, invite: 'UNAVAILABLE' };
    });
  }
  if (scope === 'all' || scope === 'states') {
    await check('Loading reduced motion and Offline supplied cache', async () => {
      const page = await browser.open(urlFor('loading'));
      const animation = await browser.evaluate(page, "getComputedStyle(document.querySelector('.skeleton')).animationName");
      assert.equal(animation, 'none'); await browser.closePage(page);
      const offline = await browser.open(urlFor('offline'));
      assert.equal(await browser.evaluate(offline, "document.querySelectorAll('.event-list-card').length"), 2);
      assert.equal(await browser.evaluate(offline, "document.querySelectorAll('.save-action:not(:disabled)').length"), 0); await browser.closePage(offline);
      return { animation, cachedCards: 2, offlineSaveDisabled: true };
    });
    await check('Empty, Error and Offline actions reach deterministic destinations', async () => {
      const actions = [['empty','change-filters','filters'], ['empty','reset-filters','home'], ['error','retry','home'], ['error','return-home','home'], ['offline','retry','home']];
      for (const [state, action, destination] of actions) { const page = await browser.open(urlFor(state)); await navigate(page, '[data-state-action="' + action + '"]', destination); await browser.closePage(page); }
      return actions;
    });
  }
  if (scope === 'all') {
    for (const search of ['', '?design=unknown', '?design=toString']) {
      const page = await browser.open(origin + '/' + search, 390, { unavailableApi: true });
      normalSessionIds.add(page.sessionId);
      await browser.until(page, "Boolean(document.querySelector('.status-panel[role=\"alert\"]'))");
      const evidence = await browser.evaluate(page, `(()=>({fixtureBoundary:!!document.querySelector('[data-provenance="DESIGN_FIXTURE"]'),syntheticText:/Дизайн-пример|Аня|БИКИНИ|128 человек|Берём метро|До 3 000/.test(document.body.innerText),fixtureChunk:performance.getEntriesByType('resource').some(entry=>/DesignPreview-/.test(entry.name)),profileControls:document.querySelectorAll('.profile-contact,.discussion-composer,.search-map-affordance').length}))()`);
      assert.deepEqual(evidence, { fixtureBoundary: false, syntheticText: false, fixtureChunk: false, profileControls: 0 });
      audit.runtimeNegativeControls.push({ search, unavailableApi: true, ...evidence }); await browser.closePage(page);
    }
  }
  const previewApiRequests = browser.requests.filter(request => request.url.includes('/api/') && !normalSessionIds.has(request.sessionId));
  // Accepted V2 Saved mounts useUnreadCount. The static verifier has no authenticated
  // backend; allow only this read and continue rejecting every fixture mutation.
  assert.deepEqual(previewApiRequests.filter(request => request.method !== 'GET' || request.url !== origin + '/api/v1/me/notifications/count'), []);
  assert.equal(browser.errors.length, 0, JSON.stringify(browser.errors));
  const externalRequests = browser.requests.filter(request => /^https?:/.test(request.url) && new URL(request.url).origin !== origin && request.url !== 'https://st.max.ru/js/max-web-app.js');
  assert.deepEqual(externalRequests, []);
  audit.previewApiRequests = previewApiRequests.length;
  audit.maxSdk = 'Intercepted for offline UI evidence; MAX runtime NOT_RUN';
  audit.status = 'PASS';
} catch (error) { audit.status = 'FAIL'; audit.error = error.stack; throw error; }
finally {
  audit.javascriptErrors = browser.errors;
  audit.requests = browser.requests;
  await writeFile(path.join(output, options.layout === 'legacy-states' ? 'state-capture-audit.json' : 'browser-audit.json'), JSON.stringify(audit, null, 2) + '\n');
  await browser.close();
}
