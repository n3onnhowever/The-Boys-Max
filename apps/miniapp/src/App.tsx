import { useEffect, useState, useSyncExternalStore } from 'react';
import { attachBack } from '../bridge.ts';
import type { ViewController } from './core/controller.ts';
import type { ClipboardPort } from './core/links.ts';
import type { MapRenderer } from './components/PlacePanel.tsx';
import { EventsList } from './components/EventsList.tsx';
import { EventDetail } from './components/EventDetail.tsx';
import { PlanPanel } from './components/PlanPanel.tsx';
import { InvitePanel } from './components/InvitePanel.tsx';
import { HomeSystemScreen } from './components/HomeSystemScreen.tsx';
import { NavigationProvider } from './components/BottomNav.tsx';
import { SavedRuntime } from './components/SavedRuntime.tsx';
import { RuntimeSearchScreen } from './components/RuntimeSearchScreen.tsx';
import { keyForEvent } from './view-model/home.ts';
import { HOME_SYSTEM_CHROME, errorSystemState, loadingSystemState, offlineSystemState } from './view-model/system-state.ts';

export interface AppProps {
  controller: ViewController;
  origins: readonly string[];
  clipboard: ClipboardPort | null;
  renderMap?: MapRenderer;
  entry?: { message: string; retry: () => void };
}

