// Adapted from NekoTheDev/EventHive; MIT © 2026 Neko. See licenses/module-22-NOTICES.md.
import { useId } from 'react';
import { Icon } from './Icon.tsx';
interface Props { value: string; onChange: (val: string) => void; placeholder?: string; disabled?: boolean; readOnly?: boolean; onFocus?: () => void; }
export function SearchBar({ value, onChange, placeholder = 'Куда идём сегодня?', disabled = false, readOnly = false, onFocus }: Props) {
  const id = useId();
  return (
    <div className="search-bar">
      <label htmlFor={id} className="sr-only">Что хочется найти</label>
      <Icon name="search" className="search-bar-icon" />
      <input
        id={id} type="search" disabled={disabled} readOnly={readOnly} onFocus={onFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {value && (
        <button type="button" disabled={disabled} aria-label="Очистить поисковый текст"
          onClick={() => onChange('')}
          className="search-clear"
        >×</button>
      )}
    </div>
  );
}
