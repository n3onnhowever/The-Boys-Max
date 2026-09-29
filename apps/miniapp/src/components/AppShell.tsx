import type { PropsWithChildren } from 'react';

export function AppViewport({ children }: PropsWithChildren) {
  return <div className="app-viewport">{children}</div>;
}

export function Screen({ children, className = '' }: PropsWithChildren<{ className?: string }>) {
  return <main id="main" className={`screen ${className}`.trim()}>{children}</main>;
}
