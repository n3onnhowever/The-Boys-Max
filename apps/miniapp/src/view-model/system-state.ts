import type { SearchDraft } from '../port/contracts.ts';
import type { HomeCategoryViewModel } from './home.ts';
import type { SearchEventViewModel } from './search.ts';

export type HomeSystemStateKind = 'loading' | 'empty' | 'error' | 'offline';

export type HomeSystemState =
  | { kind: 'loading'; statusLabel: string }
  | { kind: 'empty'; title: string; description: string }
  | { kind: 'error'; title: string; description: string }
  | {
      kind: 'offline';
      alertTitle: string;
      alertDescription: string;
      sectionTitle: string;
      explanationTitle: string;
      explanation: string;
      cachedEvents: SearchEventViewModel[];
    };

export type LoadingSystemState = Extract<HomeSystemState, { kind: 'loading' }>;
export type EmptySystemState = Extract<HomeSystemState, { kind: 'empty' }>;
export type ErrorSystemState = Extract<HomeSystemState, { kind: 'error' }>;
export type OfflineSystemState = Extract<HomeSystemState, { kind: 'offline' }>;
export type HomeSystemAction = 'change-filters' | 'reset-filters' | 'change-city' | 'retry' | 'return-home';

export interface HomeSystemChrome {
  searchPlaceholder: string;
  activeCategoryId: string;
  categories: HomeCategoryViewModel[];
}

export const HOME_SYSTEM_CHROME: HomeSystemChrome = {
  searchPlaceholder: 'Куда идём сегодня?',
  activeCategoryId: 'all',
  categories: [
    { id: 'all', label: 'Все' },
    { id: 'CONCERT', label: 'Концерты' },
    { id: 'THEATRE', label: 'Театр' },
    { id: 'CINEMA', label: 'Кино' },
    { id: 'MUSEUM', label: 'Выставки' },
    { id: 'SPORT', label: 'Спорт' },
    { id: 'OUTDOOR', label: 'Прогулки' },
  ],
};

export function loadingSystemState(): LoadingSystemState {
  return { kind: 'loading', statusLabel: 'Загружаем подборку' };
}

export function emptySystemState(): EmptySystemState {
  return {
    kind: 'empty',
    title: 'Событий пока нет',
    description: 'По твоим фильтрам ничего\nне нашлось. Попробуй изменить\nпараметры поиска.',
  };
}

export function errorSystemState(message?: string): ErrorSystemState {
  return {
    kind: 'error',
    title: 'Не удалось загрузить события',
    description: message ?? 'Что-то пошло не так.\nПопробуй ещё раз через пару секунд.',
  };
}

export function offlineSystemState(cachedEvents: readonly SearchEventViewModel[], runtime = false): OfflineSystemState {
  return {
    kind: 'offline',
    alertTitle: 'Нет подключения к интернету',
    alertDescription: runtime ? cachedEvents.length ? 'Показываем ранее загруженные события' : 'Для загрузки событий нужно соединение' : 'Показываем сохранённые события',
    sectionTitle: runtime ? 'Ранее загружено' : 'Доступно без интернета',
    explanationTitle: 'Новые события появятся после восстановления связи',
    explanation: runtime ? cachedEvents.length ? 'Данные могли измениться. Обновите их после восстановления связи.' : 'Повторите загрузку после восстановления связи.' : 'Мы сохранили часть ранее загруженных событий. Обновим, как только появится интернет.',
    cachedEvents: cachedEvents.map(event => ({ ...event })),
  };
}

export function resetCatalogSearchDraft(current: SearchDraft): SearchDraft {
  return {
    ...current,
    text: '',
    date: '',
    startLocal: '',
    endLocal: '',
    excludeCategories: [],
    includedCategories: [],
    participants: '1',
    budgetText: '',
    priceBasis: 'UNKNOWN',
  };
}

/** The P0 catalog is Moscow-only; an untouched server draft may omit this required context. */
export function completeMoscowSearchDraft(draft: SearchDraft): SearchDraft {
  return { ...draft, city: draft.city || 'Москва', timeZone: draft.timeZone || 'Europe/Moscow', text: '' };
}

export function previewDestination(action: HomeSystemAction): 'home' | 'filters' {
  return action === 'change-filters' ? 'filters' : 'home';
}
