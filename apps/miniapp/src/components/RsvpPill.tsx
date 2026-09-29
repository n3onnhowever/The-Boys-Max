import { planRsvpLabel, type PlanRsvpState } from '../view-model/plans.ts';
import { Icon } from './Icon.tsx';

const NEXT_RSVP: Record<PlanRsvpState, PlanRsvpState> = {
  GOING: 'THINKING',
  THINKING: 'SOLO',
  SOLO: 'GOING',
  PENDING: 'GOING',
};

interface RsvpPillProps {
  state: PlanRsvpState;
  compact?: boolean;
  onChange?: (state: PlanRsvpState) => void;
}

export function RsvpPill({ state, compact = false, onChange }: RsvpPillProps) {
  const className = `rsvp-pill rsvp-${state.toLowerCase()}${compact ? ' is-compact' : ''}`;
  const content = <>{planRsvpLabel(state)}{state !== 'SOLO' ? <Icon name="chevronDown" /> : null}</>;
  if (!onChange) return <span className={className}>{content}</span>;
  return <button
    type="button"
    className={className}
    aria-label={`Статус: ${planRsvpLabel(state)}. Изменить`}
    onClick={() => onChange(NEXT_RSVP[state])}
  >{content}</button>;
}
