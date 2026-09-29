import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { attachBack } from '../bridge.ts';
import type { ViewController } from './core/controller.ts';
import type { ClipboardPort } from './core/links.ts';
import type { Route } from './port/contracts.ts';
import { routeSchema } from './port/schema.ts';
import {eventRouteFromToken} from './core/event-link.ts';
import type { MapRenderer } from './components/PlacePanel.tsx';
import { EventsList } from './components/EventsList.tsx';
import { EventDetail } from './components/EventDetail.tsx';
import { InvitePanel } from './components/InvitePanel.tsx';
import { HomeSystemScreen } from './components/HomeSystemScreen.tsx';
import { NavigationProvider } from './components/BottomNav.tsx';
import { SavedRuntime } from './components/SavedRuntime.tsx';
import {DetailScreen} from './components/DetailScreen.tsx';
import {savedOccurrenceToDetail} from './view-model/saved-runtime.ts';
import type {OccurrenceView} from '../../../packages/domain/occurrence-view.ts';
import { RuntimeSearchScreen } from './components/RuntimeSearchScreen.tsx';
import { LaunchStateScreen } from './components/LaunchStateScreen.tsx';
import { ProfileRuntime, PreferenceRuntime, SettingsRuntime, FriendsRuntime, NotificationsRuntime, PlansRuntime, type PreferencePage } from './components/V2RuntimePages.tsx';
import { keyForEvent } from './view-model/home.ts';
import { HOME_SYSTEM_CHROME, completeMoscowSearchDraft, errorSystemState, loadingSystemState, offlineSystemState } from './view-model/system-state.ts';
import { DEMO_NOTICE } from '../../../packages/demo/constants.ts';

export interface AppProps {
  controller: ViewController;
  origins: readonly string[];
  clipboard: ClipboardPort | null;
  renderMap?: MapRenderer;
  entry?: { message: string; retry: () => void };
  initialSurface?: Surface;
  forceInitialSurface?:boolean;
  initialFriendToken?: string | null;
  launchFailure?: string;
}

const catalogRoute: Route = {kind:'CATALOG',scope:{kind:'PERSONAL'}};
type Surface = 'home'|'search'|'plans'|'friends'|'profile'|'settings'|'notifications'|'saved'|'event'|'invite'|`plan:${string}`|PreferencePage;
const preferences:PreferencePage[]=['interests','city','budget','time','radius','notification-preferences','linked-services'];
function routeFromUrl():Route|null {
  const shared=eventRouteFromToken(new URLSearchParams(location.search).get('event'));
  if(shared)return shared;
  const raw=new URLSearchParams(location.search).get('route');
  if(!raw)return null;
  try{return routeSchema.parse(JSON.parse(raw))}catch{return null}
}
function surfaceFromUrl():Surface {
  const params=new URLSearchParams(location.search);
  const ui=params.get('ui');
  if(ui&&(['home','search','plans','friends','profile','settings','notifications','saved','event','invite',...preferences].includes(ui)||/^plan:[a-f0-9-]{36}$/i.test(ui)))return ui as Surface;
  if(params.has('friend'))return 'friends';
  const route=routeFromUrl();
  if(route?.kind==='EVENT'||eventRouteFromToken(params.get('event')))return 'event';
  if(route?.kind==='INVITE'||params.has('invite'))return 'invite';
  if(route?.kind==='PLAN')return `plan:${route.planId}`;
  return 'home';
}

