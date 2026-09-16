// Header, catalog grid, empty and loading composition adapted from EventHive/EventsList.tsx (MIT).
import type { CatalogView, SearchDraft } from '../port/contracts.ts';
import type { ViewController, UiState } from '../core/controller.ts';
import { EventCard } from './EventCard.tsx';
import { SearchBar } from './SearchBar.tsx';
import { FormInput } from './FormInput.tsx';
export function EventsList({ view, controller, state, busy }: { view: CatalogView; controller: ViewController; state: UiState; busy: boolean }) {
  if (view.route.kind !== 'CATALOG') return null;
  const scope = view.route.scope;
  const val = (key: string, baseline: string) => state.draft[key] ?? baseline;
  const input = (key: string) => (value: string) => controller.setDraft(key, value);
  const withoutCinema = val('withoutCinema', view.query.excludeCategories.includes('CINEMA') ? '1' : '0') === '1';
  const rawBasis = val('priceBasis', view.query.priceBasis);
  const basis = rawBasis === 'PER_PERSON' || rawBasis === 'GROUP_TOTAL' ? rawBasis : 'UNKNOWN';
  const search = () => {
    const draft: SearchDraft = {
      text: val('search', view.query.text), city: val('city', view.query.city), date: val('date', view.query.date),
      startLocal: val('startLocal', view.query.startLocal), endLocal: val('endLocal', view.query.endLocal),
      timeZone: val('timeZone', view.query.timeZone), participants: val('participants', view.query.participants),
      budgetText: val('budgetText', view.query.budgetText), budgetCurrency: 'RUB', priceBasis: basis,
      includedCategories: view.query.includedCategories,
      excludeCategories: [...view.query.excludeCategories.filter(category => category !== 'CINEMA'), ...(withoutCinema ? ['CINEMA'] : [])],
    };
    void controller.execute({ type: 'SEARCH', scope, draft });
  };
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div><h1 className="text-3xl font-bold text-gray-900" tabIndex={-1}>Найдём, куда пойти</h1>
          <p className="text-gray-500 mt-1">{scope.kind === 'PERSONAL' ? 'Сначала выберите варианты — компанию пригласите позже.' : 'Личный поиск вариантов для этого плана.'}</p>
        </div>
        {scope.kind === 'PLAN' && <button type="button" onClick={() => void controller.load({kind:'PLAN',planId:scope.planId})}>Вернуться в план</button>}
      </div>
      <form onSubmit={event => { event.preventDefault(); search(); }} className="filter-panel">
        <SearchBar value={val('search', view.query.text)} onChange={input('search')} disabled={busy} />
        <p className="muted">{view.aiMessage}</p>
        <details open><summary>Условия поиска</summary>
          <div className="form-grid">
            <FormInput label="Город" value={val('city',view.query.city)} onChange={event => input('city')(event.target.value)} disabled={busy} />
            <FormInput label="Дата" type="date" value={val('date',view.query.date)} onChange={event => input('date')(event.target.value)} disabled={busy} />
            <FormInput label="Не раньше" type="time" value={val('startLocal',view.query.startLocal)} onChange={event => input('startLocal')(event.target.value)} disabled={busy} />
            <FormInput label="Не позже" type="time" value={val('endLocal',view.query.endLocal)} onChange={event => input('endLocal')(event.target.value)} disabled={busy} />
            <FormInput label="Часовой пояс" value={val('timeZone',view.query.timeZone)} onChange={event => input('timeZone')(event.target.value)} disabled={busy} />
            <FormInput label="Сколько человек хотят пойти" inputMode="numeric" value={val('participants',view.query.participants)} onChange={event => input('participants')(event.target.value)} disabled={busy} />
            <FormInput label={basis === 'GROUP_TOTAL' ? 'Бюджет на компанию, ₽' : basis === 'PER_PERSON' ? 'Бюджет на человека, ₽' : 'Бюджет, ₽ — основание уточняется'} inputMode="decimal" value={val('budgetText',view.query.budgetText)} onChange={event => input('budgetText')(event.target.value)} disabled={busy} />
          </div>
          <label className="block mb-4">Как считать бюджет<select value={basis} onChange={event => input('priceBasis')(event.target.value)} disabled={busy}><option value="PER_PERSON">На человека</option><option value="GROUP_TOTAL">На всю компанию</option><option value="UNKNOWN">Пока не определено</option></select></label>
          <label className="check-row"><input type="checkbox" checked={withoutCinema} onChange={event => input('withoutCinema')(event.target.checked ? '1' : '0')} disabled={busy} />Без кино</label>
        </details>
        <p className="muted">Число желающих не меняет состав плана и не подтверждает наличие билетов.</p>
        <button className="primary" type="submit" disabled={busy || !view.actions.includes('SEARCH')}>Искать по этим условиям</button>
      </form>
      {view.approvedFilterLabels.length > 0 && <section aria-label="Применённые условия" className="filter-summary">{view.approvedFilterLabels.map((label,index) => <span className="chip" key={index}>{label}</span>)}</section>}
      {view.events.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
          <h2>По этим условиям вариантов пока нет</h2><p className="text-gray-500 text-lg">Измените условия выше. Доступные источники и их свежесть проверяются отдельно.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {view.events.map(event => <EventCard key={`${event.ref.sourceId}:${event.ref.externalEventId}:${event.ref.occurrenceId}`} event={event} disabled={busy} onOpen={() => void controller.load({kind:'EVENT',sourceId:event.ref.sourceId,externalEventId:event.ref.externalEventId,occurrenceId:event.ref.occurrenceId,scope})} />)}
        </div>
      )}
      {view.actions.includes('CREATE_OWNED_OPTION') && <details className="owned-form"><summary>Предложить свой вариант</summary>
        <form onSubmit={event => { event.preventDefault(); void controller.execute({type:'CREATE_OWNED_OPTION',scope,title:val('ownedTitle',''),startLocal:val('ownedStart',''),timeZone:val('ownedZone',view.query.timeZone),address:val('ownedAddress',''),priceNote:val('ownedPrice','')}); }}>
          <FormInput label="Название своего варианта" required value={val('ownedTitle','')} onChange={event => input('ownedTitle')(event.target.value)} disabled={busy} />
          <FormInput label="Дата и время своего варианта" type="datetime-local" required value={val('ownedStart','')} onChange={event => input('ownedStart')(event.target.value)} disabled={busy} />
          <FormInput label="Часовой пояс своего варианта" required value={val('ownedZone',view.query.timeZone)} onChange={event => input('ownedZone')(event.target.value)} disabled={busy} />
          <FormInput label="Адрес" value={val('ownedAddress','')} onChange={event => input('ownedAddress')(event.target.value)} disabled={busy} />
          <FormInput label="Что известно о стоимости" value={val('ownedPrice','')} onChange={event => input('ownedPrice')(event.target.value)} disabled={busy} />
          <button type="submit" disabled={busy || !view.actions.includes('CREATE_OWNED_OPTION')}>Добавить свой вариант</button>
        </form>
      </details>}
    </div>
  );
}
