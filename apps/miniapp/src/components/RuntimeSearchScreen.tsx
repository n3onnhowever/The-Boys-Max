import type { CatalogView, SearchDraft } from '../port/contracts.ts';
import { catalogToSearchViewModel } from '../view-model/search.ts';
import { SearchScreen } from './SearchScreen.tsx';
import {useEffect,useState} from 'react';
import {api} from '../../client.ts';
import {useCatalogSaved} from './useCatalogSaved.ts';

/** The runtime supplies actions and server data to the approved Search screen. */
export function RuntimeSearchScreen({ view, busy, error, onRetry, onApply, onOpen, onBack, onNavigate, onNotifications, onCity, searchText, onSearchText }: {
  view: CatalogView; busy: boolean; onApply: (draft: SearchDraft) => void;
  error: string | null; onRetry: () => void;
  onOpen: (id: string) => void; onBack: () => void; onNavigate: (id: string) => void;
  onNotifications?:()=>void; onCity?:()=>void;
  searchText?:string;onSearchText?:(value:string)=>void;
}) {
  const [city,setCity]=useState<string|null>(null);
  const cardSave=useCatalogSaved(view.events);
  useEffect(()=>{let active=true;void api<{city:string}>('/api/v1/me/preferences').then(x=>{if(active)setCity(x.city)}).catch(()=>{});return()=>{active=false}},[]);
  const supported=city==='Москва';
  const model=catalogToSearchViewModel(view);
  return <SearchScreen model={supported?model:{...model,events:[],resultCountLabel:'Подтверждённых событий нет'}} onBack={onBack} onNavigate={onNavigate} onEventOpen={supported?onOpen:undefined} city={city??'Город'} onNotifications={onNotifications} onCity={onCity} searchText={searchText} onSearchText={onSearchText} savedIds={cardSave.savedIds} canSave={cardSave.canSave} onSave={id=>void cardSave.toggle(id)} saveError={cardSave.error}
    cityLoading={city===null} unsupportedCity={city&&!supported?city:undefined}
    runtime={{ query: view.query, busy, error, onRetry, onApply }} />;
}
