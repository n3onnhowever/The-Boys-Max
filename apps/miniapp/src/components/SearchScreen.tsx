import { useReducer } from 'react';
import type { SearchUiAction, SearchViewModel } from '../view-model/search.ts';
import { createSearchUiState, searchUiReducer, selectedFilterChips } from '../view-model/search.ts';
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
}

export function SearchScreen({ model, initialFilterSheetOpen = false, onBack, onNavigate }: SearchScreenProps) {
  const [state, dispatch] = useReducer(searchUiReducer, undefined, () => createSearchUiState(model, initialFilterSheetOpen));
  const selected = selectedFilterChips(state.applied);
  const act = (action: SearchUiAction) => dispatch(action);
  const openFilters = () => act({ type: 'OPEN_FILTERS' });
  return <AppViewport>
    <a className="skip-link" href="#main">К содержимому</a>
    <Screen className="search-screen">
      <header className="search-page-header">
        <button type="button" aria-label="Назад" onClick={onBack} disabled={!onBack}><Icon name="back" /></button>
        <h1>{model.title}</h1><span aria-hidden="true" />
      </header>
      <form className="search-query" role="search" onSubmit={event => event.preventDefault()}>
        <SearchBar value={state.applied.query} onChange={value => act({ type: 'SET_QUERY', value })} placeholder="Куда идём?" />
      </form>
      <div className="search-selected-filters" aria-label="Выбранные фильтры">
        {selected.slice(0, 3).map(filter => <SelectedFilterChip key={filter.id} filter={filter} onRemove={() => act({ type: 'REMOVE_FILTER', key: filter.key, value: filter.value })} />)}
      </div>
      <div className="search-filter-controls" aria-label="Настроить фильтры">
        <FilterControl label="Дата" active={state.applied.date !== 'any'} onOpen={openFilters} />
        <FilterControl label="Категория" active={state.applied.categories.length > 0} onOpen={openFilters} />
        <FilterControl label="Формат" active={state.applied.format !== 'any'} onOpen={openFilters} />
        <FilterControl label="Цена" active={state.applied.price !== 'any'} onOpen={openFilters} />
      </div>
      <SortTabs active={state.applied.sort} onSelect={value => act({ type: 'SET_SORT', value })} />
      <div className="search-results-header">
        <span>{model.resultCountLabel}</span>
        {model.mapAffordance === 'DESIGN_ONLY' ? <span className="search-map-affordance" role="button" aria-disabled="true"><Icon name="map" />Карта</span> : null}
      </div>
      <EventCardList events={model.events} savedEventIds={state.savedEventIds} onSave={eventId => act({ type: 'TOGGLE_SAVED', eventId })} />
    </Screen>
    <BottomNav active="search" onSelect={onNavigate} />
    <FilterSheet open={state.sheetOpen} filters={state.draft} onAction={act} />
  </AppViewport>;
}
