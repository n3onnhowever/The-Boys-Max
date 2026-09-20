import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { createElement, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer, type ViteDevServer } from 'vite';
import {
  EMPTY_DISCUSSION_PLAN_DETAIL_DESIGN_DATA,
  MY_PLANS_DESIGN_DATA,
  PLAN_DETAIL_DESIGN_DATA,
  SOLO_PLAN_DETAIL_DESIGN_DATA,
} from '../../apps/miniapp/src/design-data/plans.ts';
import type { MyPlansViewModel, PlanDetailViewModel } from '../../apps/miniapp/src/view-model/plans.ts';

let vite: ViteDevServer;
let MyPlansScreen: ComponentType<{ model: MyPlansViewModel }>;
let PlanDetailScreen: ComponentType<{ model: PlanDetailViewModel }>;

before(async () => {
  vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
  ({ MyPlansScreen } = await vite.ssrLoadModule('/apps/miniapp/src/components/MyPlansScreen.tsx') as {
    MyPlansScreen: ComponentType<{ model: MyPlansViewModel }>;
  });
  ({ PlanDetailScreen } = await vite.ssrLoadModule('/apps/miniapp/src/components/PlanDetailScreen.tsx') as {
    PlanDetailScreen: ComponentType<{ model: PlanDetailViewModel }>;
  });
});

after(async () => {
  await vite.close();
});

function renderMyPlans(model = MY_PLANS_DESIGN_DATA): string {
  return renderToStaticMarkup(createElement(MyPlansScreen, { model }));
}

function renderPlanDetail(model = PLAN_DETAIL_DESIGN_DATA): string {
  return renderToStaticMarkup(createElement(PlanDetailScreen, { model }));
}

test('My Plans render includes nearest, other plans, status controls and active BottomNav', () => {
  const html = renderMyPlans();
  assert.match(html, /<h1>Мои планы<\/h1>/);
  assert.match(html, /Ближайший план/);
  assert.match(html, /Другие планы/);
  assert.match(html, /БИКИНИ KILL/);
  assert.match(html, /Кассета/);
  assert.match(html, /aria-current="page"[^>]*>.*План/s);
});

test('Plan Detail render includes event summary, personal plan, participants and lightweight discussion', () => {
  const html = renderPlanDetail();
  assert.match(html, /<h1>План<\/h1>/);
  assert.match(html, /Мой план/);
  assert.match(html, /Участники \(4\)/);
  assert.match(html, /Обсуждение/);
  assert.match(html, /Написать сообщение/);
  assert.match(html, /Берём метро\? Так быстрее будет/);
});

test('participant status states render for host, going and thinking fixtures', () => {
  const html = renderPlanDetail();
  assert.deepEqual(new Set(PLAN_DETAIL_DESIGN_DATA.participants.map(participant => participant.status)), new Set(['HOST', 'GOING', 'THINKING']));
  assert.match(html, /data-participant-status="HOST"/);
  assert.match(html, /data-participant-status="GOING"/);
  assert.match(html, /data-participant-status="THINKING"/);
  assert.match(html, /Думает/);
});

test('solo plan fixture renders without a group prerequisite', () => {
  const listHtml = renderMyPlans();
  const detailHtml = renderPlanDetail(SOLO_PLAN_DETAIL_DESIGN_DATA);
  assert.match(listHtml, /data-rsvp-state="SOLO"/);
  assert.match(listHtml, /Пойду один/);
  assert.match(detailHtml, /Участники \(1\)/);
  assert.match(detailHtml, /data-rsvp-state="SOLO"/);
});

test('multi-participant fixture and empty discussion state remain deterministic', () => {
  assert.equal(PLAN_DETAIL_DESIGN_DATA.participants.length, 4);
  const html = renderPlanDetail(EMPTY_DISCUSSION_PLAN_DETAIL_DESIGN_DATA);
  assert.match(html, /Пока тихо\. Можно первым уточнить детали встречи\./);
  assert.doesNotMatch(html, /Берём метро\?/);
  assert.match(html, /data-provenance="DESIGN_FIXTURE"/);
});
