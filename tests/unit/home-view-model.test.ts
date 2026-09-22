import test from 'node:test';
import assert from 'node:assert/strict';
import { HOME_DESIGN_DATA } from '../../apps/miniapp/src/design-data/home.ts';
import { catalogToHomeViewModel } from '../../apps/miniapp/src/view-model/home.ts';
import { CONTRACT, type CatalogView } from '../../apps/miniapp/src/port/contracts.ts';

const catalog: CatalogView = {
  contract: CONTRACT,
  actorId: 'synthetic-ui-actor',
  kind: 'CATALOG',
  route: { kind: 'CATALOG', scope: { kind: 'PERSONAL' } },
  actions: ['SEARCH'],
  revision: null,
  notice: null,
  query: {
    text: '', city: 'Москва', date: '2026-10-02', startLocal: '', endLocal: '',
    timeZone: 'Europe/Moscow', excludeCategories: [], includedCategories: ['CONCERT'],
    participants: '1', budgetText: '', budgetCurrency: 'RUB', priceBasis: 'UNKNOWN',
  },
  approvedFilterLabels: [],
  aiState: 'UNAVAILABLE',
  aiMessage: 'Synthetic test catalog',
  events: [{
    ref: {
      offerId: 'synthetic-offer', contextRevision: 1, sourceId: 'synthetic-source',
      externalEventId: 'synthetic-event', occurrenceId: 'synthetic-occurrence', observationId: 'synthetic-observation',
    },
    title: 'Synthetic concert',
    startLabel: '2 октября · 20:00',
    categoryLabel: 'Концерт',
    place: { address: 'Synthetic venue', coordinates: null, navigationUrl: null, attribution: null },
    price: { baseLabel: 'UNKNOWN', totalLabel: null, basisLabel: 'Основание неизвестно', fees_known: false, warnings: [] },
    sourceLabel: 'Synthetic source', sourceUrl: null, freshnessLabel: 'Synthetic timestamp',
    eligibilityLabel: 'UNKNOWN', description: 'Synthetic event for UI adapter testing',
  }],
};

test('deterministic Home fixture remains explicitly synthetic', () => {
  assert.equal(HOME_DESIGN_DATA.provenance, 'DESIGN_FIXTURE');
  assert.equal(HOME_DESIGN_DATA.hero?.title, 'БИКИНИ KILL');
  assert.deepEqual(HOME_DESIGN_DATA.categories.map(category => category.id), ['all', 'CONCERT', 'PARTY', 'EXHIBITION', 'CINEMA']);
});

test('catalog adapter preserves server display evidence without changing domain models', () => {
  const home = catalogToHomeViewModel(catalog);
  assert.equal(home.provenance, 'SERVER_ADAPTER');
  assert.equal(home.activeCategoryId, 'CONCERT');
  assert.equal(home.hero?.id, 'synthetic-source:synthetic-event:synthetic-occurrence');
  assert.equal(home.hero?.title, 'Synthetic concert');
  assert.equal(home.hero?.venue, 'Synthetic venue');
  assert.equal(home.hero?.priceLabel, 'UNKNOWN');
  assert.equal(home.hero?.distanceLabel, null);
  assert.equal(catalog.events[0]?.title, 'Synthetic concert');
});

test('catalog adapter does not invent an event when the server returns no events', () => {
  const home = catalogToHomeViewModel({ ...catalog, events: [] });
  assert.equal(home.hero, null);
  assert.deepEqual(home.forYou, []);
  assert.deepEqual(home.nearby, []);
});
