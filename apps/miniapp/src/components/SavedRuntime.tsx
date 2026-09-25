import {useEffect,useRef,useState} from 'react';
import {api,savedMutation} from '../../client.ts';
import {savedOccurrenceToDetail,savedToViewModel,type SavedResponse} from '../view-model/saved-runtime.ts';
import {SavedScreen} from './SavedScreen.tsx';
import {DetailScreen} from './DetailScreen.tsx';
import {attachBack} from '../../bridge.ts';
import {AppViewport,Screen} from './AppShell.tsx';
import {BottomNav} from './BottomNav.tsx';
import {STATE_ASSETS} from '../assets.ts';
import {Icon} from './Icon.tsx';

export function SavedRuntime({onHome,onNavigate,origins}:{onHome:()=>void;onNavigate:(id:string)=>void;origins:readonly string[]}){
 const [response,setResponse]=useState<SavedResponse|null>(null);
 const [error,setError]=useState<string|null>(null);
 const [selected,setSelected]=useState<string|null>(null);
 const [detailSaved,setDetailSaved]=useState(true);
 const [pending,setPending]=useState(false);
 const pendingRef=useRef(false);
 const [mutationError,setMutationError]=useState<string|null>(null);
 const load=()=>{
  setResponse(null);setError(null);
  void api<SavedResponse>('/api/v1/me/saved').then(data=>{setResponse(data);setError(null);})
   .catch(()=>setError(navigator.onLine?'Не удалось загрузить сохранённое. Повторите попытку.':'Нет соединения. Сохранённое появится после восстановления связи.'));
 };
 useEffect(()=>{load();},[]);
 useEffect(()=>attachBack(()=>{if(selected){setSelected(null);load();}else onHome();}),[selected,onHome]);
 if(error||!response)return <AppViewport><Screen className="saved-screen"><header className="saved-page-header"><span aria-hidden="true"/><h1>Сохранённое</h1><span aria-hidden="true"/></header>
  <section className="saved-empty saved-runtime-state" role={error?'alert':'status'}>
   {error?<img className="system-state-art system-state-art-error" src={STATE_ASSETS.error} width="300" height="180" decoding="async" alt="" aria-hidden="true"/>:<Icon name="heart"/>}
   <h2>{error?'Сохранённое недоступно':'Загружаем сохранённое…'}</h2>
   {error&&<><p>{error}</p><div className="system-state-actions"><button className="system-state-primary" type="button" onClick={load}>Повторить</button><button className="system-state-secondary" type="button" onClick={onHome}>На главную</button></div></>}
  </section></Screen><BottomNav active="profile" onSelect={onNavigate}/></AppViewport>;
 const chosen=response.items.find(item=>item.occurrence.id===selected)?.occurrence;
 if(chosen)return <DetailScreen model={savedOccurrenceToDetail(chosen,origins)} savedState={detailSaved} saveBusy={pending} saveError={mutationError}
  activeNav="profile" onNavigate={id=>{if(id==='profile'){setSelected(null);load();}else onNavigate(id);}} onBack={()=>{setSelected(null);load();}}
  onSave={()=>{
   if(pendingRef.current)return;
   pendingRef.current=true;
   setPending(true);setMutationError(null);
   void savedMutation(chosen.id,!detailSaved).then(result=>setDetailSaved(result.saved))
    .catch(()=>setMutationError('Не удалось изменить сохранение. Повторите попытку.')).finally(()=>{pendingRef.current=false;setPending(false);});
  }}/>
 const model=savedToViewModel(response);
 return <SavedScreen model={model} onNavigate={id=>{if(id==='home')onHome();else onNavigate(id);}}
  onEventOpen={id=>{setSelected(id);setDetailSaved(true);setMutationError(null);}}
  onToggleSaved={async(id,saved)=>{
   await savedMutation(id,saved);
  }}/>
}
