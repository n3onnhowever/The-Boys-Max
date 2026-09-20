import { Icon } from './Icon.tsx';

export function FilterControl({ label, active = false, expanded = false, onOpen }: { label: string; active?: boolean; expanded?: boolean; onOpen: () => void }) {
  return <button type="button" className={`filter-control${active ? ' is-active' : ''}`} onClick={onOpen} aria-haspopup="dialog" aria-expanded={expanded} aria-controls="filter-sheet-dialog">
    <span>{label}</span><Icon name="chevronDown" />
  </button>;
}
