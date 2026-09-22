import { BRAND_ASSETS } from '../assets.ts';
import { Icon } from './Icon.tsx';

export function BrandHeader() {
  return <header className="brand-header">
    <div className="brand-wordmark" aria-label="Повод">
      <img src={BRAND_ASSETS.wordmark} alt="Повод" />
    </div>
    <button className="notification-action" type="button" aria-label="Уведомления" disabled>
      <Icon name="bell" />
      <span className="notification-dot" />
    </button>
  </header>;
}
