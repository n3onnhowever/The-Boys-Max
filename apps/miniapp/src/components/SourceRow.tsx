import type { DetailSourceViewModel } from '../view-model/detail.ts';
import { Icon } from './Icon.tsx';

export function SourceRow({ source }: { source: DetailSourceViewModel }) {
  return <div className={`event-detail-info-row event-detail-source-row${source.availability === 'UNAVAILABLE' ? ' is-unknown' : ''}`}>
    <span className="event-detail-row-icon"><Icon name="external" /></span>
    <div>
      <strong>Источник: {source.label}</strong>
      <span>{source.freshnessLabel ? `${source.freshnessLabel} · ${source.statusLabel}` : source.statusLabel}</span>
    </div>
    {source.url && <a href={source.url} target="_blank" rel="noopener noreferrer" aria-label={`Открыть источник ${source.label}`}><Icon name="arrow" /></a>}
  </div>;
}
