import test from 'node:test';
import assert from 'node:assert/strict';
import { DETAIL_DESIGN_DATA } from '../../apps/miniapp/src/design-data/detail.ts';
import { eventToDetailViewModel } from '../../apps/miniapp/src/view-model/detail.ts';
import { CONTRACT, type EventView } from '../../apps/miniapp/src/port/contracts.ts';

const eventView: EventView = {
  contract: CONTRACT,
  actorId: 'synthetic-ui-actor',
  kind: 'EVENT',
  route: {
    kind: 'EVENT', sourceId: 'synthetic-source', externalEventId: 'synthetic-event',
    occurrenceId: 'synthetic-occurrence', scope: { kind: 'PERSONAL' },
  },
  actions: ['ADD_TO_PLAN'],
  revision: null,
  notice: null,
  targetPlanId: null,
  unknownReasons: ['price'],
  event: {
    ref: {
      offerId: 'synthetic-offer', contextRevision: 1, sourceId: 'synthetic-source',
      externalEventId: 'synthetic-event', occurrenceId: 'synthetic-occurrence', observationId: 'synthetic-observation',
    },
    title: 'Synthetic concert',
    startLabel: '2 октября · 20:00',
    categoryLabel: 'Концерт',
    artworkCategory: 'CONCERT',
    place: { address: '', coordinates: null, navigationUrl: null, attribution: null },
    price: { baseLabel: 'UNKNOWN', totalLabel: null, basisLabel: 'Основание неизвестно', fees_known: false, warnings: [] },
    sourceLabel: 'Synthetic source', sourceUrl: 'https://outside.invalid/event', freshnessLabel: 'Synthetic timestamp',
    eligibilityLabel: 'UNKNOWN', description: 'Synthetic event for detail adapter testing',
  },
};

test('Detail design variants are deterministic and explicitly synthetic', () => {
  assert.deepEqual(Object.keys(DETAIL_DESIGN_DATA), [
    'detail', 'detail-price-unknown', 'detail-venue-unknown', 'detail-source-unavailable',
  ]);
  for (const model of Object.values(DETAIL_DESIGN_DATA)) {
    assert.equal(model.provenance, 'DESIGN_FIXTURE');
    assert.equal(model.attendance?.kind, 'DESIGN_PREVIEW');
  }
});

test('unknown price stays unknown in the deterministic price variant', () => {
  assert.equal(DETAIL_DESIGN_DATA['detail-price-unknown'].price.label, null);
  assert.equal(DETAIL_DESIGN_DATA['detail-price-unknown'].price.displayLabel, 'Цена не указана');
});

test('missing venue stays explicit and is omitted from the hero', () => {
  const model = DETAIL_DESIGN_DATA['detail-venue-unknown'];
  assert.equal(model.venue.name, null);
  assert.equal(model.venue.address, null);
  assert.equal(model.venue.displayLabel, 'Место уточняется');
  assert.equal(model.heroVenueLabel, null);
});

test('unavailable source has no fabricated URL and disables the primary action', () => {
  const model = DETAIL_DESIGN_DATA['detail-source-unavailable'];
  assert.equal(model.source.url, null);
  assert.equal(model.source.availability, 'UNAVAILABLE');
  assert.equal(model.primaryAction.kind, 'UNAVAILABLE');
});

test('runtime adapter preserves supplied start only and does not invent detail facts', () => {
  const model = eventToDetailViewModel(eventView, []);
  assert.equal(model.provenance, 'SERVER_ADAPTER');
  assert.equal(model.occurrence.startLabel, '2 октября · 20:00');
  assert.equal(model.occurrence.endLabel, null);
  assert.equal(model.venue.displayLabel, 'Место уточняется');
  assert.equal(model.price.displayLabel, 'Цена не указана');
  assert.equal(model.source.url, null);
  assert.equal(model.primaryAction.kind, 'UNAVAILABLE');
  assert.equal(model.attendance, null);
  assert.equal(model.heroArtwork, '/assets/events/category-concert.png');
  assert.equal(model.heroArtworkAlt, 'Иллюстрация категории «Концерты»');
});

test('runtime source action is exposed only for an allowlisted safe URL', () => {
  const model = eventToDetailViewModel(eventView, ['https://outside.invalid']);
  assert.equal(model.source.url, 'https://outside.invalid/event');
  assert.equal(model.source.availability, 'AVAILABLE');
  assert.equal(model.primaryAction.kind, 'SOURCE_LINK');
});
