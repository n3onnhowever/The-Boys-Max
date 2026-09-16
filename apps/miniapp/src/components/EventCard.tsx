// Adapted from NekoTheDev/EventHive; MIT © 2026 Neko. See THIRD_PARTY_NOTICES.md.
import type { EventCardView } from '../port/contracts.ts';
import { PriceSummary } from './PriceSummary.tsx';
interface Props { event: EventCardView; onOpen: () => void; disabled: boolean; }
export function EventCard({ event, onOpen, disabled }: Props) {
  return (
    <article className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
      <div className="h-40 w-full overflow-hidden relative event-cover" aria-hidden="true">
        <span className="category-cover">{event.categoryLabel}</span>
      </div>
      <div className="p-5">
        <h2 className="text-lg font-bold text-gray-900 mb-2 wrap">{event.title}</h2>
        <div className="space-y-2 text-sm text-gray-600 mb-4">
          <div className="flex items-center gap-2"><span aria-hidden="true">▦</span><span>{event.startLabel}</span></div>
          <div className="flex items-center gap-2"><span aria-hidden="true">⌖</span><span className="wrap">{event.place.address}</span></div>
          <p>{event.eligibilityLabel}</p>
          <PriceSummary price={event.price} />
          <p className="muted">{event.sourceLabel} · {event.freshnessLabel}</p>
        </div>
        <button type="button" disabled={disabled} onClick={onOpen}
          className="block w-full text-center bg-primary text-white py-2 rounded-lg hover:bg-blue-600 transition-colors font-medium"
        >Подробнее</button>
      </div>
    </article>
  );
}
