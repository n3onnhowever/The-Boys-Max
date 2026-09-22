import { useState, type ReactNode } from 'react';
import { capabilities, openLink } from '../../bridge.ts';

/** Receives an already allowlisted URL; a normal anchor remains the fallback. */
export function ExternalLink({ href, children, className = 'link-button', ariaLabel }: {
  href: string; children: ReactNode; className?: string; ariaLabel?: string;
}) {
  const [failed, setFailed] = useState(false);
  return <>
    <a className={className || undefined} aria-label={ariaLabel} href={href} target="_blank" rel="noopener noreferrer" onClick={event => {
      if (failed || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const capability = capabilities();
      const insideMax = new URL(href).origin === 'https://max.ru';
      if (!capability.openLink && !(insideMax && capability.openMaxLink)) return;
      event.preventDefault();
      void openLink(href).then(result => setFailed(result !== 'INVOKED'));
    }}>{children}</a>
    {failed && <p role="status">Нажмите ссылку ещё раз, чтобы открыть её в браузере.</p>}
  </>;
}
