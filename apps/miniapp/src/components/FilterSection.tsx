import type { PropsWithChildren } from 'react';

export function FilterSection({ title, children }: PropsWithChildren<{ title: string }>) {
  return <section className="filter-sheet-section">
    <h2>{title}</h2>
    <div className="filter-sheet-choices">{children}</div>
  </section>;
}
