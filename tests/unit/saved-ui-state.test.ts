import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createElement, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { SAVED_DESIGN_DATA } from '../../apps/miniapp/src/design-data/saved.ts';
import {
  createSavedUiState,
  savedEventsForSegment,
  savedUiReducer,
  type SavedViewModel,
} from '../../apps/miniapp/src/view-model/saved.ts';

test('Saved render model remains explicit, deterministic and close to the approved screen', () => {
  assert.equal(SAVED_DESIGN_DATA.provenance, 'DESIGN_FIXTURE');
  assert.equal(SAVED_DESIGN_DATA.title, 'Сохранённое');
  assert.deepEqual(SAVED_DESIGN_DATA.segments.map(segment => segment.label), ['Ближайшие', 'Позже']);
  assert.deepEqual(
    SAVED_DESIGN_DATA.events.upcoming.map(event => event.title),
    ['БИКИНИ KILL', 'Дайте танк (!)', 'Сироткин', 'Три дня дождя', 'СБПЧ', 'Хадн дадн'],
  );
});

test('Saved segmented selection switches the visible deterministic collection', () => {
  let state = createSavedUiState(SAVED_DESIGN_DATA);
  assert.equal(state.activeSegment, 'upcoming');
  assert.equal(savedEventsForSegment(SAVED_DESIGN_DATA, state).length, 6);
  state = savedUiReducer(state, { type: 'SELECT_SEGMENT', segment: 'later' });
  assert.equal(state.activeSegment, 'later');
  assert.deepEqual(savedEventsForSegment(SAVED_DESIGN_DATA, state).map(event => event.title), ['Пластика света', 'Три состояния']);
});

test('Saved state removes and re-saves an event without changing its event model', () => {
  const event = SAVED_DESIGN_DATA.events.upcoming[0];
  assert.ok(event);
  let state = createSavedUiState(SAVED_DESIGN_DATA);
  state = savedUiReducer(state, { type: 'TOGGLE_SAVED', eventId: event.id });
  assert.equal(state.savedEventIds.includes(event.id), false);
  assert.equal(state.lastRemovedEventId, event.id);
  assert.equal(savedEventsForSegment(SAVED_DESIGN_DATA, state).length, 5);
  state = savedUiReducer(state, { type: 'TOGGLE_SAVED', eventId: event.id });
  assert.equal(state.savedEventIds.includes(event.id), true);
  assert.equal(state.lastRemovedEventId, null);
  assert.equal(savedEventsForSegment(SAVED_DESIGN_DATA, state).length, 6);
});

test('Saved screen renders the populated and empty saved states', async () => {
  const server = await createServer({
    root: process.cwd(),
    configFile: path.resolve('apps/miniapp/vite.config.ts'),
    appType: 'custom',
    logLevel: 'silent',
    server: { middlewareMode: true },
  });
  try {
    const module = await server.ssrLoadModule('/apps/miniapp/src/components/SavedScreen.tsx') as {
      SavedScreen: ComponentType<{ model: SavedViewModel }>;
    };
    const populated = renderToStaticMarkup(createElement(module.SavedScreen, { model: SAVED_DESIGN_DATA }));
    assert.match(populated, /<h1>Сохранённое<\/h1>/);
    assert.match(populated, /aria-label="Сохранённые события"/);
    assert.match(populated, /БИКИНИ KILL/);
    assert.match(populated, /aria-current="page"/);

    const emptyModel: SavedViewModel = {
      ...SAVED_DESIGN_DATA,
      events: { upcoming: [], later: [] },
    };
    const empty = renderToStaticMarkup(createElement(module.SavedScreen, { model: emptyModel }));
    assert.match(empty, /Пока ничего нет/);
    assert.match(empty, /Сохраняйте события, чтобы вернуться к ним позже/);
  } finally {
    await server.close();
  }
});
