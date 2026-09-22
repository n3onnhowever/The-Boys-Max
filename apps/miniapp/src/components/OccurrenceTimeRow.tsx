import type { DetailOccurrenceViewModel } from '../view-model/detail.ts';
import { Icon } from './Icon.tsx';

export function OccurrenceTimeRow({ occurrence }: { occurrence: DetailOccurrenceViewModel }) {
  const primary = occurrence.dateLabel ?? occurrence.startLabel;
  const timeRange = occurrence.dateLabel
    ? `${occurrence.startLabel}${occurrence.endLabel ? ` — ${occurrence.endLabel}` : ''}`
    : null;
  return <div className="event-detail-info-row">
    <span className="event-detail-row-icon"><Icon name="calendar" /></span>
    <div><strong>{primary}</strong>{timeRange && <span>{timeRange}</span>}</div>
  </div>;
}
