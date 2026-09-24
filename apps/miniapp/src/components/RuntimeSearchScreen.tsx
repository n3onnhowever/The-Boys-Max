import { useState } from 'react';
import type { CatalogView, SearchDraft } from '../port/contracts.ts';
import { catalogToSearchViewModel } from '../view-model/search.ts';
import { keyForEvent } from '../view-model/home.ts';
import { AppViewport, Screen } from './AppShell.tsx';
import { BottomNav } from './BottomNav.tsx';
import { EventCardList } from './EventCardList.tsx';
import { Icon } from './Icon.tsx';

const categories = [
  ['CONCERT', 'Концерты'], ['PARTY', 'Вечеринки'], ['EXHIBITION', 'Выставки'],
  ['THEATRE', 'Театр'], ['CINEMA', 'Кино'], ['FESTIVAL', 'Фестивали'], ['LECTURE', 'Лекции'],
] as const;

export function RuntimeSearchScreen({ view, busy, error, onRetry, onApply, onOpen, onBack, onNavigate }: {
  view: CatalogView; busy: boolean; onApply: (draft: SearchDraft) => void;
  error: string | null; onRetry: () => void;
  onOpen: (id: string) => void; onBack: () => void; onNavigate: (id: string) => void;
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draft, setDraft] = useState<SearchDraft>(view.query);
  const model = catalogToSearchViewModel(view);
  const apply = () => { onApply({ ...draft, text: '' }); setFiltersOpen(false); };
  return <AppViewport>
    <a className="skip-link" href="#main">К содержимому</a>
    <Screen className="search-screen runtime-search">
      <header className="search-page-header">
        <button type="button" aria-label="Назад" onClick={onBack}><Icon name="back" /></button>
        <h1>Поиск</h1><span aria-hidden="true" />
      </header>
      <p className="runtime-search-guidance">Выберите дату и категорию. Поиск по словам пока недоступен.</p>
      {error && <div className="runtime-search-error" role="alert"><p>{error}</p><button type="button" onClick={onRetry}>Повторить</button></div>}
      <button className="runtime-filter-open" type="button" onClick={() => { setDraft(view.query); setFiltersOpen(true); }} aria-expanded={filtersOpen} aria-controls="runtime-filter-panel">Фильтры{view.query.date || view.query.includedCategories.length ? ' · Выбраны' : ''}</button>
      <div className="search-results-header"><span>{model.resultCountLabel}</span></div>
      {model.events.length ? <EventCardList events={model.events} savedEventIds={[]} onOpen={onOpen} />
        : <div className="saved-empty" role="status"><h2>Событий не найдено</h2><p>Измените или сбросьте фильтры.</p></div>}
      {filtersOpen && <section id="runtime-filter-panel" className="runtime-filter-panel" aria-label="Фильтры">
        <div className="runtime-filter-heading"><h2>Фильтры</h2><button type="button" onClick={() => setFiltersOpen(false)} aria-label="Закрыть фильтры">×</button></div>
        <div className="runtime-filter-fields"><label>Дата <input type="date" value={draft.date} onChange={event => setDraft({ ...draft, date: event.target.value })} /></label>
        <fieldset><legend>Категория</legend><div className="runtime-filter-categories">{categories.map(([id, label]) => <label key={id}><input type="checkbox" checked={draft.includedCategories.includes(id)} onChange={event => setDraft({ ...draft, includedCategories: event.target.checked ? [...draft.includedCategories, id] : draft.includedCategories.filter(value => value !== id) })} />{label}</label>)}</div></fieldset></div>
        <div className="runtime-filter-actions"><button type="button" onClick={() => setDraft({ ...draft, date: '', includedCategories: [] })}>Сбросить</button><button type="button" disabled={busy} onClick={apply}>Показать события</button></div>
      </section>}
    </Screen>
    <BottomNav active="search" onSelect={onNavigate} />
  </AppViewport>;
}
