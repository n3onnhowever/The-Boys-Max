// Adapted from NekoTheDev/EventHive; MIT © 2026 Neko. See THIRD_PARTY_NOTICES.md.
import { useId } from 'react';
interface Props { value: string; onChange: (val: string) => void; disabled?: boolean; }
export function SearchBar({ value, onChange, disabled = false }: Props) {
  const id = useId();
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">Что хочется найти</label>
      <span className="search-mark" aria-hidden="true">⌕</span>
      <input
        id={id} type="search" disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Например, выставка вечером"
        className="pl-10 pr-10 py-2 border border-gray-200 rounded-lg w-full focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all bg-white text-gray-900"
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
