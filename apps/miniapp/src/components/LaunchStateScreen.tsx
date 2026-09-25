import { STATE_ASSETS } from '../assets.ts';
import { AppViewport, Screen } from './AppShell.tsx';
import { BrandHeader } from './BrandHeader.tsx';

export function LaunchStateScreen({ title, message, relaunch, onRetry }: {
  title: string; message: string; relaunch: boolean; onRetry: () => void;
}) {
  return <AppViewport>
    <a className="skip-link" href="#main">К содержимому</a>
    <Screen className="system-state-screen launch-state-screen">
      <BrandHeader />
      <section className="system-state-center" role="alert">
        <img className="system-state-art system-state-art-error" src={STATE_ASSETS.error}
          width="300" height="180" decoding="async" alt="" aria-hidden="true" />
        <div className="system-state-copy">
          <h1 tabIndex={-1}>{title}</h1>
          <p>{relaunch ? 'Откройте Повод заново кнопкой в чате бота MAX, чтобы подтвердить сессию.' : message}</p>
        </div>
        <div className="system-state-actions">
          <button type="button" className="system-state-primary" onClick={onRetry}>Повторить проверку</button>
        </div>
      </section>
    </Screen>
  </AppViewport>;
}
