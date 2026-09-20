export type PlanRsvpState = 'GOING' | 'THINKING' | 'SOLO';
export type ParticipantStatus = 'HOST' | 'GOING' | 'THINKING';
export type AvatarTone = 'ember' | 'ink' | 'ocean' | 'sage' | 'sand';

export interface ParticipantViewModel {
  id: string;
  name: string;
  initials: string;
  tone: AvatarTone;
  status: ParticipantStatus;
  isCurrentUser?: boolean;
}

export interface PlanEventViewModel {
  id: string;
  title: string;
  dateTimeLabel: string;
  venue: string;
  artwork: string;
  artworkAlt: string;
}

export interface PlanListItemViewModel {
  id: string;
  event: PlanEventViewModel;
  participants: readonly ParticipantViewModel[];
  additionalParticipantCount: number;
  rsvp: PlanRsvpState;
}

export interface MyPlansViewModel {
  provenance: 'DESIGN_FIXTURE';
  title: string;
  nearestPlanId: string;
  plans: readonly PlanListItemViewModel[];
}

export interface DiscussionMessageViewModel {
  id: string;
  author: ParticipantViewModel;
  timeLabel: string;
  text: string;
}

export interface PlanDetailViewModel {
  provenance: 'DESIGN_FIXTURE';
  title: string;
  event: PlanEventViewModel;
  personalPlan: {
    title: string;
    dateTimeLabel: string;
    venue: string;
    rsvp: PlanRsvpState;
  };
  participants: readonly ParticipantViewModel[];
  discussion: readonly DiscussionMessageViewModel[];
}

const RSVP_LABELS: Record<PlanRsvpState, string> = {
  GOING: 'Иду',
  THINKING: 'Думаю',
  SOLO: 'Пойду один',
};

const PARTICIPANT_STATUS_LABELS: Record<ParticipantStatus, string> = {
  HOST: 'Организатор',
  GOING: 'Идёт',
  THINKING: 'Думает',
};

export function planRsvpLabel(state: PlanRsvpState): string {
  return RSVP_LABELS[state];
}

export function participantStatusLabel(status: ParticipantStatus): string {
  return PARTICIPANT_STATUS_LABELS[status];
}

export function splitPlans(model: MyPlansViewModel): {
  nearest: PlanListItemViewModel;
  others: readonly PlanListItemViewModel[];
} {
  const nearest = model.plans.find(plan => plan.id === model.nearestPlanId);
  if (!nearest) throw new Error('My Plans fixture must identify an existing nearest plan.');
  return { nearest, others: model.plans.filter(plan => plan.id !== model.nearestPlanId) };
}
