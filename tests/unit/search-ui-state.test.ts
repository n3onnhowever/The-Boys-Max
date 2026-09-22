import test from 'node:test';
import assert from 'node:assert/strict';
import { SEARCH_DESIGN_DATA } from '../../apps/miniapp/src/design-data/search.ts';
import { createSearchUiState, searchUiReducer, selectedFilterChips } from '../../apps/miniapp/src/view-model/search.ts';

test('Search render model remains explicit, deterministic and map-design-only', () => {
  assert.equal(SEARCH_DESIGN_DATA.provenance, 'DESIGN_FIXTURE');
  assert.equal(SEARCH_DESIGN_DATA.title, 'Поиск');
  assert.equal(SEARCH_DESIGN_DATA.resultCountLabel, 'Найдено 24 события');
  assert.equal(SEARCH_DESIGN_DATA.mapAffordance, 'DESIGN_ONLY');
  assert.deepEqual(SEARCH_DESIGN_DATA.events.map(event => event.title), ['БИКИНИ KILL', 'Дайте танк (!)', 'Хадн дадн', 'Сироткин']);
  assert.deepEqual(selectedFilterChips(SEARCH_DESIGN_DATA.filters).slice(0, 3).map(filter => filter.label), ['12–14 апр', 'Концерты', 'До 3 000 ₽']);
});

test('filter state selects and deselects a shared category option', () => {
  let state = createSearchUiState(SEARCH_DESIGN_DATA);
  state = searchUiReducer(state, { type: 'OPEN_FILTERS' });
  state = searchUiReducer(state, { type: 'TOGGLE_CATEGORY', value: 'cinema' });
  assert.deepEqual(state.draft.categories, ['concerts', 'cinema']);
  state = searchUiReducer(state, { type: 'TOGGLE_CATEGORY', value: 'concerts' });
  assert.deepEqual(state.draft.categories, ['cinema']);
});

test('removing a selected filter updates applied and draft state', () => {
  const initial = createSearchUiState(SEARCH_DESIGN_DATA);
  const state = searchUiReducer(initial, { type: 'REMOVE_FILTER', key: 'category', value: 'concerts' });
  assert.deepEqual(state.applied.categories, []);
  assert.deepEqual(state.draft.categories, []);
  assert.equal(selectedFilterChips(state.applied).some(filter => filter.key === 'category'), false);
});

test('reset clears all structured filters while preserving the query and sort context', () => {
  let state = createSearchUiState(SEARCH_DESIGN_DATA, true);
  state = searchUiReducer(state, { type: 'SET_SORT', value: 'date' });
  state = searchUiReducer(state, { type: 'RESET_FILTERS' });
  assert.equal(state.draft.query, 'концерт в москве');
  assert.equal(state.draft.sort, 'date');
  assert.equal(state.draft.date, 'any');
  assert.deepEqual(state.draft.categories, []);
  assert.equal(state.draft.format, 'any');
  assert.equal(state.draft.price, 'any');
  assert.equal(state.draft.distance, 'any');
});

test('apply commits the Filter Sheet draft and closes it', () => {
  let state = createSearchUiState(SEARCH_DESIGN_DATA);
  state = searchUiReducer(state, { type: 'OPEN_FILTERS' });
  state = searchUiReducer(state, { type: 'SET_DATE', value: 'weekend' });
  state = searchUiReducer(state, { type: 'APPLY_FILTERS' });
  assert.equal(state.applied.date, 'weekend');
  assert.equal(state.sheetOpen, false);
});

test('sort switching updates the visible Search sort immediately', () => {
  const state = searchUiReducer(createSearchUiState(SEARCH_DESIGN_DATA), { type: 'SET_SORT', value: 'distance' });
  assert.equal(state.applied.sort, 'distance');
  assert.equal(state.draft.sort, 'distance');
});

test('Filter Sheet open and close restores the last applied filters', () => {
  let state = createSearchUiState(SEARCH_DESIGN_DATA);
  state = searchUiReducer(state, { type: 'OPEN_FILTERS' });
  assert.equal(state.sheetOpen, true);
  state = searchUiReducer(state, { type: 'SET_PRICE', value: 'over-5000' });
  state = searchUiReducer(state, { type: 'CLOSE_FILTERS' });
  assert.equal(state.sheetOpen, false);
  assert.equal(state.applied.price, '1000-3000');
  assert.equal(state.draft.price, '1000-3000');
});
