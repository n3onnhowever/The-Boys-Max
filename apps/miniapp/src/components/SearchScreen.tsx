import { useReducer, useState } from 'react';
import type { SearchDraft } from '../port/contracts.ts';
import type { SearchUiAction, SearchViewModel } from '../view-model/search.ts';
import { createSearchUiState, searchUiReducer, selectedFilterChips, runtimeSelectedFilterChips, resultCountLabel } from '../view-model/search.ts';
import { AppViewport, Screen } from './AppShell.tsx';
import { BottomNav } from './BottomNav.tsx';
import { EventCardList } from './EventCardList.tsx';
import { FilterControl } from './FilterControl.tsx';
import { FilterSheet } from './FilterSheet.tsx';
import { Icon } from './Icon.tsx';
import { SearchBar } from './SearchBar.tsx';
import { SelectedFilterChip } from './SelectedFilterChip.tsx';
import { SortTabs } from './SortTabs.tsx';
import { BrandHeader } from './BrandHeader.tsx';
import { RUNTIME_CATEGORY_OPTIONS } from '../view-model/search.ts';
import type {SmartProposal} from '../../../../modules/ai/smart-occasion.ts';

interface SearchScreenProps {
  model: SearchViewModel;
  initialFilterSheetOpen?: boolean;
  onBack?: () => void;
  onNavigate?: (id: string) => void;
  onEventOpen?: (id: string) => void;
  runtime?: { query: SearchDraft; busy: boolean; error: string | null; onRetry: () => void; onApply: (draft: SearchDraft) => void };
  unsupportedCity?:string;
  cityLoading?:boolean;
  onNotifications?:()=>void;
  onCity?:()=>void;
  city?:string;
  searchText?:string;
  onSearchText?:(value:string)=>void;
  savedIds?:readonly string[];canSave?:(id:string)=>boolean;onSave?:(id:string)=>void;saveError?:string;
  smart?:{proposal:(SmartProposal&{proposalId:string;review:{dateFrom:string|null;dateTo:string|null}})|null;error:string|null;busy:boolean;onPropose:()=>void;onAccept:(basis:'PER_PERSON'|'GROUP_TOTAL'|null)=>void;onDismiss:()=>void};
}

