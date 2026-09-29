import {useEffect,useMemo,useRef,useState} from 'react';
import {api,savedMutation} from '../../client.ts';
import type {EventCardView} from '../port/contracts.ts';
import {keyForEvent} from '../view-model/home.ts';

type SaveRecord={occurrenceId:string|null;saved:boolean};
/** The same occurrence resolver and durable mutation used by Event Detail. */
export function useCatalogSaved(events:readonly EventCardView[]){
 const signature=useMemo(()=>JSON.stringify(events.map(event=>event.ref)),[events]);
 const [records,setRecords]=useState<Record<string,SaveRecord>>({});
 const [error,setError]=useState('');
 const pending=useRef(new Set<string>());
 useEffect(()=>{
  let live=true;
  const refs=JSON.parse(signature) as EventCardView['ref'][];
  void Promise.all(refs.map(async ref=>{
   if(!ref.occurrenceId)return null;
   const query=new URLSearchParams({sourceId:ref.sourceId,externalEventId:ref.externalEventId,occurrenceRef:ref.occurrenceId});
   const result=await api<SaveRecord>('/api/v1/me/saved/resolve?'+query);
   return {key:[ref.sourceId,ref.externalEventId,ref.occurrenceId].join(':'),result};
  })).then(items=>{if(live)setRecords(Object.fromEntries(items.filter((x):x is {key:string;result:SaveRecord}=>Boolean(x)).map(x=>[x.key,x.result])))})
   .catch(()=>{if(live)setError('Не удалось проверить сохранение карточек. Откройте событие и повторите попытку.')});
  return()=>{live=false};
 },[signature]);
 const toggle=async(id:string)=>{
  const record=records[id];if(!record?.occurrenceId||pending.current.has(id))return;
  pending.current.add(id);setError('');
  try{const result=await savedMutation(record.occurrenceId,!record.saved);setRecords(current=>({...current,[id]:{...record,saved:result.saved}}))}
  catch{setError('Не удалось изменить сохранение. Повторите попытку.')}
  finally{pending.current.delete(id)}
 };
 return {savedIds:events.filter(event=>records[keyForEvent(event)]?.saved).map(keyForEvent),canSave:(id:string)=>Boolean(records[id]?.occurrenceId),toggle,error};
}
