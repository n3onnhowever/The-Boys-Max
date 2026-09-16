import type { PriceView } from '../port/contracts.ts';
/** Only disclosure formatting. No money arithmetic, provider eligibility or budget evaluation. */
export function priceDisclosure(price: PriceView): { base: string; basis: string; total: string; warnings: string[] } {
  return {
    base: price.baseLabel || 'Базовая цена не указана', basis: price.basisLabel,
    total: price.fees_known && price.totalLabel ? price.totalLabel : 'Итоговая стоимость не подтверждена',
    warnings: [...(!price.fees_known ? ['Обязательные доплаты пока неизвестны'] : []), ...price.warnings],
  };
}
