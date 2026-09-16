import type { ReactNode } from 'react';
import type { PlaceView } from '../port/contracts.ts';
import { safeExternalUrl } from '../core/links.ts';
export type MapRenderer = (place: PlaceView) => ReactNode;
export function PlacePanel({ place, origins, renderMap }: { place: PlaceView; origins: readonly string[]; renderMap?: MapRenderer }) {
  const url = safeExternalUrl(place.navigationUrl, origins);
  return <section aria-label="Место встречи" className="place-panel">
    <h2 className="text-xl font-bold">Место встречи</h2>
    <p>{place.address || 'Адрес уточняется'}</p>
    {renderMap ? renderMap(place) : <p className="muted">Карта пока недоступна. Пользуйтесь адресом встречи.</p>}
    {url && <a className="link-button" href={url} target="_blank" rel="noopener noreferrer">Открыть в картах</a>}
    {place.attribution && <p className="muted">{place.attribution}</p>}
  </section>;
}
