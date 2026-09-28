import { useEffect } from 'react';
import type { InviteView } from '../port/contracts.ts';
import type { ViewController } from '../core/controller.ts';
import { AppViewport, Screen } from './AppShell.tsx';
import { BackHeader, PovodButton, StatusChip } from './PovodUI.tsx';
const copy = {
  REQUESTABLE:'Организатор должен одобрить ваше присоединение. До этого данные встречи закрыты.',
  PENDING:'Запрос отправлен. Дождитесь решения организатора.',
  ACTIVE:'Вы приняты в план.', EXPIRED:'Срок действия приглашения истёк. Попросите организатора прислать новую ссылку.',
  REJECTED:'Запрос не одобрен. Уточните детали у организатора.',
} as const;
export function InvitePanel({view,controller,busy,onBack,onHome,onOpenPlan}:{view:InviteView;controller:ViewController;busy:boolean;onBack?:()=>void;onHome?:()=>void;onOpenPlan?:(id:string)=>void}) {
  useEffect(()=>{if(view.state!=='PENDING')return;const timer=window.setInterval(()=>void controller.refresh(),15000);return()=>window.clearInterval(timer)},[view.state,controller]);
  return <AppViewport><Screen className="v2-page"><BackHeader title="Приглашение" onBack={onBack??(()=>void controller.load({kind:'CATALOG',scope:{kind:'PERSONAL'}}))}/><div className="v2-content">
    <div className="v2-card v2-invite-banner"><StatusChip tone="violet">Совместный план</StatusChip><h2>{view.state==='ACTIVE'?'Вы участвуете в плане':view.state==='PENDING'?'Запрос ожидает ответа':'Приглашение в план'}</h2>{view.context&&<><strong>{view.context.planTitle}</strong><p className="v2-muted">Организатор: {view.context.organizerName}</p>{view.context.eventTitle&&<p className="v2-muted">{view.context.eventTitle}{view.context.startsAt?` · ${new Date(view.context.startsAt).toLocaleString('ru-RU',{timeZone:'Europe/Moscow',day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'})}`:''}{view.context.venue?` · ${view.context.venue}`:''}</p>}</>}<p className="v2-muted">{copy[view.state]}</p></div>
    {view.state === 'REQUESTABLE' && <PovodButton disabled={busy || !view.actions.includes('REQUEST_JOIN')} onClick={() => void controller.execute({type:'REQUEST_JOIN',inviteRef:view.inviteRef})}>Отправить запрос</PovodButton>}
    {view.state === 'PENDING' && <p className="v2-muted" role="status">Проверяем решение организатора автоматически.</p>}
    {view.state === 'ACTIVE' && view.activePlanId && <PovodButton disabled={busy} onClick={() => onOpenPlan?onOpenPlan(view.activePlanId!):void controller.load({kind:'PLAN',planId:view.activePlanId ?? ''})}>Открыть план</PovodButton>}
    <PovodButton variant="secondary" onClick={()=>onHome?onHome():void controller.load({kind:'CATALOG',scope:{kind:'PERSONAL'}})}>На главную</PovodButton>
  </div></Screen></AppViewport>;
}
