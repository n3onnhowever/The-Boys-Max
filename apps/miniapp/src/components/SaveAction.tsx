import { Icon } from './Icon.tsx';

export function SaveAction({ saved, onToggle, inverse = false }: { saved: boolean; onToggle?: () => void; inverse?: boolean }) {
  return <button
    type="button"
    className={`save-action${inverse ? ' is-inverse' : ''}${saved ? ' is-saved' : ''}`}
    aria-label={saved ? 'Убрать из сохранённых' : 'Сохранить событие'}
    aria-pressed={saved}
    title={!onToggle ? 'Откройте событие, чтобы проверить сохранение' : undefined}
    onClick={onToggle}
    disabled={!onToggle}
  ><Icon name="heart" filled={saved} /></button>;
}
