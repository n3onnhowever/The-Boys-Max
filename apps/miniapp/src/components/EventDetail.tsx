import { useEffect, useId, useRef, useState } from 'react';
import { api, savedMutation } from '../../client.ts';
import type { EventView, NewPlan } from '../port/contracts.ts';
import type { ViewController } from '../core/controller.ts';
import { eventToDetailViewModel } from '../view-model/detail.ts';
import { DetailScreen } from './DetailScreen.tsx';
import { Chip, PovodButton, PovodSheet } from './PovodUI.tsx';
import {share as shareInMax} from '../../bridge.ts';

function planActionMessage(error:string):string {
  if(error.includes('COMMITMENT_MUST_PRECEDE_EVENT'))return 'Подтверждение должно завершиться до начала события. Измените сроки и попробуйте снова.';
  if(error.includes('(DEADLINE)'))return 'Оба срока должны быть в будущем, а подтверждение — позже срока ответа.';
  if(error.includes('SOURCE_OBSERVATION_SUPERSEDED'))return 'Сведения источника обновились. Откройте событие заново и проверьте его детали.';
  return error.replace(/\s*\([A-Z][A-Z0-9_]+\)/g,'');
}

export function EventDetail({ view, controller, busy, actionError, uncertain = false, origins, activeNav = 'home', onBack }: { view: EventView; controller: ViewController; busy: boolean; actionError?:string|null; uncertain?:boolean; origins: readonly string[]; activeNav?: string; onBack?:()=>void }) {
  const [groupOpen, setGroupOpen] = useState(false);
  const [shareOpen,setShareOpen]=useState(false);
  const [shareNotice,setShareNotice]=useState('');
  const [eventUrl,setEventUrl]=useState('');
  const [ack, setAck] = useState(false);
  const [saveTarget,setSaveTarget]=useState<string|null>(null);
  const [saved,setSaved]=useState(false);
  const [saveBusy,setSaveBusy]=useState(false);
  const savePending=useRef(false);
  const decisionInput=useRef<HTMLInputElement>(null);
  const commitmentInput=useRef<HTMLInputElement>(null);
  const [saveError,setSaveError]=useState<string|null>(null);
  const [invalidDates,setInvalidDates]=useState({decision:false,commitment:false});
  const [invalidTitle,setInvalidTitle]=useState(false);
  const [hideActionError,setHideActionError]=useState(false);
  const fieldErrorId=useId();
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
  useEffect(()=>{
   let active=true;
   void api<{url:string}>('/api/v1/launch/link',{kind:'EVENT',sourceId:view.event.ref.sourceId,externalEventId:view.event.ref.externalEventId,occurrenceId:view.event.ref.occurrenceId}).then(x=>{if(active)setEventUrl(x.url)}).catch(()=>{if(active)setShareNotice('Не удалось подготовить ссылку на событие.')});
   return()=>{active=false};
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
  const copyEventLink=async()=>{if(!eventUrl)return;try{await navigator.clipboard.writeText(eventUrl);setShareOpen(false);setShareNotice('Ссылка скопирована')}catch{setShareNotice('Копирование недоступно. Выделите ссылку ниже.')}};
  const shareEvent=async()=>{
    if(!eventUrl)return;
    const result=await shareInMax(`Повод: ${view.event.title}`,eventUrl);
    if(result==='INVOKED'){setShareOpen(false);setShareNotice('Открыт выбор получателя в MAX.');}
    else setShareNotice('Отправка в MAX недоступна. Скопируйте ссылку.');
  };

  const planPanel = <PovodSheet title={view.targetPlanId ? 'Добавить в план' : 'Новый план'} open={groupOpen} onClose={()=>setGroupOpen(false)}><form className="v2-edit-form" noValidate onSubmit={event => {
    event.preventDefault();
    if(!view.targetPlanId){
      const titleMissing=!group.title.trim();
      const decisionMissing=!(decisionInput.current?.value&&decisionInput.current.validity.valid);
      const commitmentMissing=!(commitmentInput.current?.value&&commitmentInput.current.validity.valid);
      setInvalidTitle(titleMissing);
      setInvalidDates({decision:decisionMissing,commitment:commitmentMissing});
      if(titleMissing||decisionMissing||commitmentMissing){
        setHideActionError(true);
        (titleMissing?event.currentTarget.querySelector<HTMLInputElement>('input[name="plan-title"]'):decisionMissing?decisionInput.current:commitmentInput.current)?.focus();
        return;
      }
    }
    setHideActionError(false);
    void controller.execute({
      type: 'ADD_TO_PLAN', eventRef: view.event.ref, targetPlanId: view.targetPlanId,
      newPlan: view.targetPlanId ? null : {...group,decisionLocal:decisionInput.current?.value??'',commitmentLocal:commitmentInput.current?.value??''}, ackUnknownReasons: ack ? view.unknownReasons : [],
    });
  }}>
    {actionError&&!hideActionError&&<div className="v2-error" role="alert"><strong>Не удалось создать план</strong><p>{planActionMessage(actionError)}</p>{uncertain&&<PovodButton variant="secondary" onClick={()=>void controller.retry()}>Проверить результат</PovodButton>}</div>}
    {!view.targetPlanId && <>
      <label className="v2-label">Название плана<input name="plan-title" className="v2-input" required maxLength={160} value={group.title} aria-invalid={invalidTitle} aria-describedby={invalidTitle?`${fieldErrorId}-title`:undefined} onChange={event => {setGroup({ ...group, title: event.target.value });setHideActionError(true);if(event.target.value.trim())setInvalidTitle(false)}} />{invalidTitle&&<span id={`${fieldErrorId}-title`} className="v2-field-error" role="alert">Укажите название плана.</span>}</label>
      <div className="v2-label">Мест в плане<div className="v2-limit"><button type="button" disabled={group.participantSlots<=1} onClick={()=>setGroup({...group,participantSlots:group.participantSlots-1})}>−</button><strong>{group.participantSlots}</strong><button type="button" disabled={group.participantSlots>=50} onClick={()=>setGroup({...group,participantSlots:group.participantSlots+1})}>+</button></div></div>
      <div className="v2-label">Вы тоже идёте?<div className="v2-chip-row"><Chip selected={group.organizerParticipates} onClick={()=>setGroup({...group,organizerParticipates:true})}>Да, иду</Chip><Chip selected={!group.organizerParticipates} onClick={()=>setGroup({...group,organizerParticipates:false})}>Только организую</Chip></div></div>
      <p className="v2-muted">Выберите сроки по Москве. После них участники не смогут менять решение.</p>
      <label className="v2-label">Ответы до<input ref={decisionInput} className="v2-input" type="datetime-local" required defaultValue={group.decisionLocal} aria-invalid={invalidDates.decision} aria-describedby={invalidDates.decision?`${fieldErrorId}-decision`:undefined} onInput={event=>{setHideActionError(true);if(event.currentTarget.value&&event.currentTarget.validity.valid)setInvalidDates(current=>({...current,decision:false}))}}/>{invalidDates.decision&&<span id={`${fieldErrorId}-decision`} className="v2-field-error" role="alert">Укажите дату и время ответа.</span>}</label>
      <label className="v2-label">Подтверждение до<input ref={commitmentInput} className="v2-input" type="datetime-local" required defaultValue={group.commitmentLocal} aria-invalid={invalidDates.commitment} aria-describedby={invalidDates.commitment?`${fieldErrorId}-commitment`:undefined} onInput={event=>{setHideActionError(true);if(event.currentTarget.value&&event.currentTarget.validity.valid)setInvalidDates(current=>({...current,commitment:false}))}}/>{invalidDates.commitment&&<span id={`${fieldErrorId}-commitment`} className="v2-field-error" role="alert">Укажите дату и время подтверждения.</span>}</label>
    </>}
    {view.unknownReasons.length > 0 && <><p className="v2-muted">Не все сведения о событии подтверждены источником. Проверьте детали перед встречей.</p><Chip selected={ack} onClick={()=>setAck(!ack)}>Понимаю, детали могут измениться</Chip></>}
    <p className="v2-muted">План не бронирует место и не подтверждает покупку.</p>
    <PovodButton type="submit" disabled={busy || (view.unknownReasons.length > 0 && !ack)}>{view.targetPlanId?'Добавить событие':'Создать план'}</PovodButton>
  </form></PovodSheet>;

  return <DetailScreen
    model={model}
    activeNav={activeNav}
    savedState={saved}
    onSave={()=>void toggleSave()}
    onShare={()=>{setSaveError(null);setShareOpen(true)}}
    saveBusy={saveBusy}
    saveError={saveError}
    busy={busy}
    onBack={onBack??(() => void controller.load({ kind: 'CATALOG', scope }))}
    onPlan={() => setGroupOpen(true)}
    planPanel={<>{shareNotice&&!shareOpen&&<p className="v2-feedback" role="status">{shareNotice}</p>}{planPanel}<PovodSheet title="Поделиться событием" open={shareOpen} onClose={()=>setShareOpen(false)}><div className="v2-event-share-preview"><strong>{view.event.title}</strong><span>{model.heroDateTimeLabel} · {model.venue.displayLabel}</span></div><div className="v2-actions"><PovodButton icon="max" disabled={!eventUrl} onClick={()=>void shareEvent()}>Отправить в MAX</PovodButton><PovodButton variant="secondary" icon="copy" disabled={!eventUrl} onClick={()=>void copyEventLink()}>Скопировать ссылку</PovodButton></div>{shareNotice&&<p className="v2-feedback" role="status">{shareNotice}</p>}{shareNotice.startsWith('Копирование недоступно')&&<input className="v2-input" aria-label="Ссылка на событие для ручного копирования" readOnly value={eventUrl} onFocus={event=>event.target.select()}/>}</PovodSheet></>}
  />;
}
