import {useEffect,useState} from 'react';
import {api,savedMutation} from '../../client.ts';
import {savedToViewModel,type SavedResponse} from '../view-model/saved-runtime.ts';
import {SavedScreen} from './SavedScreen.tsx';
import {AppViewport,Screen} from './AppShell.tsx';
import {STATE_ASSETS} from '../assets.ts';
import {Icon} from './Icon.tsx';
import {BackHeader} from './PovodUI.tsx';
import type {Route} from '../port/contracts.ts';
import type {OccurrenceView} from '../../../../packages/domain/occurrence-view.ts';

export function SavedRuntime({onHome,onBack,onNavigate,onNotifications,onOpenEvent}:{onHome:()=>void;onBack:()=>void;onNavigate:(id:string)=>void;onNotifications:()=>void;origins:readonly string[];onOpenEvent:(route:Extract<Route,{kind:'EVENT'}>,snapshot:OccurrenceView)=>void}){
 const [response,setResponse]=useState<SavedResponse|null>(null);
 const [error,setError]=useState<string|null>(null);
 const load=()=>{
  setResponse(null);setError(null);
  void api<SavedResponse>('/api/v1/me/saved').then(data=>{setResponse(data);setError(null)})
   .catch(()=>setError(navigator.onLine?'Не удалось загрузить сохранённое. Повторите попытку.':'Нет соединения. Сохранённое появится после восстановления связи.'));
 };
 useEffect(()=>{load()},[]);
 if(error||!response)return <AppViewport><Screen className="saved-screen"><BackHeader title="Сохранённое" onBack={onBack}/>
  <section className="saved-empty saved-runtime-state" role={error?'alert':'status'}>
   {error?<img className="system-state-art system-state-art-error" src={STATE_ASSETS.error} width="300" height="180" decoding="async" alt="" aria-hidden="true"/>:<Icon name="heart"/>}
   <h2>{error?'Сохранённое недоступно':'Загружаем сохранённое…'}</h2>
   {error&&<><p>{error}</p><div className="system-state-actions"><button className="system-state-primary" type="button" onClick={load}>Повторить</button><button className="system-state-secondary" type="button" onClick={onHome}>На главную</button></div></>}
  </section></Screen></AppViewport>;
 const model=savedToViewModel(response);
 return <SavedScreen model={model} onNotifications={onNotifications} onBack={onBack} onNavigate={id=>id==='home'?onHome():onNavigate(id)}
  onEventOpen={id=>{const occurrence=response.items.find(item=>item.occurrence.id===id)?.occurrence;if(!occurrence)return;onOpenEvent({kind:'EVENT',sourceId:occurrence.source.providerId,externalEventId:occurrence.source.providerEventId,occurrenceId:occurrence.occurrenceRef??occurrence.id,scope:{kind:'PERSONAL'}},occurrence)}}
  onToggleSaved={async(id,saved)=>{await savedMutation(id,saved)}}/>;
}
