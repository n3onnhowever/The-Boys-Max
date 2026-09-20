import type { SearchEventViewModel } from '../view-model/search.ts';
import { Icon } from './Icon.tsx';
import { SaveAction } from './SaveAction.tsx';

export function EventCardList({ events, savedEventIds, onSave }: { events: SearchEventViewModel[]; savedEventIds: string[]; onSave: (eventId: string) => void }) {
  return <div className="event-list" aria-label="Результаты поиска">
    {events.map(event => <article className="event-list-card" key={event.id}>
      <img className="event-list-artwork" src={event.artwork} alt={event.artworkAlt} />
      <div className="event-list-copy">
        <span className="event-list-date">{event.dateTimeLabel}</span>
        <h2>{event.title}</h2>
        <span className="event-list-venue"><Icon name="pin" />{event.venue}</span>
        <strong className="event-list-price">{event.priceLabel}</strong>
      </div>
      <SaveAction saved={savedEventIds.includes(event.id)} onToggle={() => onSave(event.id)} />
    </article>)}
  </div>;
}
