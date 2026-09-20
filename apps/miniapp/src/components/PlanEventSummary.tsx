import type { PlanEventViewModel } from '../view-model/plans.ts';
import { Icon } from './Icon.tsx';

interface PlanEventSummaryProps {
  event: PlanEventViewModel;
  variant?: 'nearest' | 'compact' | 'detail';
  onOpen?: () => void;
}

export function PlanEventSummary({ event, variant = 'compact', onOpen }: PlanEventSummaryProps) {
  return <button
    type="button"
    className={`plan-event-summary plan-event-${variant}`}
    aria-label={`Открыть событие ${event.title}`}
    onClick={onOpen}
    disabled={!onOpen}
  >
    <img src={event.artwork} alt={event.artworkAlt} />
    <span className="plan-event-copy">
      <span className="plan-event-date">{event.dateTimeLabel}</span>
      <strong>{event.title}</strong>
      <span className="plan-event-venue">{event.venue}</span>
    </span>
    <Icon name="chevronRight" />
  </button>;
}
