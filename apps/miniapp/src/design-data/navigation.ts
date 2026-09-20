import { HOME_DESIGN_DATA } from './home.ts';
import { SEARCH_DESIGN_DATA } from './search.ts';
import { SAVED_DESIGN_DATA } from './saved.ts';
import { DETAIL_DESIGN_DATA } from './detail.ts';
import { MY_PLANS_DESIGN_DATA, PLAN_DETAIL_DESIGN_DATA } from './plans.ts';
import type { DetailViewModel } from '../view-model/detail.ts';
import type { PlanDetailViewModel } from '../view-model/plans.ts';

/** Preview-only transitions preserve the selected fixture's identity; missing fields stay unknown. */
export function previewEventDetail(eventId: string | null): DetailViewModel {
  const events = [HOME_DESIGN_DATA.hero, ...HOME_DESIGN_DATA.forYou, ...HOME_DESIGN_DATA.nearby,
    ...SEARCH_DESIGN_DATA.events, ...SAVED_DESIGN_DATA.events.upcoming, ...SAVED_DESIGN_DATA.events.later,
    ...MY_PLANS_DESIGN_DATA.plans.map(plan => plan.event)];
  const event = events.find(candidate => candidate?.id === eventId);
  const base = DETAIL_DESIGN_DATA.detail;
  if (!event) return base;
  const saved = 'saved' in event && typeof event.saved === 'boolean' ? event.saved : false;
  if (event.title === base.title) return { ...base, id: event.id, saved };
  const priceLabel = 'priceLabel' in event && typeof event.priceLabel === 'string' ? event.priceLabel : null;
  return {
    ...base, id: event.id, title: event.title, saved,
    heroDateTimeLabel: event.dateTimeLabel, heroVenueLabel: event.venue,
    heroArtwork: event.artwork, heroArtworkAlt: event.artworkAlt,
    tags: [], description: 'Синтетический дизайн-пример выбранного события.',
    occurrence: { dateLabel: null, startLabel: event.dateTimeLabel, endLabel: null },
    venue: { name: event.venue, address: null, displayLabel: event.venue || 'Место уточняется' },
    price: { label: priceLabel, displayLabel: priceLabel ?? 'Цена не указана', note: null },
    source: { label: 'Источник не указан', freshnessLabel: null, url: null, availability: 'UNAVAILABLE', statusLabel: 'Ссылка на источник недоступна' },
    primaryAction: { kind: 'UNAVAILABLE', label: 'Источник недоступен', href: null },
    attendance: null,
  };
}
export function previewPlanDetail(planId: string | null): PlanDetailViewModel {
  const plan = MY_PLANS_DESIGN_DATA.plans.find(item => item.id === planId);
  if (!plan || plan.id === MY_PLANS_DESIGN_DATA.nearestPlanId) return PLAN_DETAIL_DESIGN_DATA;
  return {
    provenance: 'DESIGN_FIXTURE', title: 'План', event: plan.event,
    personalPlan: { title: plan.rsvp === 'SOLO' ? 'Пойду один' : plan.event.title, dateTimeLabel: plan.event.dateTimeLabel, venue: plan.event.venue, rsvp: plan.rsvp },
    participants: plan.participants, discussion: [],
  };
}
