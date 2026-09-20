import type { CSSProperties } from 'react';
import type { DetailAttendanceViewModel } from '../view-model/detail.ts';
import { Icon } from './Icon.tsx';

export function AvatarStack({ attendance }: { attendance: DetailAttendanceViewModel }) {
  return <aside className="detail-attendance" aria-label={`${attendance.countLabel}. ${attendance.disclosureLabel}`}>
    <div className="detail-attendance-heading">
      <h2>{attendance.countLabel}</h2><span>{attendance.disclosureLabel}</span>
    </div>
    <div className="detail-attendance-stack" aria-hidden="true">
      {attendance.avatars.map(avatar => <span key={avatar.id} className="detail-avatar" style={{ '--avatar-color': avatar.color } as CSSProperties}>{avatar.label}</span>)}
      <span className="detail-avatar-overflow">{attendance.overflowLabel}</span>
      <Icon name="arrow" />
    </div>
  </aside>;
}
