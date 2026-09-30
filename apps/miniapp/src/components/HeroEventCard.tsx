import type { HomeEventViewModel } from '../view-model/home.ts';
import { Icon } from './Icon.tsx';
import {categoryTone} from './categoryTone.ts';

export function HeroEventCard({ event, onOpen, showDesignTagline = false }: { event: HomeEventViewModel; onOpen?: () => void; showDesignTagline?: boolean }) {
  return <article className={`hero-event-card${event.artwork ? '' : ` is-no-artwork category-${categoryTone(event.categoryLabels[0])}`}`}>
    {event.artwork && <img src={event.artwork} decoding="async" fetchPriority="high" alt={event.artworkAlt} />}
    <div className="hero-event-shade" />
    <div className="hero-event-copy">
      {event.recommendationLabel && <span className="hero-event-category">{event.recommendationLabel}</span>}
      <span className="hero-event-date">{event.dateTimeLabel}</span>
      {event.sourceLabel === 'Демо-каталог' && <span className="demo-catalog-card-label">Демо-каталог</span>}
      <h1 tabIndex={-1}>{event.title}</h1>
      {showDesignTagline && <p>Легендарное возвращение<br />в Москву</p>}
      <span className="hero-event-venue"><Icon name="pin" />{event.venue}</span>
    </div>
    <button type="button" className="hero-event-open" onClick={onOpen} disabled={!onOpen} aria-label={`Открыть событие «${event.title}»`}>
      <Icon name="arrow" />
    </button>
  </article>;
}
