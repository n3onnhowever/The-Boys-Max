// Two-column detail composition adapted from EventHive/EventDetail.tsx; MIT © 2026 Neko.
import {useState} from 'react';
import type { EventView,NewPlan } from '../port/contracts.ts';
import type { ViewController } from '../core/controller.ts';
import { safeExternalUrl } from '../core/links.ts';
import { PriceSummary } from './PriceSummary.tsx';
import { PlacePanel } from './PlacePanel.tsx';
import type { MapRenderer } from './PlacePanel.tsx';
export function EventDetail({ view, controller, busy, origins, renderMap }: { view: EventView; controller: ViewController; busy: boolean; origins: readonly string[]; renderMap?: MapRenderer }) {
  const [groupOpen,setGroupOpen]=useState(false),[ack,setAck]=useState(false);
  const [group,setGroup]=useState<NewPlan>({title:'Совместный план',participantSlots:2,organizerParticipates:false,decisionLocal:'',commitmentLocal:'',timeZone:'Europe/Moscow'});
  if (view.route.kind !== 'EVENT') return null;
  const event = view.event; const scope = view.route.scope;
  const sourceUrl = safeExternalUrl(event.sourceUrl,origins);
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex justify-between items-center mb-6"><button onClick={() => void controller.load({kind:'CATALOG',scope})} disabled={busy}>← К вариантам</button></div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="detail-heading"><p className="muted">{event.categoryLabel}</p>
          <h1 className="text-3xl font-bold mb-2 wrap" tabIndex={-1}>{event.title}</h1>
          <p>{event.startLabel}</p><p>{event.eligibilityLabel}</p>
        </div>
        <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <div><h2 className="text-xl font-bold text-gray-900 mb-3">О событии</h2><p className="text-gray-600 leading-relaxed whitespace-pre-line">{event.description}</p></div>
            <PlacePanel place={event.place} origins={origins} {...(renderMap ? {renderMap} : {})} />
            <p className="muted">{event.sourceLabel} · {event.freshnessLabel}</p>
            {sourceUrl && <a className="link-button" href={sourceUrl} target="_blank" rel="noopener noreferrer">Проверить у источника</a>}
          </div>
          <div className="bg-gray-50 p-6 rounded-xl h-fit border border-gray-200">
            <h2 className="font-semibold text-gray-900 mb-4">Стоимость и участие</h2>
            <PriceSummary price={event.price} />
            <button className="primary w-full" disabled={busy || !view.actions.includes('ADD_TO_PLAN')}
              onClick={() => setGroupOpen(true)}>{view.targetPlanId?'Добавить в этот план':'Создать совместный план'}</button>
            {groupOpen && <form className="form-grid" onSubmit={e=>{e.preventDefault();void controller.execute({type:'ADD_TO_PLAN',eventRef:event.ref,targetPlanId:view.targetPlanId,newPlan:view.targetPlanId?null:group,ackUnknownReasons:ack?view.unknownReasons:[]});}}>
              {!view.targetPlanId && <>
                <label>Название плана<input required value={group.title} onChange={e=>setGroup({...group,title:e.target.value})}/></label>
                <label>Сколько мест в составе<input type="number" min="1" max="50" required value={group.participantSlots} onChange={e=>setGroup({...group,participantSlots:Number(e.target.value)})}/></label>
                <label><input type="checkbox" checked={group.organizerParticipates} onChange={e=>setGroup({...group,organizerParticipates:e.target.checked})}/>Я тоже участвую и занимаю одно из этих мест</label>
                <label>Срок выбора<input type="datetime-local" required value={group.decisionLocal} onChange={e=>setGroup({...group,decisionLocal:e.target.value})}/></label>
                <label>Срок подтверждения<input type="datetime-local" required value={group.commitmentLocal} onChange={e=>setGroup({...group,commitmentLocal:e.target.value})}/></label>
                <label>Часовой пояс сроков<input required value={group.timeZone} onChange={e=>setGroup({...group,timeZone:e.target.value})}/></label>
                <p>Состав задаётся отдельно от числа желающих в поиске. Организатор может не участвовать. Личный запрос и история в план не переносятся.</p>
              </>}
              {view.unknownReasons.length>0 && <label><input type="checkbox" checked={ack} onChange={e=>setAck(e.target.checked)}/>Сохраняю как неподтверждённый вариант. Неизвестные условия: {view.unknownReasons.join(', ')}</label>}
              <button type="submit" disabled={busy||(view.unknownReasons.length>0&&!ack)}>Подтвердить перенос выбранного события</button>
              <button type="button" onClick={()=>setGroupOpen(false)}>Не создавать / закрыть</button>
            </form>}
            <p className="muted mt-4">Добавление в план не бронирует место. Билеты покупают у источника.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
