import { participantStatusLabel, type ParticipantViewModel } from '../view-model/plans.ts';

interface ParticipantAvatarProps {
  participant: ParticipantViewModel;
  size?: 'small' | 'medium' | 'large';
  showHostBadge?: boolean;
}

export function ParticipantAvatar({ participant, size = 'medium', showHostBadge = false }: ParticipantAvatarProps) {
  return <span
    className={`participant-avatar participant-avatar-${size} participant-avatar-${participant.tone}`}
    role="img"
    aria-label={`${participant.name}: ${participantStatusLabel(participant.status)}`}
    title={participant.name}
  >
    <span aria-hidden="true">{participant.initials}</span>
    {showHostBadge && participant.status === 'HOST' ? <span className="participant-host-badge" aria-hidden="true">★</span> : null}
  </span>;
}
