import { HOME_ARTWORK } from '../assets.ts';
import type { CatalogView, EventCardView } from '../port/contracts.ts';

export interface HomeCategoryViewModel {
  id: string;
  label: string;
}

export interface HomeEventViewModel {
  id: string;
  title: string;
  dateTimeLabel: string;
  venue: string;
  distanceLabel: string | null;
  priceLabel: string | null;
  categoryLabels: string[];
  artwork: string;
  artworkAlt: string;
  recommendationLabel: string | null;
  saved: boolean;
}

export interface HomeViewModel {
  provenance: 'DESIGN_FIXTURE' | 'SERVER_ADAPTER';
  searchPlaceholder: string;
  categories: HomeCategoryViewModel[];
  activeCategoryId: string;
  hero: HomeEventViewModel | null;
  forYou: HomeEventViewModel[];
  nearby: HomeEventViewModel[];
}

const categories: HomeCategoryViewModel[] = [
  { id: 'all', label: 'Все' },
  { id: 'CONCERT', label: 'Концерты' },
  { id: 'PARTY', label: 'Вечеринки' },
  { id: 'EXHIBITION', label: 'Выставки' },
  { id: 'CINEMA', label: 'Кино' },
];

const artworkCycle = [HOME_ARTWORK.concert, HOME_ARTWORK.gallery, HOME_ARTWORK.club, HOME_ARTWORK.dance];

function eventId(event: EventCardView): string {
  return [event.ref.sourceId, event.ref.externalEventId, event.ref.occurrenceId ?? 'event'].join(':');
}

function adaptEvent(event: EventCardView, index: number, hero = false): HomeEventViewModel {
  return {
    id: eventId(event),
    title: event.title,
    dateTimeLabel: event.startLabel,
    venue: event.place.address,
    distanceLabel: null,
    priceLabel: event.price.baseLabel || null,
    categoryLabels: [event.categoryLabel],
    artwork: hero ? HOME_ARTWORK.hero : artworkCycle[index % artworkCycle.length]!,
    artworkAlt: `Атмосфера события «${event.title}»`,
    recommendationLabel: hero ? event.categoryLabel : null,
    saved: false,
  };
}

/**
 * Presentation-only adapter. It neither evaluates eligibility nor replaces the
 * server-owned event, occurrence, source, price, or authorization contracts.
 */
export function catalogToHomeViewModel(view: CatalogView): HomeViewModel {
  const events = view.events.map((event, index) => adaptEvent(event, index));
  const selectedCategory = view.query.includedCategories[0] ?? 'all';
  return {
    provenance: 'SERVER_ADAPTER',
    searchPlaceholder: 'Куда идём сегодня?',
    categories,
    activeCategoryId: categories.some(category => category.id === selectedCategory) ? selectedCategory : 'all',
    hero: view.events[0] ? adaptEvent(view.events[0], 0, true) : null,
    forYou: events.slice(0, 6),
    nearby: events.slice(6, 10),
  };
}

export function keyForEvent(event: EventCardView): string {
  return eventId(event);
}
