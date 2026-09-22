import { useEffect, useSyncExternalStore } from 'react';
import {attachBack} from '../bridge.ts';
import type { ViewController } from './core/controller.ts';
import type { ClipboardPort } from './core/links.ts';
import type { MapRenderer } from './components/PlacePanel.tsx';
import { EventsList } from './components/EventsList.tsx';
import { EventDetail } from './components/EventDetail.tsx';
import { PlanPanel } from './components/PlanPanel.tsx';
import { InvitePanel } from './components/InvitePanel.tsx';
export interface AppProps { controller: ViewController; origins: readonly string[]; clipboard: ClipboardPort | null; renderMap?: MapRenderer; entry?:{message:string;retry:()=>void}; }
export function App({controller,origins,clipboard,renderMap,entry}:AppProps) {
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
  useEffect(()=>{
    if(!view||view.kind==='CATALOG')return;
    return attachBack(()=>void controller.load({kind:'CATALOG',scope:{kind:'PERSONAL'}}));
  },[controller,routeKey]);
  return <>
    <a className="skip-link" href="#main">К содержимому</a>
    <header className="app-header"><span className="brand">Афиша</span><span className="brand-subtitle">The Boys · личный выбор и необязательные совместные планы</span></header>
    <main id="main" aria-busy={state.phase === 'loading' || state.phase === 'submitting'}>
      {entry && <section className="status-panel" role="alert"><h1>Не удалось войти</h1><p>{entry.message}</p><button onClick={entry.retry}>Повторить проверку</button></section>}
      {!entry && state.phase === 'loading' && <section className="container px-4 py-8"><p role="status">Загружаем…</p><div className="loading-block" aria-hidden="true" /></section>}
      {state.error && <section className="status-panel" role="alert">
        <h1 tabIndex={-1}>{state.phase === 'auth-failed' ? 'Нужно войти снова' : state.phase === 'expired' ? 'Срок действия истёк' : state.phase === 'uncertain' ? 'Проверяем результат' : 'Не удалось продолжить'}</h1>
        <p>{state.error}</p><button disabled={state.phase === 'submitting'} onClick={() => void controller.retry()}>Повторить проверку</button>
      </section>}
      {state.phase === 'submitting' && <p className="operation-status" role="status">Сохраняем. Дождитесь ответа сервера…</p>}
      {state.receipt && !state.error && <p className="operation-status" role="status">{state.receipt === 'NO_CHANGE' ? 'Сервер подтвердил: изменений нет' : 'Сервер подтвердил сохранение'}</p>}
      {view?.kind === 'CATALOG' && <EventsList view={view} controller={controller} state={state} busy={busy} />}
      {view?.kind === 'EVENT' && <EventDetail key={view.event.ref.offerId} view={view} controller={controller} busy={busy} origins={origins} {...(renderMap ? {renderMap} : {})} />}
      {view?.kind === 'PLAN' && <PlanPanel view={view} controller={controller} state={state} busy={busy} origins={origins} clipboard={clipboard} {...(renderMap ? {renderMap} : {})} />}
      {view?.kind === 'INVITE' && <InvitePanel view={view} controller={controller} busy={busy} />}
    </main>
  </>;
}
