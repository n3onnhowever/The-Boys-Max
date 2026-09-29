import type { PriceView } from '../port/contracts.ts';
import { priceDisclosure } from '../core/price-disclosure.ts';
/** Formatting-only disclosure; owner 19 supplies price facts. */
export function PriceSummary({ price }: { price: PriceView }) {
  const disclosure = priceDisclosure(price);
  return <div className="price-summary">
    <p className="font-semibold">{disclosure.base}</p><p className="muted">{disclosure.basis}</p>
    <p>{disclosure.total}</p>
    {disclosure.warnings.map((warning,index) => <p className="warning" key={index}>{warning}</p>)}
  </div>;
}
