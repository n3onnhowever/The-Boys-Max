import { safeExternalUrl } from '../core/links.ts';
import type { EventView } from '../port/contracts.ts';

export type DetailCapability = 'AVAILABLE' | 'DESIGN_ONLY' | 'UNAVAILABLE';

export interface DetailOccurrenceViewModel {
  dateLabel: string | null;
  startLabel: string;
  endLabel: string | null;
}

export interface DetailVenueViewModel {
  name: string | null;
  address: string | null;
  displayLabel: string;
}

export interface DetailPriceViewModel {
  label: string | null;
  displayLabel: string;
  note: string | null;
}

export interface DetailSourceViewModel {
  label: string;
  freshnessLabel: string | null;
  url: string | null;
  availability: 'AVAILABLE' | 'DESIGN_ONLY' | 'UNAVAILABLE';
  statusLabel: string;
}

export interface DetailAvatarViewModel {
  id: string;
  label: string;
  color: string;
}

export interface DetailAttendanceViewModel {
  kind: 'DESIGN_PREVIEW';
  countLabel: string;
  disclosureLabel: string;
  avatars: DetailAvatarViewModel[];
  overflowLabel: string;
}

export interface DetailPrimaryActionViewModel {
  kind: 'SOURCE_LINK' | 'DESIGN_ONLY' | 'UNAVAILABLE';
  label: string;
  href: string | null;
}

export interface DetailViewModel {
  provenance: 'DESIGN_FIXTURE' | 'SERVER_ADAPTER';
  id: string;
  title: string;
  heroDateTimeLabel: string | null;
  heroVenueLabel: string | null;
  heroArtwork: string | null;
  heroArtworkAlt: string;
  tags: string[];
  description: string;
  occurrence: DetailOccurrenceViewModel;
  venue: DetailVenueViewModel;
  price: DetailPriceViewModel;
  source: DetailSourceViewModel;
  primaryAction: DetailPrimaryActionViewModel;
  saveCapability: DetailCapability;
  shareCapability: DetailCapability;
  planCapability: DetailCapability;
  saved: boolean;
  attendance: DetailAttendanceViewModel | null;
}

const UNKNOWN_TOKENS = new Set(['UNKNOWN', 'N/A', 'NULL', '-', '—', 'НЕИЗВЕСТНО']);

function knownText(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? '';
  return normalized && !UNKNOWN_TOKENS.has(normalized.toUpperCase()) ? normalized : null;
}

function eventId(view: EventView): string {
  const { ref } = view.event;
  return [ref.sourceId, ref.externalEventId, ref.occurrenceId ?? 'event'].join(':');
}

/**
 * Presentation-only adapter. It preserves supplied labels and explicit unknowns;
 * it does not parse dates, infer venues, attach generic event imagery, or create links.
 */
export function eventToDetailViewModel(view: EventView, origins: readonly string[]): DetailViewModel {
  const event = view.event;
  const startLabel = knownText(event.startLabel) ?? 'Дата и время уточняются';
  const venueAddress = knownText(event.place.address);
  const priceLabel = knownText(event.price.baseLabel);
  const sourceLabel = knownText(event.sourceLabel) ?? 'Источник не указан';
  const sourceUrl = safeExternalUrl(event.sourceUrl, origins);
  const freshnessLabel = knownText(event.freshnessLabel);

  return {
    provenance: 'SERVER_ADAPTER',
    id: eventId(view),
    title: knownText(event.title) ?? 'Название уточняется',
    heroDateTimeLabel: knownText(event.startLabel),
    heroVenueLabel: venueAddress,
    heroArtwork: null,
    heroArtworkAlt: '',
    tags: knownText(event.categoryLabel) ? [event.categoryLabel.trim()] : [],
    description: knownText(event.description) ?? 'Описание отсутствует',
    occurrence: { dateLabel: null, startLabel, endLabel: null },
    venue: {
      name: null,
      address: venueAddress,
      displayLabel: venueAddress ?? 'Место уточняется',
    },
    price: {
      label: priceLabel,
      displayLabel: priceLabel ?? 'Цена не указана',
      note: event.price.fees_known ? knownText(event.price.totalLabel) : 'Итоговая стоимость не подтверждена',
    },
    source: {
      label: sourceLabel,
      freshnessLabel,
      url: sourceUrl,
      availability: sourceUrl ? 'AVAILABLE' : 'UNAVAILABLE',
      statusLabel: sourceUrl ? 'Открыть источник' : 'Ссылка на источник недоступна',
    },
    primaryAction: sourceUrl
      ? { kind: 'SOURCE_LINK', label: 'Перейти к источнику', href: sourceUrl }
      : { kind: 'UNAVAILABLE', label: 'Источник недоступен', href: null },
    saveCapability: 'UNAVAILABLE',
    shareCapability: 'UNAVAILABLE',
    planCapability: view.actions.includes('ADD_TO_PLAN') ? 'AVAILABLE' : 'UNAVAILABLE',
    saved: false,
    attendance: null,
  };
}
