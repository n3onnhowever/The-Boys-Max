import { FilterChip } from './FilterChip.tsx';

export function CategoryChip({ label, selected, onSelect }: { label: string; selected: boolean; onSelect?: () => void }) {
  return <FilterChip className={selected ? 'is-selected' : ''} aria-pressed={selected} onClick={onSelect}>{label}</FilterChip>;
}
