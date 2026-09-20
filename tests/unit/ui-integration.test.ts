import test from 'node:test';
import assert from 'node:assert/strict';
import { DESIGN_PREVIEW_ROUTES, resolveDesignPreview, designNavigationRoute, detailNavigationSection } from '../../apps/miniapp/src/view-model/design-preview.ts';
import { previewEventDetail, previewPlanDetail } from '../../apps/miniapp/src/design-data/navigation.ts';

test('Only explicit allowlisted routes activate design fixtures', () => {
  for (const route of DESIGN_PREVIEW_ROUTES) assert.equal(resolveDesignPreview(route), route);
  for (const invalid of [null, '', 'true', '1', 'toString', '__proto__', 'Home', 'detail&source=live']) assert.equal(resolveDesignPreview(invalid), null);
});
test('Shared navigation preserves Profile for Saved and the originating section for Detail', () => {
  assert.equal(designNavigationRoute('plan'), 'my-plans');
  assert.equal(designNavigationRoute('friends'), null);
  assert.equal(detailNavigationSection('saved'), 'profile');
  assert.equal(detailNavigationSection('search'), 'search');
  assert.equal(detailNavigationSection('plan-detail'), 'plan');
  assert.equal(detailNavigationSection(null), 'home');
});
test('Selected preview events retain identity without inheriting invented Detail facts', () => {
  const event = previewEventDetail('design:gallery');
  assert.equal(event.title, 'Три состояния');
  assert.equal(event.price.displayLabel, 'Бесплатно');
  assert.equal(event.occurrence.endLabel, null);
  assert.equal(event.venue.address, null);
  assert.equal(event.source.url, null);
  assert.equal(event.attendance, null);
});
test('Selected solo plan stays solo and has no borrowed discussion', () => {
  const plan = previewPlanDetail('design:plan:cassette');
  assert.equal(plan.event.title, 'Кассета');
  assert.equal(plan.personalPlan.rsvp, 'SOLO');
  assert.equal(plan.participants.length, 1);
  assert.deepEqual(plan.discussion, []);
});
