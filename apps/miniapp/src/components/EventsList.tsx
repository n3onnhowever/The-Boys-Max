import type { CatalogView, SearchDraft } from '../port/contracts.ts';
import type { UiState, ViewController } from '../core/controller.ts';
import { catalogToHomeViewModel, keyForEvent } from '../view-model/home.ts';
import { catalogToSearchViewModel } from '../view-model/search.ts';
import { completeMoscowSearchDraft, emptySystemState, errorSystemState, loadingSystemState, offlineSystemState, resetCatalogSearchDraft, type HomeSystemAction } from '../view-model/system-state.ts';
import { HomeScreen } from './HomeScreen.tsx';
import { HomeSystemScreen } from './HomeSystemScreen.tsx';
import {useEffect,useState} from 'react';
import {api} from '../../client.ts';
import type { Route } from '../port/contracts.ts';
import {useCatalogSaved} from './useCatalogSaved.ts';

export function EventsList({ view, controller, state, busy, onSearchOpen, onNotifications, onCity, onOpenEvent, onInterests }: { view: CatalogView; controller: ViewController; state: UiState; busy: boolean; onSearchOpen: () => void; onNotifications?:()=>void; onCity?:()=>void; onOpenEvent?:(route:Extract<Route,{kind:'EVENT'}>)=>void;onInterests?:()=>void }) {
  const [location,setLocation]=useState<{lat:number;lon:number;radiusKm:number}|undefined>();
  const [city,setCity]=useState<string|null>(null);
  const [interests,setInterests]=useState<string[]>([]);
  const [nearbyStatus,setNearbyStatus]=useState('Определяем местоположение…');
  const cardSave=useCatalogSaved(view.events);
  useEffect(()=>{let active=true;
    void api<{radiusKm:number;city:string;interests:string[]}>('/api/v1/me/preferences').then(p=>{
      if(active){setCity(p.city);setInterests(p.interests)}
      if(!navigator.geolocation){if(active)setNearbyStatus('Геолокация недоступна. Поиск событий работает без расстояния.');return;}
      navigator.geolocation.getCurrentPosition(position=>{if(active)setLocation({lat:position.coords.latitude,lon:position.coords.longitude,radiusKm:p.radiusKm})},
        ()=>{if(active)setNearbyStatus('Доступ к местоположению не получен. Поиск событий работает без расстояния.');},{timeout:5000,maximumAge:300000});
    }).catch(()=>{if(active)setNearbyStatus('Расстояние пока недоступно.')});return()=>{active=false};
  },[]);
  if (view.route.kind !== 'CATALOG') return null;
  const scope = view.route.scope;
  const text = state.draft.search ?? view.query.text;
  const originalModel = catalogToHomeViewModel(view,location,interests);
  const decorate=(event:typeof originalModel.forYou[number])=>({...event,saved:cardSave.savedIds.includes(event.id)});
  const model={...originalModel,hero:originalModel.hero?decorate(originalModel.hero):null,forYou:originalModel.forYou.map(decorate),nearby:originalModel.nearby.map(decorate)};
  const matchedInterest=view.events.find(event=>event.recommendation?.reasons.includes('INTEREST'))?.recommendation?.interest??null;
  const chrome = {
    searchPlaceholder: model.searchPlaceholder,
    activeCategoryId: model.activeCategoryId,
    categories: model.categories,
  };
  const executeSearch = (includedCategories = view.query.includedCategories) => {
    const draft: SearchDraft = { ...view.query, text: '', includedCategories };
    void controller.execute({ type: 'SEARCH', scope, draft: completeMoscowSearchDraft(draft) });
  };
  const resetFilters = () => {
    const draft = resetCatalogSearchDraft(view.query);
    void controller.execute({ type: 'SEARCH', scope, draft: completeMoscowSearchDraft(draft) });
  };
  const open = (id: string) => {
    const event = view.events.find(candidate => keyForEvent(candidate) === id);
    if (!event) return;
    const route={kind:'EVENT' as const,sourceId:event.ref.sourceId,externalEventId:event.ref.externalEventId,occurrenceId:event.ref.occurrenceId,scope};
    if(onOpenEvent)onOpenEvent(route);else void controller.load(route);
  };
  const handleStateAction = (action: HomeSystemAction) => {
    if (action === 'retry') void controller.retry();
    if (action === 'return-home') void controller.load({kind:'CATALOG',scope:{kind:'PERSONAL'}});
    if (action === 'reset-filters') resetFilters();
    if (action === 'change-filters') document.querySelector<HTMLInputElement>('.home-search input[type="search"]')?.focus();
    if (action === 'change-city') onCity?.();
  };
  const stateChromeProps = {
    chrome,
    searchOnlyFilters: true,
    searchValue: text,
    onSearchChange: (value: string) => controller.setDraft('search', value),
    onSearchSubmit: onSearchOpen,
    onCategorySelect: (id: string) => executeSearch(id === 'all' ? [] : [id]),
    onAction: handleStateAction,
  };
  if(city===null)return <HomeSystemScreen {...stateChromeProps} state={loadingSystemState()} />;
  if(city!=='Москва')return <HomeSystemScreen {...stateChromeProps} onCity={onCity} coverageCity={city} state={{...emptySystemState(),title:'Каталог города пока недоступен',description:`Для города «${city}» нет подтверждённого каталога. Выберите Москву, чтобы увидеть доступные события.`}} />;
  if (state.phase === 'offline') return <HomeSystemScreen
    {...stateChromeProps}
    state={offlineSystemState(catalogToSearchViewModel(view).events.slice(0, 2), true)}
  />;
  if (state.phase === 'error') return <HomeSystemScreen {...stateChromeProps} state={errorSystemState(state.error ?? undefined)} />;
  if (view.events.length === 0) return <HomeSystemScreen {...stateChromeProps} state={emptySystemState()} />;
  return <HomeScreen
    model={model}
    searchValue={text}
    busy={busy}
    onSearchChange={value => controller.setDraft('search', value)}
    onSearchSubmit={onSearchOpen}
    onCategorySelect={id => executeSearch(id === 'all' ? [] : [id])}
    onEventOpen={open}
    onSave={id=>void cardSave.toggle(id)}
    canSave={cardSave.canSave}
    onNotifications={onNotifications}
    onCity={onCity}
    city={city}
    nearbyStatus={nearbyStatus}
    needsInterests={interests.length===0}
    onInterests={onInterests}
    interests={interests}
    matchedInterest={matchedInterest}
  />;
}
