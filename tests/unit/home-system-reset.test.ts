import test from 'node:test';
import assert from 'node:assert/strict';
import { resetCatalogSearchDraft } from '../../apps/miniapp/src/view-model/system-state.ts';

test('Empty reset action clears user filters while preserving Moscow and timezone context', () => {
  const reset = resetCatalogSearchDraft({
    text: 'концерт',
    city: 'Москва',
    date: '2026-10-02',
    startLocal: '2026-10-02T18:00',
    endLocal: '2026-10-02T23:00',
    timeZone: 'Europe/Moscow',
    excludeCategories: ['CINEMA'],
    includedCategories: ['CONCERT'],
    participants: '4',
    budgetText: '5000',
    budgetCurrency: 'RUB',
    priceBasis: 'PER_PERSON',
  });

  assert.deepEqual(reset, {
    text: '',
    city: 'Москва',
    date: '',
    startLocal: '',
    endLocal: '',
    timeZone: 'Europe/Moscow',
    excludeCategories: [],
    includedCategories: [],
    participants: '1',
    budgetText: '',
    budgetCurrency: 'RUB',
    priceBasis: 'UNKNOWN',
  });
});