export function App({ controller, origins, clipboard, renderMap, entry }: AppProps) {
  const [savedPage,setSavedPage]=useState(false);
  const [searchPage,setSearchPage]=useState(false);
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const { view } = state;
  const busy = ['loading', 'submitting', 'uncertain', 'offline'].includes(state.phase);
  const routeKey = view ? JSON.stringify(view.route) : null;

  useEffect(() => {
    if (entry || !routeKey) return;
    const url = new URL(window.location.href);
    url.search = '';
    url.searchParams.set('route', routeKey);
    window.history.replaceState(null, '', url);
    document.querySelector<HTMLElement>('main h1')?.focus();
  }, [routeKey, entry]);

  useEffect(() => {
    if (entry || savedPage) return;
    if (view?.kind === 'CATALOG' && searchPage) return attachBack(() => setSearchPage(false));
    if (!view || view.kind === 'CATALOG') return;
    return attachBack(() => void controller.load({ kind: 'CATALOG', scope: view.route.kind === 'EVENT' ? view.route.scope : { kind: 'PERSONAL' } }));
  }, [controller, routeKey, entry, savedPage, searchPage]);

  // Login and ambiguous mutation outcomes must remain visible before any retained view.
  const criticalError = state.error && ['auth-failed', 'expired', 'uncertain'].includes(state.phase);
  const navigation={availableIds:['home','search','profile'],onSelect:(id:string)=>{
    if(id==='profile'){setSavedPage(true);return;}
    if(id==='search'){setSavedPage(false);setSearchPage(true);if(view?.kind !== 'CATALOG')void controller.load({kind:'CATALOG',scope:{kind:'PERSONAL'}});return;}
    if(id==='home'){setSavedPage(false);setSearchPage(false);if(view?.kind !== 'CATALOG')void controller.load({kind:'CATALOG',scope:{kind:'PERSONAL'}});}
  }};
  if (entry || criticalError) {
    const title = entry ? 'Не удалось войти'
      : state.phase === 'auth-failed' ? 'Нужно войти снова'
      : state.phase === 'expired' ? 'Срок действия истёк' : 'Проверяем результат';
    return <>
      <a className="skip-link" href="#main">К содержимому</a>
      <header className="app-header"><span className="brand">Повод</span></header>
      <main id="main">
        <section className="status-panel" role="alert">
          <h1 tabIndex={-1}>{title}</h1>
          <p>{entry?.message ?? state.error}</p>
          {!entry && (state.phase === 'expired' || state.phase === 'auth-failed') && <p>Откройте приложение заново кнопкой в чате бота MAX, чтобы подтвердить сессию.</p>}
          <button onClick={entry?.retry ?? (() => void controller.retry())}>Повторить проверку</button>
        </section>
      </main>
    </>;
  }
  if(savedPage)return <NavigationProvider value={navigation}><SavedRuntime onHome={()=>navigation.onSelect('home')} onNavigate={navigation.onSelect} origins={origins} /></NavigationProvider>;

  if (!view && state.phase === 'loading') return <HomeSystemScreen state={loadingSystemState()} chrome={HOME_SYSTEM_CHROME} />;
  if (!view && state.phase === 'offline') return <HomeSystemScreen
    state={offlineSystemState([], true)}
    chrome={HOME_SYSTEM_CHROME}
    onAction={action => { if (action === 'retry') void controller.retry(); }}
  />;
  if (!view && state.phase === 'error') return <HomeSystemScreen
    state={errorSystemState()}
    chrome={HOME_SYSTEM_CHROME}
    onAction={action => {
      if (action === 'retry') void controller.retry();
      if (action === 'return-home') void controller.load({ kind: 'CATALOG', scope: { kind: 'PERSONAL' } });
    }}
  />;
  if (view?.kind === 'CATALOG' && searchPage) return <NavigationProvider value={navigation}><RuntimeSearchScreen
    key={JSON.stringify(view.query)} view={view} busy={busy} error={state.error} onRetry={()=>void controller.retry()}
    onApply={draft => void controller.execute({type:'SEARCH',scope:view.route.kind === 'CATALOG' ? view.route.scope : {kind:'PERSONAL'},draft})}
    onOpen={id => {const event=view.events.find(candidate=>keyForEvent(candidate)===id);if(event)void controller.load({kind:'EVENT',sourceId:event.ref.sourceId,externalEventId:event.ref.externalEventId,occurrenceId:event.ref.occurrenceId,scope:view.route.kind === 'CATALOG' ? view.route.scope : {kind:'PERSONAL'}});}}
    onBack={()=>setSearchPage(false)} onNavigate={navigation.onSelect}
  /></NavigationProvider>;
  if (view?.kind === 'CATALOG') return <NavigationProvider value={navigation}><EventsList view={view} controller={controller} state={state} busy={busy} onSearchOpen={()=>setSearchPage(true)} /></NavigationProvider>;
  if (view?.kind === 'EVENT' && !state.error) return <NavigationProvider value={navigation}><EventDetail key={view.event.ref.offerId} view={view} controller={controller} busy={busy} origins={origins} activeNav={searchPage?'search':'home'} /></NavigationProvider>;

  return <>
    <a className="skip-link" href="#main">К содержимому</a>
    <header className="app-header"><span className="brand">Повод</span><span className="brand-subtitle">Личный выбор и необязательные совместные планы</span></header>
    <main id="main" aria-busy={state.phase === 'loading' || state.phase === 'submitting'}>
      {state.phase === 'loading' && <section className="container px-4 py-8"><p role="status">Загружаем…</p><div className="loading-block" aria-hidden="true" /></section>}
      {state.error && <section className="status-panel" role="alert">
        <h1 tabIndex={-1}>Не удалось продолжить</h1>
        <p>{state.error}</p><button disabled={state.phase === 'submitting'} onClick={() => void controller.retry()}>Повторить проверку</button>
      </section>}
      {state.phase === 'submitting' && <p className="operation-status" role="status">Сохраняем. Дождитесь ответа сервера…</p>}
      {state.receipt && !state.error && <p className="operation-status" role="status">{state.receipt === 'NO_CHANGE' ? 'Сервер подтвердил: изменений нет' : 'Сервер подтвердил сохранение'}</p>}
      {view?.kind === 'PLAN' && <PlanPanel view={view} controller={controller} state={state} busy={busy} origins={origins} clipboard={clipboard} {...(renderMap ? { renderMap } : {})} />}
      {view?.kind === 'INVITE' && <InvitePanel view={view} controller={controller} busy={busy} />}
    </main>
  </>;
}
