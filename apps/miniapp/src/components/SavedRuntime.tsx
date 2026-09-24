import {useEffect,useRef,useState} from 'react';
import {api,savedMutation} from '../../client.ts';
import {savedOccurrenceToDetail,savedToViewModel,type SavedResponse} from '../view-model/saved-runtime.ts';
import {SavedScreen} from './SavedScreen.tsx';
import {DetailScreen} from './DetailScreen.tsx';

export function SavedRuntime({onHome,origins}:{onHome:()=>void;origins:readonly string[]}){
 const [response,setResponse]=useState<SavedResponse|null>(null);
 const [error,setError]=useState<string|null>(null);
 const [selected,setSelected]=useState<string|null>(null);
 const [detailSaved,setDetailSaved]=useState(true);
 const [pending,setPending]=useState(false);
 const pendingRef=useRef(false);
 const [mutationError,setMutationError]=useState<string|null>(null);
 useEffect(()=>{
  let active=true;
  void api<SavedResponse>('/api/v1/me/saved').then(data=>{if(active){setResponse(data);setError(null);}})
   .catch(()=>{if(active)setError('Не удалось загрузить сохранённое.');});
  return ()=>{active=false;};
 },[]);
 if(error)return <main className="status-panel" role="alert"><h1>Сохранённое недоступно</h1><p>{error}</p><button onClick={()=>location.reload()}>Повторить</button></main>;
 if(!response)return <main role="status">Загружаем сохранённое…</main>;
 const chosen=response.items.find(item=>item.occurrence.id===selected)?.occurrence;
 if(chosen)return <DetailScreen model={savedOccurrenceToDetail(chosen,origins)} savedState={detailSaved} saveBusy={pending} saveError={mutationError}
  activeNav="profile" onBack={()=>{setSelected(null);void api<SavedResponse>('/api/v1/me/saved').then(setResponse).catch(()=>setError('Не удалось загрузить сохранённое.'));}}
  onSave={()=>{
   if(pendingRef.current)return;
   pendingRef.current=true;
   setPending(true);setMutationError(null);
   void savedMutation(chosen.id,!detailSaved).then(result=>setDetailSaved(result.saved))
    .catch(()=>setMutationError('Не удалось изменить сохранение. Повторите попытку.')).finally(()=>{pendingRef.current=false;setPending(false);});
  }}/>
 const model=savedToViewModel(response);
 return <SavedScreen model={model} onNavigate={id=>{if(id==='home')onHome();}}
  onEventOpen={id=>{setSelected(id);setDetailSaved(true);setMutationError(null);}}
  onToggleSaved={async(id,saved)=>{
   await savedMutation(id,saved);
  }}/>
}
