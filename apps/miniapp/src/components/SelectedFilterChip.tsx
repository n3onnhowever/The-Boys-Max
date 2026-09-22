import type { SelectedFilterViewModel } from '../view-model/search.ts';
import { FilterChip } from './FilterChip.tsx';
import { Icon } from './Icon.tsx';

export function SelectedFilterChip({ filter, onRemove }: { filter: SelectedFilterViewModel; onRemove: () => void }) {
  return <FilterChip className="selected-filter-chip is-selected" onClick={onRemove} aria-label={`Удалить фильтр «${filter.label}»`}>
    <Icon name={filter.icon} />
    <span>{filter.label}</span>
    <span className="selected-filter-remove" aria-hidden="true">×</span>
  </FilterChip>;
}
