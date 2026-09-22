import { SEARCH_FILTER_OPTIONS, type SearchSortId } from '../view-model/search.ts';

export function SortTabs({ active, onSelect }: { active: SearchSortId; onSelect: (sort: SearchSortId) => void }) {
  return <div className="sort-tabs" role="tablist" aria-label="Сортировка событий">
    {SEARCH_FILTER_OPTIONS.sorts.map(option => <button
      key={option.id}
      type="button"
      role="tab"
      aria-selected={active === option.id}
      className={active === option.id ? 'is-active' : ''}
      onClick={() => onSelect(option.id)}
    >{option.label}</button>)}
  </div>;
}
