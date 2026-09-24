import { useEffect, useRef, useState } from 'react';
import { api, savedMutation } from '../../client.ts';
import type { EventView, NewPlan } from '../port/contracts.ts';
import type { ViewController } from '../core/controller.ts';
import { eventToDetailViewModel } from '../view-model/detail.ts';
import { DetailScreen } from './DetailScreen.tsx';

export function EventDetail({ view, controller, busy, origins, activeNav = 'home' }: { view: EventView; controller: ViewController; busy: boolean; origins: readonly string[]; activeNav?: string }) {
  const [groupOpen, setGroupOpen] = useState(false);
  const [ack, setAck] = useState(false);
  const [saveTarget,setSaveTarget]=useState<string|null>(null);
  const [saved,setSaved]=useState(false);
  const [saveBusy,setSaveBusy]=useState(false);
  const savePending=useRef(false);
  const [saveError,setSaveError]=useState<string|null>(null);
  const [group, setGroup] = useState<NewPlan>({
    title: 'Совместный план', participantSlots: 2, organizerParticipates: false,
    decisionLocal: '', commitmentLocal: '', timeZone: 'Europe/Moscow',
  });
  if (view.route.kind !== 'EVENT') return null;
  const scope = view.route.scope;
  const model = eventToDetailViewModel(view, origins);
  useEffect(()=>{
   let active=true;
   const ref=view.event.ref;
   if(!ref.occurrenceId)return;
   const query=new URLSearchParams({sourceId:ref.sourceId,externalEventId:ref.externalEventId,occurrenceRef:ref.occurrenceId});
   void api<{occurrenceId:string|null;saved:boolean}>('/api/v1/me/saved/resolve?'+query).then(result=>{
    if(active){setSaveTarget(result.occurrenceId);setSaved(result.saved);}
   }).catch(()=>{if(active)setSaveError('Не удалось проверить сохранение. Повторите открытие события.');});
   return ()=>{active=false;};
  },[view.event.ref.sourceId,view.event.ref.externalEventId,view.event.ref.occurrenceId]);
  if(saveTarget)model.saveCapability='AVAILABLE';
  const toggleSave=async()=>{
   if(!saveTarget||savePending.current)return;
   savePending.current=true;
   setSaveBusy(true);setSaveError(null);
   try{const result=await savedMutation(saveTarget,!saved);setSaved(result.saved);}
   catch{setSaveError('Не удалось изменить сохранение. Повторите попытку.');}
   finally{savePending.current=false;setSaveBusy(false);}
  };

  const planPanel = groupOpen ? <form className="detail-plan-panel" onSubmit={event => {
    event.preventDefault();
    void controller.execute({
      type: 'ADD_TO_PLAN', eventRef: view.event.ref, targetPlanId: view.targetPlanId,
      newPlan: view.targetPlanId ? null : group, ackUnknownReasons: ack ? view.unknownReasons : [],
    });
  }}>
    <div className="detail-plan-panel-heading">
      <h2>{view.targetPlanId ? 'Добавить в план' : 'Новый совместный план'}</h2>
      <button type="button" onClick={() => setGroupOpen(false)}>Закрыть</button>
    </div>
    {!view.targetPlanId && <>
      <label>Название плана<input required value={group.title} onChange={event => setGroup({ ...group, title: event.target.value })} /></label>
      <label>Мест в составе<input type="number" min="1" max="50" required value={group.participantSlots} onChange={event => setGroup({ ...group, participantSlots: Number(event.target.value) })} /></label>
      <label className="detail-plan-check"><input type="checkbox" checked={group.organizerParticipates} onChange={event => setGroup({ ...group, organizerParticipates: event.target.checked })} />Я тоже участвую</label>
      <label>Срок выбора<input type="datetime-local" required value={group.decisionLocal} onChange={event => setGroup({ ...group, decisionLocal: event.target.value })} /></label>
      <label>Срок подтверждения<input type="datetime-local" required value={group.commitmentLocal} onChange={event => setGroup({ ...group, commitmentLocal: event.target.value })} /></label>
      <label>Часовой пояс<input required value={group.timeZone} onChange={event => setGroup({ ...group, timeZone: event.target.value })} /></label>
    </>}
    {view.unknownReasons.length > 0 && <label className="detail-plan-check"><input type="checkbox" checked={ack} onChange={event => setAck(event.target.checked)} />Сохранить как неподтверждённый вариант: {view.unknownReasons.join(', ')}</label>}
    <p>Добавление в план не бронирует место и не подтверждает покупку.</p>
    <button className="detail-plan-submit" type="submit" disabled={busy || (view.unknownReasons.length > 0 && !ack)}>Подтвердить добавление</button>
  </form> : null;

  return <DetailScreen
    model={model}
    activeNav={activeNav}
    savedState={saved}
    onSave={()=>void toggleSave()}
    saveBusy={saveBusy}
    saveError={saveError}
    busy={busy}
    onBack={() => void controller.load({ kind: 'CATALOG', scope })}
    onPlan={() => setGroupOpen(true)}
    planPanel={planPanel}
  />;
}
