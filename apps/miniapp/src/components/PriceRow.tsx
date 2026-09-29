import type { DetailPriceViewModel } from '../view-model/detail.ts';
import { Icon } from './Icon.tsx';

export function PriceRow({ price }: { price: DetailPriceViewModel }) {
  return <div className={`event-detail-info-row${price.label ? '' : ' is-unknown'}`}>
    <span className="event-detail-row-icon"><Icon name="ticket" /></span>
    <div><strong>{price.displayLabel}</strong>{price.note && <span>{price.note}</span>}</div>
  </div>;
}
