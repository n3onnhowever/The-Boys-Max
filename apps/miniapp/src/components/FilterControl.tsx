import { Icon } from './Icon.tsx';

export function FilterControl({ label, active = false, onOpen }: { label: string; active?: boolean; onOpen: () => void }) {
  return <button type="button" className={`filter-control${active ? ' is-active' : ''}`} onClick={onOpen}>
    <span>{label}</span><Icon name="chevronDown" />
  </button>;
}
