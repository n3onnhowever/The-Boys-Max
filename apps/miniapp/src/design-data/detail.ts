import { DETAIL_DESIGN_ARTWORK, type DetailViewModel } from '../view-model/detail.ts';

export type DetailDesignVariant = 'detail' | 'detail-price-unknown' | 'detail-venue-unknown' | 'detail-source-unavailable';

const baseDetail: DetailViewModel = {
  provenance: 'DESIGN_FIXTURE',
  id: 'design:detail:bikini-kill',
  title: 'БИКИНИ KILL',
  heroDateTimeLabel: '12 АПР · 20:00',
  heroVenueLabel: 'VK Stadium · Москва',
  heroArtwork: DETAIL_DESIGN_ARTWORK,
  heroArtworkAlt: 'Синтетический дизайн-пример концертной сцены',
  tags: ['Концерт', 'Инди-рок', 'Легенда'],
  description: 'Легендарные Bikini Kill возвращаются в Москву с долгожданным концертом. Феминистские гимны, энергия и честность, которые изменили целое поколение.',
  occurrence: {
    dateLabel: '12 апреля 2027, понедельник',
    startLabel: '20:00',
    endLabel: '23:00',
  },
  venue: {
    name: 'VK Stadium',
    address: 'Ленинградский просп., 80',
    displayLabel: 'VK Stadium',
  },
  price: {
    label: 'от 2 500 ₽',
    displayLabel: 'от 2 500 ₽',
    note: 'Итоговая стоимость проверяется у источника',
  },
  source: {
    label: 'Яндекс Афиша',
    freshnessLabel: null,
    url: null,
    availability: 'DESIGN_ONLY',
    statusLabel: 'Синтетический дизайн-пример',
  },
  primaryAction: { kind: 'DESIGN_ONLY', label: 'Пойти', href: null },
  saveCapability: 'DESIGN_ONLY',
  shareCapability: 'DESIGN_ONLY',
  planCapability: 'DESIGN_ONLY',
  saved: false,
  attendance: {
    kind: 'DESIGN_PREVIEW',
    countLabel: 'Уже идут 128 человек',
    disclosureLabel: 'Дизайн-пример',
    avatars: [
      { id: 'avatar-1', label: 'А', color: '#49423f' },
      { id: 'avatar-2', label: 'М', color: '#706a67' },
      { id: 'avatar-3', label: 'К', color: '#262a2e' },
      { id: 'avatar-4', label: 'С', color: '#8a7771' },
    ],
    overflowLabel: '+124',
  },
};

export const DETAIL_DESIGN_DATA: Record<DetailDesignVariant, DetailViewModel> = {
  detail: baseDetail,
  'detail-price-unknown': {
    ...baseDetail,
    id: 'design:detail:price-unknown',
    price: { label: null, displayLabel: 'Цена не указана', note: null },
  },
  'detail-venue-unknown': {
    ...baseDetail,
    id: 'design:detail:venue-unknown',
    heroVenueLabel: null,
    venue: { name: null, address: null, displayLabel: 'Место уточняется' },
  },
  'detail-source-unavailable': {
    ...baseDetail,
    id: 'design:detail:source-unavailable',
    source: {
      label: 'Источник не указан', freshnessLabel: null, url: null,
      availability: 'UNAVAILABLE', statusLabel: 'Ссылка на источник недоступна',
    },
    primaryAction: { kind: 'UNAVAILABLE', label: 'Источник недоступен', href: null },
  },
};
