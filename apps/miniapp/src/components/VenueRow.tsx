import type { DetailVenueViewModel } from '../view-model/detail.ts';
import { Icon } from './Icon.tsx';

export function VenueRow({ venue }: { venue: DetailVenueViewModel }) {
  return <div className={`event-detail-info-row${venue.name ? '' : ' is-unknown'}`}>
    <span className="event-detail-row-icon"><Icon name="pin" /></span>
    <div>
      <strong>{venue.displayLabel}</strong>
      {venue.name && venue.address && <span>{venue.address}</span>}
    </div>
  </div>;
}