export function SearchScreen({ model, initialFilterSheetOpen = false, onBack, onNavigate, onEventOpen, runtime, unsupportedCity, cityLoading = false, onNotifications, onCity, city, searchText, onSearchText, savedIds=[], canSave, onSave, saveError, smart }: SearchScreenProps) {
  const [state, dispatch] = useReducer(searchUiReducer, undefined, () => createSearchUiState(model, initialFilterSheetOpen));
  const [runtimeSheetOpen, setRuntimeSheetOpen] = useState(false);
  const [runtimeDraft, setRuntimeDraft] = useState<SearchDraft | null>(null);
  const [text,setText]=useState('');
  const effectiveText=searchText??text;
  const shownEvents=runtime&&effectiveText.trim()?model.events.filter(e=>[e.title,e.venue].some(x=>x.toLocaleLowerCase('ru-RU').includes(effectiveText.trim().toLocaleLowerCase('ru-RU')))):model.events;
  const selected = runtime ? runtimeSelectedFilterChips(runtime.query) : selectedFilterChips(state.applied);
  const act = (action: SearchUiAction) => dispatch(action);
  const openFilters = () => runtime ? (setRuntimeDraft({ ...runtime.query, includedCategories: [...runtime.query.includedCategories] }), setRuntimeSheetOpen(true)) : act({ type: 'OPEN_FILTERS' });
  const removeRuntimeFilter = (key: string, value: string) => {
    if (!runtime) return;
    runtime.onApply({ ...runtime.query, text: effectiveText, date: key === 'date' ? '' : runtime.query.date,dateThrough:key==='date'?undefined:runtime.query.dateThrough,
      budgetText:key==='price'?'':runtime.query.budgetText,priceBasis:key==='price'?'UNKNOWN':runtime.query.priceBasis,freeOnly:key==='price'?false:runtime.query.freeOnly,
      startLocal:key==='time'||key==='date'?'':runtime.query.startLocal,endLocal:key==='time'||key==='date'?'':runtime.query.endLocal,
      includedCategories: key === 'category' ? runtime.query.includedCategories.filter(category => category !== value) : runtime.query.includedCategories });
  };
  return <AppViewport>
    <a className="skip-link" href="#main">К содержимому</a>
    <Screen className={`search-screen${runtime ? ' runtime-search' : ''}`}>
      {runtime?<BrandHeader onNotifications={onNotifications} onCity={onCity} city={city}/>:<header className="search-page-header">
        <button type="button" aria-label="Назад" onClick={onBack} disabled={!onBack}><Icon name="back" /></button>
        <h1>{model.title}</h1><span aria-hidden="true" />
      </header>}
      {runtime&&<div className="v2-search-title"><h1>Поиск</h1><p>События, выставки и многое другое</p></div>}
      <form className="search-query" role="search" onSubmit={event => {event.preventDefault();if(runtime)runtime.onApply({...runtime.query,text:effectiveText});}}>
        <SearchBar value={runtime ? effectiveText : state.applied.query} onChange={value => runtime?(onSearchText??setText)(value):act({ type: 'SET_QUERY', value })}
          placeholder="Куда идём?" />
      </form>
      {runtime&&smart&&<section className="v2-discovery" aria-label="Умный повод">
        {!smart.proposal&&<button type="button" className="v2-button v2-button-secondary" disabled={smart.busy||!effectiveText.trim()} onClick={smart.onPropose}>Разобрать запрос</button>}
        {smart.error&&<p className="v2-error" role="alert">{smart.error}</p>}
        {smart.proposal&&<div role="group" aria-label="Проверьте условия поиска"><h2>Проверьте условия</h2>
          <p>{[smart.proposal.review.dateFrom&&`Дата: ${smart.proposal.review.dateFrom}${smart.proposal.review.dateTo&&smart.proposal.review.dateTo!==smart.proposal.review.dateFrom?' — '+smart.proposal.review.dateTo:''}`,smart.proposal.draft.daypart&&`Время: ${{MORNING:'утром',DAY:'днём',EVENING:'вечером',NIGHT:'ночью'}[smart.proposal.draft.daypart]}`,smart.proposal.draft.categories.length&&`Категория: ${smart.proposal.draft.categories.map(category=>RUNTIME_CATEGORY_OPTIONS.find(option=>option.id===category)?.label??category).join(', ')}`,smart.proposal.draft.budget_max!==null&&`До ${smart.proposal.draft.budget_max} ₽`,smart.proposal.draft.free_only&&'Только бесплатно',smart.proposal.draft.city&&`Город: ${smart.proposal.draft.city}`,smart.proposal.draft.party_size&&`Участников: ${smart.proposal.draft.party_size}`,smart.proposal.draft.interests.length&&`Интересы: ${smart.proposal.draft.interests.join(', ')}`,smart.proposal.draft.mood_tags.length&&`Настроение: ${smart.proposal.draft.mood_tags.join(', ')}`,smart.proposal.draft.radius_preference==='NEARBY'&&'Поблизости'].filter(Boolean).join(' · ')||'Условия не распознаны'}</p>
          {smart.proposal.clarification?<><p>{smart.proposal.clarification.question}</p>{smart.proposal.clarification.code==='BUDGET_BASIS'&&<><button type="button" className="v2-button v2-button-secondary" disabled={smart.busy} onClick={()=>smart.onAccept('GROUP_TOTAL')}>На всех</button><button type="button" className="v2-button v2-button-secondary" disabled={smart.busy} onClick={()=>smart.onAccept('PER_PERSON')}>На человека</button></>}</>
            :<button type="button" className="v2-button v2-button-primary" disabled={smart.busy} onClick={()=>smart.onAccept(null)}>Применить условия</button>}
          <button type="button" className="v2-button v2-button-secondary" onClick={smart.onDismiss}>Отмена</button>
        </div>}
      </section>}
      <div className="search-selected-filters" aria-label="Выбранные фильтры">
        {selected.map(filter => <SelectedFilterChip key={filter.id} filter={filter} onRemove={() => runtime ? removeRuntimeFilter(filter.key, filter.value) : act({ type: 'REMOVE_FILTER', key: filter.key, value: filter.value })} />)}
      </div>
      <div className="search-filter-controls" aria-label="Настроить фильтры">
        <FilterControl label="Дата" active={runtime ? Boolean(runtime.query.date) : state.applied.date !== 'any'} onOpen={openFilters} expanded={runtime ? runtimeSheetOpen : state.sheetOpen} />
        <FilterControl label="Категория" active={runtime ? runtime.query.includedCategories.length > 0 : state.applied.categories.length > 0} onOpen={openFilters} expanded={runtime ? runtimeSheetOpen : state.sheetOpen} />
        {!runtime && <FilterControl label="Формат" active={state.applied.format !== 'any'} onOpen={openFilters} expanded={state.sheetOpen} />}
        <FilterControl label="Цена" active={runtime?Boolean(runtime.query.budgetText):state.applied.price !== 'any'} onOpen={openFilters} expanded={runtime?runtimeSheetOpen:state.sheetOpen} />
      </div>
      {runtime&&!effectiveText&&!selected.length&&<section className="v2-discovery"><h2>Выбрать по интересу</h2><div className="v2-chip-row">{RUNTIME_CATEGORY_OPTIONS.slice(0,6).map(option=><button type="button" className="v2-chip" key={option.id} onClick={()=>runtime.onApply({...runtime.query,includedCategories:[option.id]})}>{option.label}</button>)}</div></section>}
      {!runtime && <SortTabs active={state.applied.sort} onSelect={value => act({ type: 'SET_SORT', value })} />}
      {runtime&&<div className="v2-sort-trigger" role="status">Порядок каталога · сортировка скоро</div>}
      {runtime?.error && <div className="runtime-search-error" role="alert"><p>Не удалось обновить события. Попробуйте ещё раз.</p><button type="button" onClick={runtime.onRetry}>Повторить</button></div>}
      <div className="search-results-header">
        <span>{cityLoading?'Загружаем город…':runtime?resultCountLabel(shownEvents.length):model.resultCountLabel}</span>
        {runtime?<span className="search-map-affordance" aria-disabled="true"><Icon name="map" />Карта · Скоро</span>:model.mapAffordance === 'DESIGN_ONLY' ? <span className="search-map-affordance" role="button" aria-disabled="true"><Icon name="map" />Карта</span> : null}
      </div>
      {unsupportedCity&&<section className="v2-coverage-state" role="status"><Icon name="pin"/><h2>В «{unsupportedCity}» пока нет подтверждённых событий</h2><p>Выберите Москву, чтобы увидеть доступный каталог.</p><button type="button" className="v2-button v2-button-primary" onClick={onCity}>Выбрать город</button></section>}
      {saveError&&<p className="v2-error" role="alert">{saveError}</p>}
      {shownEvents.length ? <EventCardList onOpen={onEventOpen} events={shownEvents} savedEventIds={runtime ? savedIds : state.savedEventIds} canSave={canSave}
        onSave={runtime ? onSave : eventId => act({ type: 'TOGGLE_SAVED', eventId })} />
        : !unsupportedCity&&!cityLoading&&<div className="saved-empty" role="status"><Icon name="search" /><h2>Событий не найдено</h2><p>{effectiveText.trim()?'Попробуйте изменить или очистить запрос.':'Попробуйте изменить выбранные фильтры.'}</p>{effectiveText.trim()&&<button type="button" className="v2-button v2-button-secondary" onClick={()=>onSearchText?onSearchText(''):setText('')}>Очистить запрос</button>}</div>}
    </Screen>
    <BottomNav active="search" onSelect={onNavigate} />
    <FilterSheet open={runtime ? runtimeSheetOpen : state.sheetOpen} filters={state.draft} onAction={act}
      runtime={runtime && runtimeDraft ? { draft: runtimeDraft, busy: runtime.busy,
        onChange: setRuntimeDraft, onClose: () => setRuntimeSheetOpen(false),
        onReset: () => setRuntimeDraft({ ...runtimeDraft, date: '',dateThrough:undefined,startLocal:'',endLocal:'',freeOnly:false,smartInterests:[],includedCategories: [],budgetText:'',priceBasis:'UNKNOWN' }),
        onApply: () => { runtime.onApply({ ...runtimeDraft, text: effectiveText,dateThrough:runtimeDraft.dateThrough,freeOnly:runtimeDraft.freeOnly,smartInterests:[] }); setRuntimeSheetOpen(false); } } : undefined} />
  </AppViewport>;
}
