import { HOME_ARTWORK } from '../assets.ts';
import type { CatalogView, EventCardView } from '../port/contracts.ts';

export interface FilterOption<Id extends string = string> {
  id: Id;
  label: string;
  summaryLabel?: string;
}

export const SEARCH_FILTER_OPTIONS = {
  dates: [
    { id: 'any', label: 'Любая' },
    { id: 'apr12-14', label: '12–14 апр' },
    { id: 'this-week', label: 'На этой неделе' },
    { id: 'weekend', label: 'На выходных' },
    { id: 'next-month', label: 'Следующий месяц' },
  ],
  categories: [
    { id: 'concerts', label: 'Концерты' },
    { id: 'parties', label: 'Вечеринки' },
    { id: 'exhibitions', label: 'Выставки' },
    { id: 'theatre', label: 'Театр' },
    { id: 'cinema', label: 'Кино' },
    { id: 'festivals', label: 'Фестивали' },
    { id: 'lectures', label: 'Лекции' },
  ],
  formats: [
    { id: 'any', label: 'Любой' },
    { id: 'offline', label: 'Офлайн' },
    { id: 'online', label: 'Онлайн' },
  ],
  prices: [
    { id: 'any', label: 'Любая' },
    { id: 'under-1000', label: 'До 1 000 ₽' },
    { id: '1000-3000', label: '1 000 – 3 000 ₽', summaryLabel: 'До 3 000 ₽' },
    { id: '3000-5000', label: '3 000 – 5 000 ₽' },
    { id: 'over-5000', label: 'Больше 5 000 ₽' },
  ],
  distances: [
    { id: 'any', label: 'Любой' },
    { id: 'within-10', label: 'В пределах 10 км', summaryLabel: 'До 10 км' },
    { id: 'center', label: 'Центр' },
    { id: 'cao', label: 'ЦАО' },
    { id: 'zao', label: 'ЗАО' },
    { id: 'uzao', label: 'ЮЗАО' },
    { id: 'other', label: 'Другое' },
  ],
  sorts: [
    { id: 'relevance', label: 'По релевантности' },
    { id: 'date', label: 'По дате' },
    { id: 'distance', label: 'По расстоянию' },
  ],
} as const;

type OptionId<T extends readonly FilterOption[]> = T[number]['id'];
export type DateFilterId = OptionId<typeof SEARCH_FILTER_OPTIONS.dates>;
export type CategoryFilterId = OptionId<typeof SEARCH_FILTER_OPTIONS.categories>;
export type FormatFilterId = OptionId<typeof SEARCH_FILTER_OPTIONS.formats>;
export type PriceFilterId = OptionId<typeof SEARCH_FILTER_OPTIONS.prices>;
export type DistanceFilterId = OptionId<typeof SEARCH_FILTER_OPTIONS.distances>;
export type SearchSortId = OptionId<typeof SEARCH_FILTER_OPTIONS.sorts>;
export type SelectedFilterKey = 'date' | 'category' | 'format' | 'price' | 'distance';

export interface SearchFilterState {
  query: string;
  date: DateFilterId;
  categories: CategoryFilterId[];
  format: FormatFilterId;
  price: PriceFilterId;
  distance: DistanceFilterId;
  sort: SearchSortId;
}

export interface SearchEventViewModel {
  id: string;
  title: string;
  dateTimeLabel: string;
  venue: string;
  priceLabel: string;
  artwork: string;
  artworkAlt: string;
  saved: boolean;
}

export interface SearchViewModel {
  provenance: 'DESIGN_FIXTURE' | 'SERVER_ADAPTER';
  title: string;
  resultCountLabel: string;
  mapAffordance: 'DESIGN_ONLY' | 'HIDDEN';
  filters: SearchFilterState;
  events: SearchEventViewModel[];
}

export interface SelectedFilterViewModel {
  id: string;
  key: SelectedFilterKey;
  value: string;
  label: string;
  icon: 'calendar' | 'music' | 'coins' | 'pin';
}

export interface SearchUiState {
  applied: SearchFilterState;
  draft: SearchFilterState;
  sheetOpen: boolean;
  savedEventIds: string[];
}

export type SearchUiAction =
  | { type: 'OPEN_FILTERS' }
  | { type: 'CLOSE_FILTERS' }
  | { type: 'APPLY_FILTERS' }
  | { type: 'RESET_FILTERS' }
  | { type: 'SET_QUERY'; value: string }
  | { type: 'SET_SORT'; value: SearchSortId }
  | { type: 'SET_DATE'; value: DateFilterId }
  | { type: 'TOGGLE_CATEGORY'; value: CategoryFilterId }
  | { type: 'SET_FORMAT'; value: FormatFilterId }
  | { type: 'SET_PRICE'; value: PriceFilterId }
  | { type: 'SET_DISTANCE'; value: DistanceFilterId }
  | { type: 'REMOVE_FILTER'; key: SelectedFilterKey; value: string }
  | { type: 'TOGGLE_SAVED'; eventId: string };

export const EMPTY_SEARCH_FILTERS: SearchFilterState = {
  query: '',
  date: 'any',
  categories: [],
  format: 'any',
  price: 'any',
  distance: 'any',
  sort: 'relevance',
};

function cloneFilters(filters: SearchFilterState): SearchFilterState {
  return { ...filters, categories: [...filters.categories] };
}

export function createSearchUiState(model: SearchViewModel, sheetOpen = false): SearchUiState {
  return {
    applied: cloneFilters(model.filters),
    draft: cloneFilters(model.filters),
    sheetOpen,
    savedEventIds: model.events.filter(event => event.saved).map(event => event.id),
  };
}

