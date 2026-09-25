import { useReducer, useState } from 'react';
import type { SearchDraft } from '../port/contracts.ts';
import type { SearchUiAction, SearchViewModel } from '../view-model/search.ts';
import { createSearchUiState, searchUiReducer, selectedFilterChips, runtimeSelectedFilterChips } from '../view-model/search.ts';
import { AppViewport, Screen } from './AppShell.tsx';
import { BottomNav } from './BottomNav.tsx';
import { EventCardList } from './EventCardList.tsx';
import { FilterControl } from './FilterControl.tsx';
import { FilterSheet } from './FilterSheet.tsx';
import { Icon } from './Icon.tsx';
import { SearchBar } from './SearchBar.tsx';
import { SelectedFilterChip } from './SelectedFilterChip.tsx';
import { SortTabs } from './SortTabs.tsx';

interface SearchScreenProps {
  model: SearchViewModel;
  initialFilterSheetOpen?: boolean;
  onBack?: () => void;
  onNavigate?: (id: string) => void;
  onEventOpen?: (id: string) => void;
  runtime?: { query: SearchDraft; busy: boolean; error: string | null; onRetry: () => void; onApply: (draft: SearchDraft) => void };
}

export function SearchScreen({ model, initialFilterSheetOpen = false, onBack, onNavigate, onEventOpen, runtime }: SearchScreenProps) {
  const [state, dispatch] = useReducer(searchUiReducer, undefined, () => createSearchUiState(model, initialFilterSheetOpen));
  const [runtimeSheetOpen, setRuntimeSheetOpen] = useState(false);
  const [runtimeDraft, setRuntimeDraft] = useState<SearchDraft | null>(null);
  const selected = runtime ? runtimeSelectedFilterChips(runtime.query) : selectedFilterChips(state.applied);
  const act = (action: SearchUiAction) => dispatch(action);
  const openFilters = () => runtime ? (setRuntimeDraft({ ...runtime.query, includedCategories: [...runtime.query.includedCategories] }), setRuntimeSheetOpen(true)) : act({ type: 'OPEN_FILTERS' });
  const removeRuntimeFilter = (key: string, value: string) => {
    if (!runtime) return;
    runtime.onApply({ ...runtime.query, text: '', date: key === 'date' ? '' : runtime.query.date,
      includedCategories: key === 'category' ? runtime.query.includedCategories.filter(category => category !== value) : runtime.query.includedCategories });
  };
  return <AppViewport>
    <a className="skip-link" href="#main">К содержимому</a>
    <Screen className={`search-screen${runtime ? ' runtime-search' : ''}`}>
      <header className="search-page-header">
        <button type="button" aria-label="Назад" onClick={onBack} disabled={!onBack}><Icon name="back" /></button>
        <h1>{model.title}</h1><span aria-hidden="true" />
      </header>
      <form className="search-query" role="search" onSubmit={event => event.preventDefault()}>
        <SearchBar value={runtime ? '' : state.applied.query} onChange={value => act({ type: 'SET_QUERY', value })}
          readOnly={Boolean(runtime)} onFocus={runtime ? openFilters : undefined}
          placeholder={runtime ? 'Выбрать дату и категорию' : 'Куда идём?'} />
      </form>
      {runtime && <p className="runtime-search-guidance">Поиск по словам пока недоступен</p>}
      <div className="search-selected-filters" aria-label="Выбранные фильтры">
        {selected.slice(0, 3).map(filter => <SelectedFilterChip key={filter.id} filter={filter} onRemove={() => runtime ? removeRuntimeFilter(filter.key, filter.value) : act({ type: 'REMOVE_FILTER', key: filter.key, value: filter.value })} />)}
      </div>
      <div className="search-filter-controls" aria-label="Настроить фильтры">
        <FilterControl label="Дата" active={runtime ? Boolean(runtime.query.date) : state.applied.date !== 'any'} onOpen={openFilters} expanded={runtime ? runtimeSheetOpen : state.sheetOpen} />
        <FilterControl label="Категория" active={runtime ? runtime.query.includedCategories.length > 0 : state.applied.categories.length > 0} onOpen={openFilters} expanded={runtime ? runtimeSheetOpen : state.sheetOpen} />
        {!runtime && <><FilterControl label="Формат" active={state.applied.format !== 'any'} onOpen={openFilters} expanded={state.sheetOpen} />
        <FilterControl label="Цена" active={state.applied.price !== 'any'} onOpen={openFilters} expanded={state.sheetOpen} /></>}
      </div>
      {!runtime && <SortTabs active={state.applied.sort} onSelect={value => act({ type: 'SET_SORT', value })} />}
      {runtime?.error && <div className="runtime-search-error" role="alert"><p>Не удалось обновить события. Попробуйте ещё раз.</p><button type="button" onClick={runtime.onRetry}>Повторить</button></div>}
      <div className="search-results-header">
        <span>{model.resultCountLabel}</span>
        {model.mapAffordance === 'DESIGN_ONLY' ? <span className="search-map-affordance" role="button" aria-disabled="true"><Icon name="map" />Карта</span> : null}
      </div>
      {model.events.length ? <EventCardList onOpen={onEventOpen} events={model.events} savedEventIds={runtime ? [] : state.savedEventIds}
        onSave={runtime ? undefined : eventId => act({ type: 'TOGGLE_SAVED', eventId })} />
        : <div className="saved-empty" role="status"><Icon name="search" /><h2>Событий не найдено</h2><p>Попробуйте изменить дату или категорию.</p></div>}
    </Screen>
    <BottomNav active="search" onSelect={onNavigate} />
    <FilterSheet open={runtime ? runtimeSheetOpen : state.sheetOpen} filters={state.draft} onAction={act}
      runtime={runtime && runtimeDraft ? { draft: runtimeDraft, busy: runtime.busy,
        onChange: setRuntimeDraft, onClose: () => setRuntimeSheetOpen(false),
        onReset: () => setRuntimeDraft({ ...runtimeDraft, date: '', includedCategories: [] }),
        onApply: () => { runtime.onApply({ ...runtimeDraft, text: '' }); setRuntimeSheetOpen(false); } } : undefined} />
  </AppViewport>;
}
