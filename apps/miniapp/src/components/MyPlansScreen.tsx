import { useState } from 'react';
import type { MyPlansViewModel, ParticipantViewModel, PlanRsvpState } from '../view-model/plans.ts';
import { splitPlans } from '../view-model/plans.ts';
import { AppViewport, Screen } from './AppShell.tsx';
import { BottomNav } from './BottomNav.tsx';
import { Icon } from './Icon.tsx';
import { ParticipantAvatar } from './ParticipantAvatar.tsx';
import { PlanEventSummary } from './PlanEventSummary.tsx';
import { RsvpPill } from './RsvpPill.tsx';

interface MyPlansScreenProps {
  model: MyPlansViewModel;
  onAddPlan?: () => void;
  onPlanOpen?: (id: string) => void;
  onNavigate?: (id: string) => void;
}

function ParticipantStack({ participants, additionalCount, limit }: {
  participants: readonly ParticipantViewModel[];
  additionalCount: number;
  limit: number;
}) {
  const visible = participants.slice(0, limit);
  const overflow = participants.length - visible.length + additionalCount;
  return <span className="participant-stack" aria-label={`Участников: ${participants.length + additionalCount}`}>
    {visible.map(participant => <ParticipantAvatar key={participant.id} participant={participant} size="small" />)}
    {overflow > 0 ? <span className="participant-overflow" aria-label={`Ещё ${overflow}`}>+{overflow}</span> : null}
  </span>;
}

export function MyPlansScreen({ model, onAddPlan, onPlanOpen, onNavigate }: MyPlansScreenProps) {
  const { nearest, others } = model.plans.length ? splitPlans(model) : {nearest:null,others:[] as readonly typeof model.plans[number][]};
  const [rsvpByPlan, setRsvpByPlan] = useState<Record<string, PlanRsvpState>>(
    () => Object.fromEntries(model.plans.map(plan => [plan.id, plan.rsvp])),
  );
  const updateRsvp = (planId: string, state: PlanRsvpState) => {
    setRsvpByPlan(current => ({ ...current, [planId]: state }));
  };
  return <AppViewport>
    <a className="skip-link" href="#main">К содержимому</a>
    <Screen className="plans-screen" >
      <header className="plans-page-header">
        <span aria-hidden="true" />
        <h1>{model.title}</h1>
        <button type="button" aria-label="Добавить план" onClick={onAddPlan} disabled={!onAddPlan}><Icon name="plus" /></button>
      </header>
      <div className="plans-page-content" data-provenance={model.provenance}>
        {!nearest && <section className="saved-empty" role="status"><Icon name="calendar" /><h2>Планов пока нет</h2><p>Выберите событие и добавьте его в план.</p><button type="button" onClick={onAddPlan}>Найти событие</button></section>}
        {nearest && <>
        <section className="plans-nearest-section" aria-labelledby="nearest-plan-heading">
          <h2 id="nearest-plan-heading">Ближайший план</h2>
          <article className="nearest-plan-card" data-rsvp-state={rsvpByPlan[nearest.id]}>
            <PlanEventSummary event={nearest.event} variant="nearest" actionLabel="план" onOpen={onPlanOpen ? () => onPlanOpen(nearest.id) : undefined} />
            <div className="nearest-plan-social">
              <ParticipantStack participants={nearest.participants} additionalCount={nearest.additionalParticipantCount} limit={3} />
              <RsvpPill state={rsvpByPlan[nearest.id] ?? nearest.rsvp} onChange={model.provenance==='DESIGN_FIXTURE'?state => updateRsvp(nearest.id, state):undefined} />
            </div>
          </article>
        </section>
        <section className="plans-other-section" aria-labelledby="other-plans-heading">
          <h2 id="other-plans-heading">Другие планы</h2>
          <div className="plans-list">
            {others.map(plan => <article className="plan-list-card" key={plan.id} data-rsvp-state={rsvpByPlan[plan.id]}>
              <PlanEventSummary event={plan.event} actionLabel="план" onOpen={onPlanOpen ? () => onPlanOpen(plan.id) : undefined} />
              <div className="plan-list-social">
                <ParticipantStack participants={plan.participants} additionalCount={plan.additionalParticipantCount} limit={2} />
                <RsvpPill compact state={rsvpByPlan[plan.id] ?? plan.rsvp} onChange={model.provenance==='DESIGN_FIXTURE'?state => updateRsvp(plan.id, state):undefined} />
              </div>
            </article>)}
          </div>
        </section>
        </>}
      </div>
    </Screen>
    <BottomNav active="plan" onSelect={onNavigate} />
  </AppViewport>;
}
