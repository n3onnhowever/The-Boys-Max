import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer, type ViteDevServer } from 'vite';
import { PROFILE_DESIGN_DATA } from '../../apps/miniapp/src/design-data/profile.ts';
import { createProfileUiState, profileUiReducer } from '../../apps/miniapp/src/view-model/profile.ts';
import type { ProfileViewModel } from '../../apps/miniapp/src/view-model/profile.ts';

let vite: ViteDevServer;
let ProfileScreen: (props: { model: ProfileViewModel }) => ReturnType<typeof createElement>;

before(async () => {
  vite = await createServer({
    root: fileURLToPath(new URL('../../', import.meta.url)),
    configFile: false,
    appType: 'custom',
    server: { middlewareMode: true },
  });
  ({ ProfileScreen } = await vite.ssrLoadModule('/apps/miniapp/src/components/ProfileScreen.tsx') as {
    ProfileScreen: typeof ProfileScreen;
  });
});

after(async () => {
  await vite.close();
});

test('Profile design render exposes the approved personalization surface', () => {
  const html = renderToStaticMarkup(createElement(ProfileScreen, { model: PROFILE_DESIGN_DATA }));
  assert.match(html, /<h1>Профиль<\/h1>/);
  assert.match(html, /Аня/);
  assert.match(html, /Москва/);
  assert.match(html, /Мои интересы/);
  assert.match(html, /Любимые категории/);
  assert.match(html, /profile-chip/);
  assert.match(html, /Бюджет на события/);
  assert.match(html, /До 3 000 ₽/);
  assert.match(html, /Предпочитаемое время/);
  assert.match(html, /Вечер · После 18:00/);
  assert.match(html, /Уведомления/);
  assert.match(html, /События, подборки, обновления/);
  assert.match(html, /Связанные сервисы/);
  assert.doesNotMatch(html, /href="https?:/);
  assert.doesNotMatch(html, /t\.me|vk\.com/);
});

test('Profile fixture is deterministic and explicitly non-persistent', () => {
  assert.equal(PROFILE_DESIGN_DATA.provenance, 'DESIGN_FIXTURE');
  assert.equal(PROFILE_DESIGN_DATA.persistence, 'LOCAL_PREVIEW_ONLY');
  assert.deepEqual(PROFILE_DESIGN_DATA.capabilities, {
    identityEditing: 'UNAVAILABLE',
    preferencePersistence: 'UNAVAILABLE',
    externalAccountLinking: 'UNAVAILABLE',
  });
  assert.deepEqual(
    PROFILE_DESIGN_DATA.preferenceSections.map(section => section.chips.map(chip => chip.label)),
    [
      ['Инди', 'Рок', 'Электроника', 'Альтернатива', 'Искусство'],
      ['Концерты', 'Вечеринки', 'Выставки', 'Фестивали', 'Театр', 'Кино'],
    ],
  );
});

test('Preference chips only change during the local edit state', () => {
  const initial = createProfileUiState(PROFILE_DESIGN_DATA);
  const ignored = profileUiReducer(initial, { type: 'TOGGLE_CHIP', sectionId: 'interests', chipId: 'rock' });
  assert.equal(ignored, initial);
  const editing = profileUiReducer(initial, { type: 'TOGGLE_EDIT', sectionId: 'interests' });
  const changed = profileUiReducer(editing, { type: 'TOGGLE_CHIP', sectionId: 'interests', chipId: 'rock' });
  assert.equal(changed.selectedChipIds.interests.includes('rock'), false);
  assert.deepEqual(changed.selectedChipIds.categories, initial.selectedChipIds.categories);
});

test('Notifications control is local UI state only', () => {
  const initial = createProfileUiState(PROFILE_DESIGN_DATA);
  const changed = profileUiReducer(initial, { type: 'TOGGLE_NOTIFICATIONS' });
  assert.equal(initial.notificationsEnabled, true);
  assert.equal(changed.notificationsEnabled, false);
});


test('Profile fixtures show VK and OK as unconnected placeholders', () => {
  assert.deepEqual(PROFILE_DESIGN_DATA.contacts.map(service => service.id), ['vk', 'ok']);
  const html = renderToStaticMarkup(createElement(ProfileScreen, { model: PROFILE_DESIGN_DATA }));
  assert.match(html, /Одноклассники/);
  assert.doesNotMatch(html, /Telegram|telegram|подключён/);
});

test('Server Profile renders connected services only from supplied connected records', () => {
  const model = { ...PROFILE_DESIGN_DATA, provenance: 'SERVER_ADAPTER', persistence: 'UNAVAILABLE', contacts: [
    { id: 'vk', label: 'VK', presentation: 'CONNECTED' },
    { id: 'ok', label: 'Одноклассники', presentation: 'DISPLAY_ONLY' },
  ] } as ProfileViewModel;
  const html = renderToStaticMarkup(createElement(ProfileScreen, { model }));
  assert.match(html, /VK: подключён/);
  assert.doesNotMatch(html, /Одноклассники|profile-contact-add/);
  const empty = renderToStaticMarkup(createElement(ProfileScreen, { model: { ...model, contacts: [] } }));
  assert.doesNotMatch(empty, /profile-contact-vk|profile-contact-ok/);
});
