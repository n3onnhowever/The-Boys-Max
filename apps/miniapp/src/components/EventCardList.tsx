import type { SearchEventViewModel } from '../view-model/search.ts';
import { Icon } from './Icon.tsx';
import { SaveAction } from './SaveAction.tsx';
import {categoryTone} from './categoryTone.ts';

interface EventCardListProps {
  events: readonly SearchEventViewModel[];
  savedEventIds: readonly string[];
  onSave?: (eventId: string) => void;
  canSave?: (eventId: string) => boolean;
  onOpen?: (eventId: string) => void;
  ariaLabel?: string;
}

export function EventCardList({ events, savedEventIds, onSave, canSave, onOpen, ariaLabel = 'Результаты поиска' }: EventCardListProps) {
  return <div className="event-list" aria-label={ariaLabel}>
    {events.map(event => <article className="event-list-card" key={event.id}>
      <button className="event-list-open" type="button" onClick={() => onOpen?.(event.id)} disabled={!onOpen} aria-label={`Открыть событие «${event.title}»`}>
        {event.artwork ? <img className="event-list-artwork" src={event.artwork} loading="lazy" decoding="async" alt={event.artworkAlt} /> : <span className={`event-list-artwork event-list-artwork-placeholder category-${categoryTone(event.categoryLabel)}`} role="img" aria-label="Иллюстрация категории; фото события не предоставлено" />}
        <span className="event-list-copy">
          <span className="event-list-date">{event.dateTimeLabel}</span>
          {event.sourceLabel === 'Демо-каталог' && <span className="demo-catalog-card-label">Демо-каталог</span>}
          <span className="event-list-title">{event.title}</span>
          <span className="event-list-venue"><Icon name="pin" />{event.venue}</span>
          {event.reasonLabels?.length?<span className="event-list-venue">{event.reasonLabels.slice(0,2).join(' · ')}</span>:null}
          <strong className="event-list-price">{event.priceLabel}</strong>
        </span>
      </button>
      {onSave&&<SaveAction saved={savedEventIds.includes(event.id)} onToggle={!canSave||canSave(event.id)?()=>onSave(event.id):undefined} />}
    </article>)}
  </div>;
}
