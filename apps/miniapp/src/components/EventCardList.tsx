import type { SearchEventViewModel } from '../view-model/search.ts';
import { Icon } from './Icon.tsx';
import { SaveAction } from './SaveAction.tsx';

interface EventCardListProps {
  events: readonly SearchEventViewModel[];
  savedEventIds: readonly string[];
  onSave?: (eventId: string) => void;
  onOpen?: (eventId: string) => void;
  ariaLabel?: string;
}

export function EventCardList({ events, savedEventIds, onSave, onOpen, ariaLabel = 'Результаты поиска' }: EventCardListProps) {
  return <div className="event-list" aria-label={ariaLabel}>
    {events.map(event => <article className="event-list-card" key={event.id}>
      <button className="event-list-open" type="button" onClick={() => onOpen?.(event.id)} disabled={!onOpen} aria-label={`Открыть событие «${event.title}»`}>
        {event.artwork ? <img className="event-list-artwork" src={event.artwork} loading="lazy" decoding="async" alt={event.artworkAlt} /> : <span className="event-list-artwork event-list-artwork-placeholder" role="img" aria-label="Фото события не предоставлено" />}
        <span className="event-list-copy">
          <span className="event-list-date">{event.dateTimeLabel}</span>
          <span className="event-list-title">{event.title}</span>
          <span className="event-list-venue"><Icon name="pin" />{event.venue}</span>
          <strong className="event-list-price">{event.priceLabel}</strong>
        </span>
      </button>
      <SaveAction saved={savedEventIds.includes(event.id)} onToggle={onSave ? () => onSave(event.id) : undefined} />
    </article>)}
  </div>;
}
