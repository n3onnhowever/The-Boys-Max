import { useEffect, useState } from 'react';
import type { PlanView, Feasibility } from '../port/contracts.ts';
import type { ViewController, UiState } from '../core/controller.ts';
import type { ClipboardPort } from '../core/links.ts';
import { copyInvitation } from '../core/links.ts';
import { FormInput } from './FormInput.tsx';
import { PriceSummary } from './PriceSummary.tsx';
import type { MapRenderer } from './PlacePanel.tsx';
import { PlacePanel } from './PlacePanel.tsx';
const answerText = { CAN:'Могу', CANNOT:'Не могу', UNKNOWN:'Пока не знаю', MISSING:'Ответа пока нет', STALE:'Нужен новый ответ' } as const;
const commitmentText = { CONFIRMED:'Вы подтвердили текущие условия', DECLINED:'Вы отказались от участия', MISSING:'Подтвердите участие отдельно', STALE:'Условия изменились — подтвердите их снова', NOT_PARTICIPATING:'Вы управляете встречей и не входите в состав участников' } as const;
export function PlanPanel({ view, controller, state, busy, origins, clipboard, renderMap }: { view: PlanView; controller: ViewController; state: UiState; busy: boolean; origins: readonly string[]; clipboard: ClipboardPort | null; renderMap?: MapRenderer }) {
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  useEffect(() => setCopyMessage(null), [view.inviteUrl]);
  const selected = view.options.find(option => option.optionId === view.selectedOptionId);
  const val = (key: string, baseline: string) => state.draft[key] ?? baseline;
  const allow = (action: PlanView['actions'][number]) => !busy && view.actions.includes(action);
  const copy = async () => {
    if (!view.inviteUrl) return;
    setCopyMessage(null);
    try { const result = await copyInvitation(view.inviteUrl,clipboard,origins); setCopyMessage(result.status === 'COPIED' ? 'Ссылка скопирована' : result.message); }
    catch { setCopyMessage('Не удалось скопировать эту ссылку. Обновите приглашение.'); }
  };
  return <div className="container mx-auto px-4 py-8 max-w-4xl">
    <h1 className="text-3xl font-bold wrap" tabIndex={-1}>{view.title}</h1>
    <p>{view.ruleLabel}</p><p className="muted">{view.expectedCount} ожидаемых участников</p>
    <p>{commitmentText[view.selfCommitment]}</p>
    {view.notice && <p role="status">{view.notice}</p>}
    <section className="summary-panel" aria-label="Текущий результат">
      <h2>Текущий результат</h2><p data-testid="result-label">{view.resultLabel}</p><p>{view.decisionMessage}</p>
      {selected && <div data-testid="selected-summary">
        <h3 className="wrap">{selected.title}</h3><p data-testid="summary-start">{selected.startLabel}</p>
        <PriceSummary price={selected.price} /><p>{selected.place.address}</p>
      </div>}
      {selected && view.actions.includes('CONFIRM_SELECTED') && <div className="actions">
        <button className="primary" disabled={busy} onClick={() => void controller.execute({type:'CONFIRM_SELECTED',planId:view.planId,value:'CONFIRMED'})}>{view.selfCommitment === 'STALE' ? 'Подтверждаю новые условия' : 'Подтверждаю участие'}</button>
        <button disabled={busy} onClick={() => void controller.execute({type:'CONFIRM_SELECTED',planId:view.planId,value:'DECLINED'})}>Не участвую</button>
      </div>}
      <p className="muted">Выбор варианта не подтверждает участие и не означает покупку билета.</p>
    </section>
    {view.role === 'ORGANIZER' && <section className="panel" aria-label="Приглашение участников">
      <h2>Пригласить компанию</h2>
      {!view.inviteUrl && <button disabled={!allow('CREATE_INVITE')} onClick={() => void controller.execute({type:'CREATE_INVITE',planId:view.planId})}>Создать приглашение</button>}
      {view.inviteUrl && <>
        <label className="block" htmlFor="invite-link">Ссылка приглашения</label>
        <input id="invite-link" readOnly value={view.inviteUrl} onFocus={event => event.currentTarget.select()} />
        <button disabled={busy} onClick={() => void copy()}>Скопировать приглашение</button>
        {copyMessage && <p role="status">{copyMessage}</p>}
      </>}
      <p className="muted">Ссылка позволяет попросить доступ. Вы сами выбираете, кого принять и какое место ему назначить.</p>
    </section>}
    {view.role === 'ORGANIZER' && view.organizer && <section className="panel" aria-label="Заявки и состав">
      <h2>Заявки и состав</h2>
      <ul className="roster">{view.organizer.slots.map(slot => <li key={slot.slotId}>{slot.label}{slot.required ? ' · обязательное место' : ''}<span className="muted">{slot.boundActorId ? ' · место занято' : ' · ещё не присоединился'}</span></li>)}</ul>
      {view.organizer.joinRequests.filter(request => request.state === 'PENDING').map(request => {
        const freeSlots = view.organizer?.slots.filter(slot => slot.boundActorId === null) ?? [];
        return <form key={request.requestId} className="join-request" aria-label={`Заявка: ${request.displayName}`} onSubmit={event => {
          event.preventDefault(); const slotId = new FormData(event.currentTarget).get('slotId');
          if (typeof slotId !== 'string' || !slotId) return;
          void controller.execute({type:'APPROVE_JOIN',planId:view.planId,requestId:request.requestId,actorId:request.actorId,slotId});
        }}>
          <h3>{request.displayName} просит присоединиться</h3>
          <label htmlFor={`slot-${request.requestId}`}>Место для этого участника</label>
          <select id={`slot-${request.requestId}`} name="slotId" required defaultValue="" disabled={busy || freeSlots.length === 0}>
            <option value="" disabled>Выберите место</option>
            {freeSlots.map(slot => <option value={slot.slotId} key={slot.slotId}>{slot.label}{slot.required ? ' — обязательное' : ''}</option>)}
          </select>
          <button disabled={!allow('APPROVE_JOIN') || freeSlots.length === 0}>Одобрить выбранное место</button>
          {freeSlots.length === 0 && <p className="warning">Свободных мест нет. Запрос остаётся на рассмотрении.</p>}
        </form>;
      })}
      {view.unboundCount > 0 && <p className="warning">Ещё не присоединились: {view.unboundCount}. Эти места пока без ответа.</p>}
      {view.actions.includes('START_COLLECTION') && <button className="primary" disabled={busy} onClick={() => void controller.execute({type:'START_COLLECTION',planId:view.planId})}>Начать сбор ответов</button>}
    </section>}
    <div className="section-heading"><h2>Варианты встречи</h2>
      {view.role === 'ORGANIZER' && <button disabled={busy} onClick={() => void controller.load({kind:'CATALOG',scope:{kind:'PLAN',planId:view.planId}})}>Добавить вариант</button>}
    </div>
    {view.options.map(option => <section className="panel" key={option.optionId} aria-label={`Вариант: ${option.title}`}>
      <h2 className="wrap">{option.title}</h2><p data-testid={`option-start-${option.optionId}`}>{option.startLabel}</p>
      <PriceSummary price={option.price} /><p>{option.description}</p>
      <PlacePanel place={option.place} origins={origins} {...(renderMap ? {renderMap} : {})} />
      <p className="eligibility-message">{option.eligibilityMessage}</p>
      <dl className="aggregates" aria-label={`Ответы по варианту: ${option.title}`}>
        {(['CAN','CANNOT','UNKNOWN','MISSING','STALE'] as const).map(value => <div key={value}><dt>{answerText[value]}</dt><dd data-testid={`${option.optionId}-${value}`}>{option.aggregate[value]}</dd></div>)}
      </dl>
      {view.actions.includes('SAVE_ANSWER') && <form onSubmit={event => {
        event.preventDefault(); const value = val(`answer:${option.optionId}`, option.selfAnswer);
        if (value !== 'CAN' && value !== 'CANNOT' && value !== 'UNKNOWN') return;
        void controller.execute({type:'SAVE_ANSWER',planId:view.planId,optionId:option.optionId,value});
      }}><fieldset disabled={busy}><legend>Подходит ли вам этот вариант?</legend>
        {(['CAN','CANNOT','UNKNOWN'] as Feasibility[]).map(value => <label className="check-row" key={value}>
          <input type="radio" name={`answer-${option.optionId}`} value={value} checked={val(`answer:${option.optionId}`,option.selfAnswer) === value} onChange={() => controller.setDraft(`answer:${option.optionId}`,value)} />{answerText[value]}
        </label>)}
        <button type="submit">Сохранить ответ</button>
      </fieldset></form>}
      {view.role === 'ORGANIZER' && view.actions.includes('SELECT_OPTION') && option.eligibility !== 'BLOCKED' && <form onSubmit={event => {
        event.preventDefault(); const reason = val(`reason:${option.optionId}`,'').trim();
        if (option.eligibility === 'PROVISIONAL' && !reason) return;
        void controller.execute({type:'SELECT_OPTION',planId:view.planId,optionId:option.optionId,provisionalReason:option.eligibility === 'PROVISIONAL' ? reason : null});
      }}>
        {option.eligibility === 'PROVISIONAL' && <FormInput label="Почему выбираем предварительно" required disabled={busy} value={val(`reason:${option.optionId}`,'')} onChange={event => controller.setDraft(`reason:${option.optionId}`,event.target.value)} />}
        <button className="primary" disabled={busy}>{option.eligibility === 'PROVISIONAL' ? 'Выбрать предварительно' : 'Выбрать этот вариант'}</button>
      </form>}
      {view.role === 'ORGANIZER' && view.actions.includes('EDIT_OPTION') && <details><summary>Изменить вариант</summary>
        <form onSubmit={event => { event.preventDefault(); void controller.execute({type:'EDIT_OPTION',planId:view.planId,optionId:option.optionId,patch:{title:val(`title:${option.optionId}`,option.title),startLocal:val(`start:${option.optionId}`,option.startLocal),timeZone:val(`zone:${option.optionId}`,option.timeZone)}}); }}>
          <FormInput label="Название варианта" required value={val(`title:${option.optionId}`,option.title)} onChange={event => controller.setDraft(`title:${option.optionId}`,event.target.value)} disabled={busy} />
          <FormInput label="Дата и время встречи" type="datetime-local" required value={val(`start:${option.optionId}`,option.startLocal)} onChange={event => controller.setDraft(`start:${option.optionId}`,event.target.value)} disabled={busy} />
          <FormInput label="Часовой пояс встречи" required value={val(`zone:${option.optionId}`,option.timeZone)} onChange={event => controller.setDraft(`zone:${option.optionId}`,event.target.value)} disabled={busy} />
          <p className="warning">Изменение существенных условий потребует нового согласия участников.</p>
          <button className="primary" disabled={busy}>Сохранить условия</button>
        </form>
      </details>}
    </section>)}
    {view.role === 'ORGANIZER' && view.organizer && <section className="panel" aria-label="Ответы участников"><h2>Ответы участников</h2>
      {view.organizer.responseRows.map((row,index) => <p key={index}>{row.displayName}: {answerText[row.value]}</p>)}
    </section>}
  </div>;
}
