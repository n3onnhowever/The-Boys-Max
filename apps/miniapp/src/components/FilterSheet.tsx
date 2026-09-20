import type { SearchFilterState, SearchUiAction } from '../view-model/search.ts';
import { SEARCH_FILTER_OPTIONS } from '../view-model/search.ts';
import { FilterChip } from './FilterChip.tsx';
import { FilterSection } from './FilterSection.tsx';
import { Icon } from './Icon.tsx';

interface FilterSheetProps {
  open: boolean;
  filters: SearchFilterState;
  onAction: (action: SearchUiAction) => void;
}

function choiceLabel(label: string, selected: boolean, removable: boolean) {
  return <>{label}{selected && removable ? <span className="filter-choice-remove" aria-hidden="true">×</span> : null}</>;
}

export function FilterSheet({ open, filters, onAction }: FilterSheetProps) {
  return <div className={`filter-sheet-layer${open ? ' is-open' : ''}`} aria-hidden={!open}>
    <button className="filter-sheet-backdrop" type="button" aria-label="Закрыть фильтры" onClick={() => onAction({ type: 'CLOSE_FILTERS' })} />
    <aside className="filter-sheet" role="dialog" aria-modal="true" aria-labelledby="filter-sheet-title">
      <span className="filter-sheet-handle" aria-hidden="true" />
      <header className="filter-sheet-header">
        <h1 id="filter-sheet-title">Фильтры</h1>
        <button type="button" className="filter-sheet-close" aria-label="Закрыть фильтры" onClick={() => onAction({ type: 'CLOSE_FILTERS' })}><Icon name="close" /></button>
      </header>
      <div className="filter-sheet-scroll">
        <FilterSection title="Дата">
          {SEARCH_FILTER_OPTIONS.dates.map(option => {
            const selected = filters.date === option.id;
            return <FilterChip key={option.id} className={`sheet-filter-chip${selected ? ' is-selected' : ''}`} aria-pressed={selected} onClick={() => onAction({ type: 'SET_DATE', value: option.id })}>
              {choiceLabel(option.label, selected, option.id !== 'any')}
            </FilterChip>;
          })}
        </FilterSection>
        <FilterSection title="Категории">
          {SEARCH_FILTER_OPTIONS.categories.map(option => {
            const selected = filters.categories.includes(option.id);
            return <FilterChip key={option.id} className={`sheet-filter-chip${selected ? ' is-selected' : ''}`} aria-pressed={selected} onClick={() => onAction({ type: 'TOGGLE_CATEGORY', value: option.id })}>
              {choiceLabel(option.label, selected, true)}
            </FilterChip>;
          })}
        </FilterSection>
        <FilterSection title="Формат">
          {SEARCH_FILTER_OPTIONS.formats.map(option => {
            const selected = filters.format === option.id;
            return <FilterChip key={option.id} className={`sheet-filter-chip${selected ? ' is-selected' : ''}`} aria-pressed={selected} onClick={() => onAction({ type: 'SET_FORMAT', value: option.id })}>
              {choiceLabel(option.label, selected, option.id !== 'any')}
            </FilterChip>;
          })}
        </FilterSection>
        <FilterSection title="Цена">
          {SEARCH_FILTER_OPTIONS.prices.map(option => {
            const selected = filters.price === option.id;
            return <FilterChip key={option.id} className={`sheet-filter-chip${selected ? ' is-selected' : ''}`} aria-pressed={selected} onClick={() => onAction({ type: 'SET_PRICE', value: option.id })}>
              {choiceLabel(option.label, selected, option.id !== 'any')}
            </FilterChip>;
          })}
        </FilterSection>
        <FilterSection title="Район / расстояние">
          {SEARCH_FILTER_OPTIONS.distances.map(option => {
            const selected = filters.distance === option.id;
            return <FilterChip key={option.id} className={`sheet-filter-chip${selected ? ' is-selected' : ''}`} aria-pressed={selected} onClick={() => onAction({ type: 'SET_DISTANCE', value: option.id })}>
              {choiceLabel(option.label, selected, option.id !== 'any')}{option.id === 'other' ? <Icon name="chevronDown" /> : null}
            </FilterChip>;
          })}
        </FilterSection>
        <div className="filter-map-row" aria-disabled="true">
          <Icon name="pin" /><span>Показать события на карте</span><span className="filter-map-switch" aria-hidden="true" />
        </div>
      </div>
      <footer className="filter-sheet-footer">
        <button type="button" className="filter-reset" onClick={() => onAction({ type: 'RESET_FILTERS' })}>Сбросить все</button>
        <button type="button" className="filter-apply" onClick={() => onAction({ type: 'APPLY_FILTERS' })}>Показать события</button>
      </footer>
    </aside>
  </div>;
}
