import { useState, type FormEvent } from 'react';
import type { DiscussionMessageViewModel, PlanDetailViewModel } from '../view-model/plans.ts';
import { participantStatusLabel } from '../view-model/plans.ts';
import { AppViewport, Screen } from './AppShell.tsx';
import { BottomNav } from './BottomNav.tsx';
import { Icon } from './Icon.tsx';
import { ParticipantAvatar } from './ParticipantAvatar.tsx';
import { PlanEventSummary } from './PlanEventSummary.tsx';
import { RsvpPill } from './RsvpPill.tsx';

interface PlanDetailScreenProps {
  model: PlanDetailViewModel;
  onBack?: () => void;
  onEventOpen?: () => void;
  onInvite?: () => void;
  onNavigate?: (id: string) => void;
}

export function PlanDetailScreen({ model, onBack, onEventOpen, onInvite, onNavigate }: PlanDetailScreenProps) {
  const [messages, setMessages] = useState<readonly DiscussionMessageViewModel[]>(model.discussion);
  const [draft, setDraft] = useState('');
  const currentUser = model.participants.find(participant => participant.isCurrentUser) ?? model.participants[0];
  const submitMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !currentUser) return;
    setMessages(current => [...current, {
      id: `design:message:local:${current.length}`,
      author: currentUser,
      timeLabel: 'Только что',
      text,
    }]);
    setDraft('');
  };
  return <AppViewport>
    <a className="skip-link" href="#main">К содержимому</a>
    <Screen className="plan-detail-screen">
      <header className="plan-detail-header">
        <button type="button" aria-label="Назад к моим планам" onClick={onBack} disabled={!onBack}><Icon name="back" /></button>
        <h1>{model.title}</h1>
        <button type="button" aria-label="Дополнительные действия недоступны в дизайн-превью" disabled><Icon name="more" /></button>
      </header>
      <div className="plan-detail-content" data-provenance={model.provenance}>
        <PlanEventSummary event={model.event} variant="detail" onOpen={onEventOpen} />

        <section className="plan-detail-section personal-plan-section" aria-labelledby="personal-plan-heading">
          <div className="plan-section-heading">
            <h2 id="personal-plan-heading">Мой план</h2>
            <span>Изменить</span>
          </div>
          <div className="personal-plan-card" data-rsvp-state={model.personalPlan.rsvp}>
            <Icon name="calendar" />
            <div className="personal-plan-copy">
              <strong>{model.personalPlan.title}</strong>
              <span>{model.personalPlan.dateTimeLabel}</span>
              <span>{model.personalPlan.venue}</span>
            </div>
            <RsvpPill state={model.personalPlan.rsvp} compact />
            <Icon name="chevronRight" />
          </div>
        </section>

        <section className="plan-detail-section participants-section" aria-labelledby="participants-heading">
          <div className="plan-section-heading">
            <h2 id="participants-heading">Участники ({model.participants.length})</h2>
            <span>Статусы</span>
          </div>
          <div className="participant-grid">
            <button type="button" className="participant-invite" onClick={onInvite} disabled={!onInvite}>
              <span><Icon name="plus" /></span>
              <strong>Пригласить</strong>
            </button>
            {model.participants.map(participant => <div className="participant-person" key={participant.id} data-participant-status={participant.status}>
              <ParticipantAvatar participant={participant} size="large" showHostBadge />
              <strong>{participant.name}</strong>
              {participant.status === 'HOST'
                ? <span className="participant-status participant-status-host">{participantStatusLabel(participant.status)}</span>
                : <span className={`participant-status participant-status-${participant.status.toLowerCase()}`}>{participantStatusLabel(participant.status)}</span>}
            </div>)}
          </div>
        </section>

        <section className="plan-detail-section discussion-section" aria-labelledby="discussion-heading">
          <div className="plan-section-heading"><h2 id="discussion-heading">Обсуждение</h2></div>
          {messages.length > 0 ? <div className="discussion-list" aria-live="polite">
            {messages.map(message => <article className="discussion-message" key={message.id}>
              <ParticipantAvatar participant={message.author} size="medium" />
              <div>
                <p className="discussion-message-meta"><strong>{message.author.name}</strong><span>{message.timeLabel}</span></p>
                <p>{message.text}</p>
              </div>
            </article>)}
          </div> : <p className="discussion-empty">Пока тихо. Можно первым уточнить детали встречи.</p>}
          <form className="discussion-composer" aria-label="Написать в обсуждение" onSubmit={submitMessage}>
            {currentUser ? <ParticipantAvatar participant={currentUser} size="medium" /> : <span aria-hidden="true" />}
            <input value={draft} onChange={event => setDraft(event.target.value)} placeholder="Написать сообщение…" aria-label="Сообщение" />
            <button type="submit" aria-label="Отправить сообщение" disabled={!draft.trim()}><Icon name="send" /></button>
          </form>
        </section>
      </div>
    </Screen>
    <BottomNav active="plan" onSelect={onNavigate} />
  </AppViewport>;
}
