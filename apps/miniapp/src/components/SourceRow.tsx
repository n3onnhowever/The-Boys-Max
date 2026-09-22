import type { DetailSourceViewModel } from '../view-model/detail.ts';
import { Icon } from './Icon.tsx';
import { ExternalLink } from './ExternalLink.tsx';

export function SourceRow({ source }: { source: DetailSourceViewModel }) {
  return <div className={`event-detail-info-row event-detail-source-row${source.availability === 'UNAVAILABLE' ? ' is-unknown' : ''}`}>
    <span className="event-detail-row-icon"><Icon name="external" /></span>
    <div>
      <strong>Источник: {source.label}</strong>
      <span>{source.freshnessLabel ? `${source.freshnessLabel} · ${source.statusLabel}` : source.statusLabel}</span>
    </div>
    {source.url && <ExternalLink href={source.url} className="" ariaLabel={`Открыть источник ${source.label}`}><Icon name="arrow" /></ExternalLink>}
  </div>;
}
