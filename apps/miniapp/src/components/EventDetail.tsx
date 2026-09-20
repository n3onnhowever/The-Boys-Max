import { useState } from 'react';
import type { EventView, NewPlan } from '../port/contracts.ts';
import type { ViewController } from '../core/controller.ts';
import { eventToDetailViewModel } from '../view-model/detail.ts';
import { DetailScreen } from './DetailScreen.tsx';

export function EventDetail({ view, controller, busy, origins }: { view: EventView; controller: ViewController; busy: boolean; origins: readonly string[] }) {
  const [groupOpen, setGroupOpen] = useState(false);
  const [ack, setAck] = useState(false);
  const [group, setGroup] = useState<NewPlan>({
    title: 'Совместный план', participantSlots: 2, organizerParticipates: false,
    decisionLocal: '', commitmentLocal: '', timeZone: 'Europe/Moscow',
  });
  if (view.route.kind !== 'EVENT') return null;
  const scope = view.route.scope;
  const model = eventToDetailViewModel(view, origins);

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
    busy={busy}
    onBack={() => void controller.load({ kind: 'CATALOG', scope })}
    onPlan={() => setGroupOpen(true)}
    planPanel={planPanel}
  />;
}
