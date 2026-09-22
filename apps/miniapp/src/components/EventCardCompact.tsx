import type { HomeEventViewModel } from '../view-model/home.ts';
import { Icon } from './Icon.tsx';
import { SaveAction } from './SaveAction.tsx';

export function EventCardCompact({ event, variant = 'compact', onOpen, onSave }: { event: HomeEventViewModel; variant?: 'compact' | 'nearby'; onOpen?: () => void; onSave?: () => void }) {
  return <article className={`event-card-compact event-card-${variant}`}>
    <div className="event-card-artwork">
      <button type="button" className="event-card-image-button" onClick={onOpen} disabled={!onOpen} aria-label={`Открыть событие «${event.title}»`}>
        <img src={event.artwork} alt={event.artworkAlt} />
      </button>
      <SaveAction saved={event.saved} onToggle={onSave} inverse />
    </div>
    <div className="event-card-body">
      <span className="event-card-date">{event.dateTimeLabel}</span>
      <h3>{event.title}</h3>
      <span className="event-card-venue"><Icon name="pin" />{event.venue}{event.distanceLabel ? ` · ${event.distanceLabel}` : ''}</span>
      <div className="event-card-tags">{event.categoryLabels.slice(0, 2).map(label => <span key={label}>{label}</span>)}</div>
    </div>
  </article>;
}
