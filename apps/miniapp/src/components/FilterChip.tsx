import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

export function FilterChip({ children, className = '', ...props }: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>) {
  return <button type="button" className={`filter-chip ${className}`.trim()} {...props}>{children}</button>;
}
