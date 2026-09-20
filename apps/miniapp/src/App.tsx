import { useEffect, useSyncExternalStore } from 'react';
import type { ViewController } from './core/controller.ts';
import type { ClipboardPort } from './core/links.ts';
import type { MapRenderer } from './components/PlacePanel.tsx';
import { EventsList } from './components/EventsList.tsx';
import { EventDetail } from './components/EventDetail.tsx';
import { PlanPanel } from './components/PlanPanel.tsx';
import { InvitePanel } from './components/InvitePanel.tsx';
import { HomeScreen } from './components/HomeScreen.tsx';
import { AppViewport, Screen } from './components/AppShell.tsx';
import { BrandHeader } from './components/BrandHeader.tsx';
import { BottomNav } from './components/BottomNav.tsx';
import { HomeSkeleton } from './components/Skeleton.tsx';
import type { HomeViewModel } from './view-model/home.ts';
export interface AppProps { controller: ViewController; origins: readonly string[]; clipboard: ClipboardPort | null; renderMap?: MapRenderer; designPreview?: HomeViewModel; }
export function App({controller,origins,clipboard,renderMap,designPreview}:AppProps) {
  const state = useSyncExternalStore(controller.subscribe,controller.getSnapshot,controller.getSnapshot);
  const {view} = state;
  const busy = ['loading','submitting','uncertain','offline'].includes(state.phase);
  const routeKey = view ? JSON.stringify(view.route) : null;
  useEffect(() => {
    if (!routeKey) return;
    const url = new URL(window.location.href); url.search = ''; url.searchParams.set('route',routeKey);
    window.history.replaceState(null,'',url);
    document.querySelector<HTMLElement>('main h1')?.focus();
  },[routeKey]);
  if (designPreview) return <HomeScreen model={designPreview} />;
  if (view?.kind === 'CATALOG') return <EventsList view={view} controller={controller} state={state} busy={busy} />;
  if (!view && state.phase === 'loading') return <AppViewport>
    <a className="skip-link" href="#main">К содержимому</a>
    <Screen><BrandHeader /><HomeSkeleton /></Screen>
    <BottomNav active="home" />
  </AppViewport>;
  return <>
    <a className="skip-link" href="#main">К содержимому</a>
    <header className="app-header"><span className="brand">Повод</span><span className="brand-subtitle">Личный выбор и необязательные совместные планы</span></header>
    <main id="main" aria-busy={state.phase === 'loading' || state.phase === 'submitting'}>
      {state.phase === 'loading' && <section className="container px-4 py-8"><p role="status">Загружаем…</p><div className="loading-block" aria-hidden="true" /></section>}
      {state.error && <section className="status-panel" role="alert">
        <h1 tabIndex={-1}>{state.phase === 'auth-failed' ? 'Нужно войти снова' : state.phase === 'expired' ? 'Срок действия истёк' : state.phase === 'uncertain' ? 'Проверяем результат' : 'Не удалось продолжить'}</h1>
        <p>{state.error}</p><button disabled={state.phase === 'submitting'} onClick={() => void controller.retry()}>Повторить проверку</button>
      </section>}
      {state.phase === 'submitting' && <p className="operation-status" role="status">Сохраняем. Дождитесь ответа сервера…</p>}
      {state.receipt && !state.error && <p className="operation-status" role="status">{state.receipt === 'NO_CHANGE' ? 'Сервер подтвердил: изменений нет' : 'Сервер подтвердил сохранение'}</p>}
      {view?.kind === 'EVENT' && <EventDetail key={view.event.ref.offerId} view={view} controller={controller} busy={busy} origins={origins} {...(renderMap ? {renderMap} : {})} />}
      {view?.kind === 'PLAN' && <PlanPanel view={view} controller={controller} state={state} busy={busy} origins={origins} clipboard={clipboard} {...(renderMap ? {renderMap} : {})} />}
      {view?.kind === 'INVITE' && <InvitePanel view={view} controller={controller} busy={busy} />}
    </main>
  </>;
}
