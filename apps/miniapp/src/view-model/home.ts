import type { CatalogView, EventCardView } from '../port/contracts.ts';
import {categoryArtwork} from './category-artwork.ts';

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
  artwork: string | null;
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
  { id: 'THEATRE', label: 'Театр' },
  { id: 'CINEMA', label: 'Кино' },
  { id: 'MUSEUM', label: 'Выставки' },
  { id: 'SPORT', label: 'Спорт' },
  { id: 'OUTDOOR', label: 'Прогулки' },
];


function eventId(event: EventCardView): string {
  return [event.ref.sourceId, event.ref.externalEventId, event.ref.occurrenceId ?? 'event'].join(':');
}

function adaptEvent(event: EventCardView, hero = false, distanceKm:number|null=null): HomeEventViewModel {
  const artwork=categoryArtwork(event.categoryLabel);
  return {
    id: eventId(event),
    title: event.title,
    dateTimeLabel: event.startLabel,
    venue: event.place.address,
    distanceLabel: distanceKm===null?null:`${distanceKm.toFixed(1)} км`,
    priceLabel: event.price.baseLabel || null,
    categoryLabels: [event.categoryLabel],
    artwork: artwork.url,
    artworkAlt: artwork.alt,
    recommendationLabel: hero ? event.categoryLabel : null,
    saved: false,
  };
}

/**
 * Presentation-only adapter. It neither evaluates eligibility nor replaces the
 * server-owned event, occurrence, source, price, or authorization contracts.
 */
export function catalogToHomeViewModel(view: CatalogView, location?:{lat:number;lon:number;radiusKm:number}, interests:readonly string[]=[]): HomeViewModel {
  // The API ranks admitted occurrences using persisted preferences and keeps real entries first.
  const ranked=view.events;
  const events = ranked.map(event => adaptEvent(event));
  const selectedCategory = view.query.includedCategories[0] ?? 'all';
  return {
    provenance: 'SERVER_ADAPTER',
    searchPlaceholder: 'Куда идём сегодня?',
    categories,
    activeCategoryId: categories.some(category => category.id === selectedCategory) ? selectedCategory : 'all',
    hero: ranked[0] ? adaptEvent(ranked[0], true) : null,
    forYou: events.slice(0, 6),
    nearby: location?view.events.flatMap(event=>{
      const point=event.place.coordinates;if(!point)return [];
      const radians=Math.PI/180,dLat=(point.lat-location.lat)*radians,dLon=(point.lon-location.lon)*radians;
      const a=Math.sin(dLat/2)**2+Math.cos(location.lat*radians)*Math.cos(point.lat*radians)*Math.sin(dLon/2)**2;
      const km=6371*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
      return km<=location.radiusKm?[{event:adaptEvent(event,false,km),km}]:[];
    }).sort((a,b)=>a.km-b.km).slice(0,4).map(x=>x.event):[],
  };
}

export function keyForEvent(event: EventCardView): string {
  return eventId(event);
}
