import { Icon } from './Icon.tsx';

interface EventHeroProps {
  title: string;
  dateTimeLabel: string | null;
  venueLabel: string | null;
  artwork: string | null;
  artworkAlt: string;
  saved: boolean;
  onBack: (() => void) | null;
  onShare: (() => void) | null;
  onSave: (() => void) | null;
}

export function EventHero({ title, dateTimeLabel, venueLabel, artwork, artworkAlt, saved, onBack, onShare, onSave }: EventHeroProps) {
  return <section className="event-detail-hero" aria-labelledby="event-detail-title">
    {artwork && <img className="event-detail-hero-artwork" src={artwork} decoding="async" fetchPriority="high" alt={artworkAlt} />}
    <div className="event-detail-hero-shade" aria-hidden="true" />
    <div className="event-detail-hero-controls">
      <button type="button" className="event-detail-hero-control" onClick={onBack ?? undefined} disabled={!onBack} aria-label="Назад">
        <Icon name="back" />
      </button>
      <div className="event-detail-hero-control-group">
        <button type="button" className="event-detail-hero-control" onClick={onShare ?? undefined} disabled={!onShare} aria-label="Поделиться">
          <Icon name="share" />
        </button>
        <button type="button" className={`event-detail-hero-control event-detail-heart${saved ? ' is-saved' : ''}`} onClick={onSave ?? undefined} disabled={!onSave} aria-label={saved ? 'Убрать из сохранённых' : 'Сохранить'} aria-pressed={saved}>
          <Icon name="heart" filled={saved} />
        </button>
      </div>
    </div>
    <div className="event-detail-hero-copy">
      {dateTimeLabel && <span className="event-detail-hero-date">{dateTimeLabel}</span>}
      <h1 id="event-detail-title" tabIndex={-1}>{title}</h1>
      {venueLabel && <p>{venueLabel}</p>}
    </div>
  </section>;
}