function removeFilter(filters: SearchFilterState, key: SelectedFilterKey, value: string): SearchFilterState {
  if (key === 'category') return { ...filters, categories: filters.categories.filter(category => category !== value) };
  if (key === 'date') return { ...filters, date: 'any' };
  if (key === 'format') return { ...filters, format: 'any' };
  if (key === 'price') return { ...filters, price: 'any' };
  return { ...filters, distance: 'any' };
}

export function searchUiReducer(state: SearchUiState, action: SearchUiAction): SearchUiState {
  switch (action.type) {
    case 'OPEN_FILTERS': return { ...state, draft: cloneFilters(state.applied), sheetOpen: true };
    case 'CLOSE_FILTERS': return { ...state, draft: cloneFilters(state.applied), sheetOpen: false };
    case 'APPLY_FILTERS': return { ...state, applied: cloneFilters(state.draft), sheetOpen: false };
    case 'RESET_FILTERS': return {
      ...state,
      draft: { ...cloneFilters(EMPTY_SEARCH_FILTERS), query: state.draft.query, sort: state.draft.sort },
    };
    case 'SET_QUERY': return {
      ...state,
      applied: { ...state.applied, query: action.value },
      draft: { ...state.draft, query: action.value },
    };
    case 'SET_SORT': return {
      ...state,
      applied: { ...state.applied, sort: action.value },
      draft: { ...state.draft, sort: action.value },
    };
    case 'SET_DATE': return { ...state, draft: { ...state.draft, date: action.value } };
    case 'TOGGLE_CATEGORY': return {
      ...state,
      draft: {
        ...state.draft,
        categories: state.draft.categories.includes(action.value)
          ? state.draft.categories.filter(value => value !== action.value)
          : [...state.draft.categories, action.value],
      },
    };
    case 'SET_FORMAT': return { ...state, draft: { ...state.draft, format: action.value } };
    case 'SET_PRICE': return { ...state, draft: { ...state.draft, price: action.value } };
    case 'SET_DISTANCE': return { ...state, draft: { ...state.draft, distance: action.value } };
    case 'REMOVE_FILTER': return {
      ...state,
      applied: removeFilter(state.applied, action.key, action.value),
      draft: removeFilter(state.draft, action.key, action.value),
    };
    case 'TOGGLE_SAVED': return {
      ...state,
      savedEventIds: state.savedEventIds.includes(action.eventId)
        ? state.savedEventIds.filter(id => id !== action.eventId)
        : [...state.savedEventIds, action.eventId],
    };
  }
}

function optionLabel(options: readonly FilterOption[], id: string, summary = false): string {
  const option = options.find(candidate => candidate.id === id);
  return summary ? option?.summaryLabel ?? option?.label ?? id : option?.label ?? id;
}

export function selectedFilterChips(filters: SearchFilterState): SelectedFilterViewModel[] {
  const selected: SelectedFilterViewModel[] = [];
  if (filters.date !== 'any') selected.push({ id: `date:${filters.date}`, key: 'date', value: filters.date, label: optionLabel(SEARCH_FILTER_OPTIONS.dates, filters.date, true), icon: 'calendar' });
  for (const category of filters.categories) selected.push({ id: `category:${category}`, key: 'category', value: category, label: optionLabel(SEARCH_FILTER_OPTIONS.categories, category, true), icon: 'music' });
  if (filters.price !== 'any') selected.push({ id: `price:${filters.price}`, key: 'price', value: filters.price, label: optionLabel(SEARCH_FILTER_OPTIONS.prices, filters.price, true), icon: 'coins' });
  if (filters.format !== 'any') selected.push({ id: `format:${filters.format}`, key: 'format', value: filters.format, label: optionLabel(SEARCH_FILTER_OPTIONS.formats, filters.format, true), icon: 'music' });
  if (filters.distance !== 'any') selected.push({ id: `distance:${filters.distance}`, key: 'distance', value: filters.distance, label: optionLabel(SEARCH_FILTER_OPTIONS.distances, filters.distance, true), icon: 'pin' });
  return selected;
}

function eventId(event: EventCardView): string {
  return [event.ref.sourceId, event.ref.externalEventId, event.ref.occurrenceId ?? 'event'].join(':');
}

function resultCountLabel(count: number): string {
  const word = count % 10 === 1 && count % 100 !== 11 ? 'событие' : count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 12 || count % 100 > 14) ? 'события' : 'событий';
  return `Найдено ${count} ${word}`;
}

const artworkCycle = [HOME_ARTWORK.hero, HOME_ARTWORK.club, HOME_ARTWORK.concert, HOME_ARTWORK.dance];
const categoryMap: Record<string, CategoryFilterId | undefined> = {
  CONCERT: 'concerts', PARTY: 'parties', EXHIBITION: 'exhibitions', THEATRE: 'theatre', CINEMA: 'cinema', FESTIVAL: 'festivals', LECTURE: 'lectures',
};

/** Presentation-only adapter. It does not evaluate or execute provider queries. */
export function catalogToSearchViewModel(view: CatalogView): SearchViewModel {
  return {
    provenance: 'SERVER_ADAPTER',
    title: 'Поиск',
    resultCountLabel: resultCountLabel(view.events.length),
    mapAffordance: 'HIDDEN',
    filters: {
      ...cloneFilters(EMPTY_SEARCH_FILTERS),
      query: view.query.text,
      categories: view.query.includedCategories.flatMap(category => categoryMap[category] ? [categoryMap[category]!] : []),
    },
    events: view.events.map((event, index) => ({
      id: eventId(event),
      title: event.title,
      dateTimeLabel: event.startLabel,
      venue: event.place.address,
      priceLabel: event.price.baseLabel,
      artwork: artworkCycle[index % artworkCycle.length]!,
      artworkAlt: `Атмосфера события «${event.title}»`,
      saved: false,
    })),
  };
}