export function App({ controller, origins, entry, initialSurface, forceInitialSurface, initialFriendToken, launchFailure }: AppProps) {
  const [surface,setSurface]=useState<Surface>(()=>forceInitialSurface?initialSurface??'home':surfaceFromUrl());
  const [searchText,setSearchText]=useState(()=>new URLSearchParams(location.search).get('q')??'');
  const friendToken=initialFriendToken??new URLSearchParams(location.search).get('friend');
  useEffect(()=>{if(forceInitialSurface&&initialSurface)setSurface(initialSurface)},[initialSurface,forceInitialSurface]);
  const [savedFallback,setSavedFallback]=useState<OccurrenceView|null>(null);
  const pendingScroll=useRef<number|null>(null);
  const state=useSyncExternalStore(controller.subscribe,controller.getSnapshot,controller.getSnapshot);
  const {view}=state;
  const busy=['loading','submitting','uncertain','offline'].includes(state.phase);
  const demoBanner=view?.notice===DEMO_NOTICE?<span className="demo-catalog-notice" role="status" aria-label={DEMO_NOTICE} title={DEMO_NOTICE}>Демо-каталог</span>:null;

  const navigate=useCallback((next:Surface,route?:Route,replace=false)=>{
    const current=window.history.state as {povodIndex?:number}|null;
    window.history.replaceState({...current,scrollY:window.scrollY},'',location.href);
    const url=new URL(location.href);
    url.searchParams.delete('invite');url.searchParams.delete('friend');url.searchParams.delete('route');url.searchParams.delete('event');
    url.searchParams.set('ui',next);
    if(route)url.searchParams.set('route',JSON.stringify(route));
    if(next==='search'&&searchText)url.searchParams.set('q',searchText);else url.searchParams.delete('q');
    if(replace)window.history.replaceState({...current,scrollY:0},'',url);
    else window.history.pushState({povodIndex:(current?.povodIndex??0)+1,scrollY:0},'',url);
    setSurface(next);window.scrollTo(0,0);
    if(route&&JSON.stringify(controller.getSnapshot().view?.route)!==JSON.stringify(route))void controller.load(route);
    else if((next==='home'||next==='search')&&controller.getSnapshot().view?.kind!=='CATALOG')void controller.load(catalogRoute);
  },[controller,searchText]);
  const back=useCallback(()=>{
    const current=window.history.state as {povodIndex?:number}|null;
    if((current?.povodIndex??0)>0)window.history.back();
    else navigate('home',catalogRoute,true);
  },[navigate]);
  useEffect(()=>{
    const current=window.history.state as {povodIndex?:number}|null;
    if(current?.povodIndex===undefined)window.history.replaceState({...current,povodIndex:0,scrollY:0},'',location.href);
    const pop=()=>{
      const next=surfaceFromUrl();setSurface(next);
      setSearchText(new URLSearchParams(location.search).get('q')??'');
      const route=routeFromUrl()??catalogRoute;
      if(JSON.stringify(controller.getSnapshot().view?.route)!==JSON.stringify(route))void controller.load(route);
      pendingScroll.current=(window.history.state as {scrollY?:number}|null)?.scrollY??0;
    };
    window.addEventListener('popstate',pop);return()=>window.removeEventListener('popstate',pop);
  },[controller]);
  useEffect(()=>{if(state.phase!=='ready'||pendingScroll.current===null)return;const scroll=pendingScroll.current;pendingScroll.current=null;requestAnimationFrame(()=>window.scrollTo(0,scroll))},[surface,state.phase,view]);
  useEffect(()=>attachBack(back),[back]);
  useEffect(()=>{
    if(entry||!view)return;
    if((surface==='event'||surface==='invite')&&view.route.kind===surface.toUpperCase()){
      const url=new URL(location.href);if(!url.searchParams.has('event')){url.searchParams.set('route',JSON.stringify(view.route));window.history.replaceState(window.history.state,'',url);}
    }
    if(surface==='event'&&view.kind==='PLAN')navigate(`plan:${view.planId}`,undefined,true);
  },[view,surface,entry,navigate]);
  const changeSearch=(value:string)=>{
    setSearchText(value);const url=new URL(location.href);
    if(value)url.searchParams.set('q',value);else url.searchParams.delete('q');
    window.history.replaceState(window.history.state,'',url);
  };
  const openEvent=(route:Extract<Route,{kind:'EVENT'}>,fallback?:OccurrenceView)=>{setSavedFallback(fallback??null);navigate('event',route)};
  const select=(id:string)=>{
    if(id==='plan')navigate('plans');
    else if(id==='home'||id==='search'||id==='friends'||id==='profile')navigate(id);
  };
  const navigation={availableIds:['home','search','plan','friends','profile'],onSelect:select};
  const criticalError=state.error&&['auth-failed','expired','uncertain'].includes(state.phase);
  if(launchFailure)return <LaunchStateScreen title="Ссылка недоступна" message={launchFailure} relaunch={false} actionLabel="На главную" onRetry={()=>{window.history.replaceState(null,'',location.pathname);window.location.reload()}}/>;
  if(entry||criticalError)return <LaunchStateScreen title={entry?'Не удалось войти':state.phase==='auth-failed'?'Нужно войти снова':state.phase==='expired'?'Срок действия истёк':'Проверяем результат'} message={entry?.message??state.error??''} relaunch={Boolean(entry||state.phase==='expired'||state.phase==='auth-failed')} onRetry={entry?.retry??(()=>void controller.retry())}/>;
  const wrap=(content:ReactNode)=><NavigationProvider value={navigation}>{demoBanner}{content}</NavigationProvider>;
  if(surface==='profile')return wrap(<ProfileRuntime onNavigate={select} onSaved={()=>navigate('saved')} onSettings={()=>navigate('settings')} onNotifications={()=>navigate('notifications')} onPreference={page=>navigate(page)}/>);
  if(surface==='settings')return wrap(<SettingsRuntime onNavigate={select} onBack={back} onNotifications={()=>navigate('notification-preferences')}/>);
  if(surface==='friends')return wrap(<FriendsRuntime onNavigate={select} onBack={back} inviteToken={friendToken}/>);
  if(surface==='notifications')return wrap(<NotificationsRuntime onNavigate={select} onBack={back} onOpenPlan={id=>navigate(`plan:${id}`)} onOpenInvite={ref=>navigate('invite',{kind:'INVITE',inviteRef:ref})}/>);
  if(preferences.includes(surface as PreferencePage))return wrap(<PreferenceRuntime page={surface as PreferencePage} onNavigate={select} onBack={back} onOpenCity={()=>navigate('city')}/>);
  if(surface==='plans'||surface.startsWith('plan:'))return wrap(<PlansRuntime onNavigate={select} selected={surface.startsWith('plan:')?surface.slice(5):null} onSelect={id=>id?navigate(`plan:${id}`):back()} onOpenEvent={openEvent}/>);
  if(surface==='saved')return wrap(<SavedRuntime onHome={()=>navigate('home')} onBack={back} onNavigate={select} onNotifications={()=>navigate('notifications')} origins={origins} onOpenEvent={(route,snapshot)=>openEvent(route,snapshot)}/>);
  if(surface==='search'&&view?.kind==='CATALOG')return wrap(<RuntimeSearchScreen view={view} busy={busy} error={state.error} onRetry={()=>void controller.retry()} searchText={searchText} onSearchText={changeSearch} onApply={draft=>void controller.execute({type:'SEARCH',scope:view.route.kind==='CATALOG'?view.route.scope:{kind:'PERSONAL'},draft:completeMoscowSearchDraft(draft)})} onOpen={id=>{const event=view.events.find(x=>keyForEvent(x)===id);if(event)openEvent({kind:'EVENT',sourceId:event.ref.sourceId,externalEventId:event.ref.externalEventId,occurrenceId:event.ref.occurrenceId,scope:view.route.kind==='CATALOG'?view.route.scope:{kind:'PERSONAL'}})}} onBack={back} onNavigate={select} onNotifications={()=>navigate('notifications')} onCity={()=>navigate('city')}/>);
  if(surface==='home'&&view?.kind==='CATALOG')return wrap(<EventsList view={view} controller={controller} state={state} busy={busy} onSearchOpen={()=>navigate('search')} onNotifications={()=>navigate('notifications')} onCity={()=>navigate('city')} onOpenEvent={openEvent} onInterests={()=>navigate('interests')}/>);
  if(surface==='event'&&view?.kind==='EVENT')return wrap(<EventDetail key={view.event.ref.offerId} view={view} controller={controller} busy={busy} actionError={state.error} uncertain={state.phase==='uncertain'} origins={origins} onBack={back}/>);
  if(surface==='event'&&state.error&&savedFallback)return wrap(<DetailScreen model={savedOccurrenceToDetail(savedFallback,origins)} onBack={back} savedState unavailableMessage="Актуальные сведения о событии недоступны. Показаны сохранённые факты; создание плана пока недоступно."/>);
  if(surface==='invite'&&view?.kind==='INVITE')return wrap(<InvitePanel view={view} controller={controller} busy={busy} onBack={back} onHome={()=>navigate('home',catalogRoute)} onOpenPlan={id=>navigate(`plan:${id}`)}/>);
  if(!view&&state.phase==='loading')return <HomeSystemScreen state={loadingSystemState()} chrome={HOME_SYSTEM_CHROME}/>;
  if(!view&&state.phase==='offline')return <HomeSystemScreen state={offlineSystemState([],true)} chrome={HOME_SYSTEM_CHROME} onAction={action=>{if(action==='retry')void controller.retry()}}/>;
  if(!view&&state.phase==='error')return <HomeSystemScreen state={errorSystemState()} chrome={HOME_SYSTEM_CHROME} onAction={action=>{if(action==='retry')void controller.retry();if(action==='return-home')navigate('home',catalogRoute,true)}}/>;
  return wrap(<div className="v2-page v2-content" role="status">{state.error??'Загружаем…'}</div>);
}
