import type { PlanEventViewModel } from '../view-model/plans.ts';
import { Icon } from './Icon.tsx';

interface PlanEventSummaryProps {
  event: PlanEventViewModel;
  variant?: 'nearest' | 'compact' | 'detail';
  onOpen?: () => void;
  actionLabel?: 'событие'|'план';
}

export function PlanEventSummary({ event, variant = 'compact', onOpen, actionLabel='событие' }: PlanEventSummaryProps) {
  return <button
    type="button"
    className={`plan-event-summary plan-event-${variant}`}
    aria-label={`Открыть ${actionLabel} ${event.title}`}
    onClick={onOpen}
    disabled={!onOpen}
  >
    {event.artwork ? <img src={event.artwork} loading="lazy" decoding="async" alt={event.artworkAlt} /> : <span className="plan-event-no-art" aria-hidden="true"><Icon name="calendar" /></span>}
    <span className="plan-event-copy">
      <span className="plan-event-date">{event.dateTimeLabel}</span>
      <strong>{event.title}</strong>
      <span className="plan-event-venue">{event.venue}</span>
    </span>
    <Icon name="chevronRight" />
  </button>;
}
