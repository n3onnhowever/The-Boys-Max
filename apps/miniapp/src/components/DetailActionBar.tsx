import type { DetailPrimaryActionViewModel } from '../view-model/detail.ts';
import { Icon } from './Icon.tsx';
import { ExternalLink } from './ExternalLink.tsx';

interface DetailActionBarProps {
  primary: DetailPrimaryActionViewModel;
  saved: boolean;
  busy: boolean;
  onPrimary: (() => void) | null;
  onSave: (() => void) | null;
  onPlan: (() => void) | null;
}

export function DetailActionBar({ primary, saved, busy, onPrimary, onSave, onPlan }: DetailActionBarProps) {
  return <section className="detail-action-bar" aria-label="Действия с событием">
    {primary.kind === 'SOURCE_LINK' && primary.href
      ? <ExternalLink className="detail-primary-action" href={primary.href}>{primary.label}</ExternalLink>
      : <button type="button" className="detail-primary-action" onClick={onPrimary ?? undefined} disabled={busy || primary.kind === 'UNAVAILABLE'}>{primary.label}</button>}
    {(onSave || onPlan) && <div className="detail-secondary-actions">
      {onSave && <button type="button" onClick={onSave} disabled={busy} aria-pressed={saved}>
        <Icon name="bookmark" filled={saved} /><span>{saved ? 'Сохранено' : 'Сохранить'}</span>
      </button>}
      {onPlan && <button type="button" onClick={onPlan} disabled={busy}>
        <Icon name="calendar" /><span>Добавить в план</span>
      </button>}
    </div>}
  </section>;
}
