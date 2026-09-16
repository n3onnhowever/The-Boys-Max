// Adapted from NekoTheDev/EventHive; MIT © 2026 Neko. See THIRD_PARTY_NOTICES.md.
import { useId } from 'react';
import type { InputHTMLAttributes } from 'react';
interface Props extends InputHTMLAttributes<HTMLInputElement> { label: string; error?: string; }
export function FormInput({ label, error, className = '', id, ...props }: Props) {
  const generatedId = useId(); const inputId = id ?? generatedId;
  const descriptions = [props['aria-describedby'], error ? `${inputId}-error` : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className="mb-4">
      <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        {...props} id={inputId} aria-invalid={Boolean(error)} aria-describedby={descriptions}
        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none ${
          error ? 'border-red-500' : 'border-gray-300'
        } ${className}`}
      />
      {error && <p id={`${inputId}-error`} className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
