import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HOME_SYSTEM_CHROME,
  emptySystemState,
  errorSystemState,
  loadingSystemState,
  offlineSystemState,
  previewDestination,
} from '../../apps/miniapp/src/view-model/system-state.ts';

const cachedEvent = {
  id: 'cached:event',
  title: 'Previously loaded event',
  dateTimeLabel: '12 Апр · Сб · 20:00',
  venue: 'Cached venue',
  priceLabel: 'UNKNOWN',
  artwork: '/synthetic.jpg',
  artworkAlt: 'Synthetic cached artwork',
  saved: false,
};

test('loading, empty and error system states are explicit and deterministic', () => {
  assert.deepEqual(loadingSystemState(), { kind: 'loading', statusLabel: 'Загружаем подборку' });
  assert.equal(emptySystemState().kind, 'empty');
  assert.equal(emptySystemState().title, 'Событий пока нет');
  assert.equal(errorSystemState().kind, 'error');
  assert.equal(errorSystemState().title, 'Не удалось загрузить события');
  assert.equal(HOME_SYSTEM_CHROME.categories[0]?.id, 'all');
});

test('retry and reset actions leave a deterministic preview destination', () => {
  assert.equal(previewDestination('retry'), 'home');
  assert.equal(previewDestination('reset-filters'), 'home');
  assert.equal(previewDestination('return-home'), 'home');
  assert.equal(previewDestination('change-filters'), 'filters');
});

test('offline state contains only explicitly supplied cached content', () => {
  const source = [cachedEvent];
  const state = offlineSystemState(source);
  assert.equal(state.kind, 'offline');
  assert.deepEqual(state.cachedEvents.map(event => event.id), ['cached:event']);
  assert.notEqual(state.cachedEvents[0], source[0]);
  assert.deepEqual(offlineSystemState([]).cachedEvents, []);
});
