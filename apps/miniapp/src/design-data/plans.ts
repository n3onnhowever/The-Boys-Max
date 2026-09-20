import { HOME_ARTWORK } from '../assets.ts';
import type { MyPlansViewModel, ParticipantViewModel, PlanDetailViewModel } from '../view-model/plans.ts';

const YOU: ParticipantViewModel = {
  id: 'design:participant:you', name: 'Ты', initials: 'Т', tone: 'ink', status: 'HOST', isCurrentUser: true,
};
const ANYA: ParticipantViewModel = {
  id: 'design:participant:anya', name: 'Аня', initials: 'А', tone: 'sand', status: 'GOING',
};
const MAX: ParticipantViewModel = {
  id: 'design:participant:max', name: 'Макс', initials: 'М', tone: 'ocean', status: 'THINKING',
};
const SASHA: ParticipantViewModel = {
  id: 'design:participant:sasha', name: 'Саша', initials: 'С', tone: 'sage', status: 'GOING',
};
const LERA: ParticipantViewModel = {
  id: 'design:participant:lera', name: 'Лера', initials: 'Л', tone: 'ember', status: 'GOING',
};

const BIKINI_KILL = {
  id: 'design:event:bikini-kill',
  title: 'БИКИНИ KILL',
  dateTimeLabel: '12 апр · Сб · 20:00',
  venue: 'VK Stadium',
  artwork: HOME_ARTWORK.hero,
  artworkAlt: 'Силуэт вокалистки в чёрно-красном концертном свете',
} as const;

/** Synthetic, deterministic social UI data. It is not membership, invite or delivery truth. */
export const MY_PLANS_DESIGN_DATA: MyPlansViewModel = {
  provenance: 'DESIGN_FIXTURE',
  title: 'Мои планы',
  nearestPlanId: 'design:plan:bikini-kill',
  plans: [
    {
      id: 'design:plan:bikini-kill', event: BIKINI_KILL,
      participants: [ANYA, MAX, SASHA], additionalParticipantCount: 2, rsvp: 'GOING',
    },
    {
      id: 'design:plan:three-days-rain',
      event: {
        id: 'design:event:three-days-rain', title: 'Три дня дождя', dateTimeLabel: '18 апр · Пт · 21:00',
        venue: '1930 Moscow', artwork: HOME_ARTWORK.concert, artworkAlt: 'Силуэт исполнителя на тёмной сцене',
      },
      participants: [ANYA, YOU], additionalParticipantCount: 0, rsvp: 'THINKING',
    },
    {
      id: 'design:plan:cassette',
      event: {
        id: 'design:event:cassette', title: 'Кассета', dateTimeLabel: '25 апр · Пт · 20:00',
        venue: 'Powerhouse', artwork: HOME_ARTWORK.gallery, artworkAlt: 'Монохромная фигура в выставочном пространстве',
      },
      participants: [YOU], additionalParticipantCount: 0, rsvp: 'SOLO',
    },
    {
      id: 'design:plan:sbpch',
      event: {
        id: 'design:event:sbpch', title: 'СБПЧ', dateTimeLabel: '4 мая · Вс · 19:00',
        venue: 'Клуб «16 Тонн»', artwork: HOME_ARTWORK.club, artworkAlt: 'Зрители в красном свете концертной сцены',
      },
      participants: [LERA, SASHA], additionalParticipantCount: 3, rsvp: 'GOING',
    },
  ],
};

/** Synthetic, deterministic detail fixture. Discussion is a lightweight UI preview only. */
export const PLAN_DETAIL_DESIGN_DATA: PlanDetailViewModel = {
  provenance: 'DESIGN_FIXTURE',
  title: 'План',
  event: BIKINI_KILL,
  personalPlan: {
    title: 'Иду на концерт с друзьями',
    dateTimeLabel: '12 апреля, 20:00',
    venue: 'VK Stadium, Москва',
    rsvp: 'GOING',
  },
  participants: [YOU, ANYA, MAX, SASHA],
  discussion: [
    { id: 'design:message:1', author: ANYA, timeLabel: 'Сегодня, 12:30', text: 'Берём метро? Так быстрее будет' },
    { id: 'design:message:2', author: MAX, timeLabel: 'Сегодня, 12:41', text: 'Да, встречаемся у входа в 19:30' },
    { id: 'design:message:3', author: SASHA, timeLabel: 'Сегодня, 13:05', text: 'Я тоже иду! 🔥' },
  ],
};

export const SOLO_PLAN_DETAIL_DESIGN_DATA: PlanDetailViewModel = {
  ...PLAN_DETAIL_DESIGN_DATA,
  personalPlan: {
    title: 'Пойду один', dateTimeLabel: '12 апреля, 20:00', venue: 'VK Stadium, Москва', rsvp: 'SOLO',
  },
  participants: [YOU],
  discussion: [],
};

export const EMPTY_DISCUSSION_PLAN_DETAIL_DESIGN_DATA: PlanDetailViewModel = {
  ...PLAN_DETAIL_DESIGN_DATA,
  discussion: [],
};
