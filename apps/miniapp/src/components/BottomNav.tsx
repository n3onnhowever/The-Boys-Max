import { Icon, type IconName } from './Icon.tsx';

const items: { id: string; label: string; icon: IconName }[] = [
  { id: 'home', label: 'Главная', icon: 'home' },
  { id: 'search', label: 'Поиск', icon: 'search' },
  { id: 'plan', label: 'План', icon: 'calendar' },
  { id: 'friends', label: 'Друзья', icon: 'people' },
  { id: 'profile', label: 'Профиль', icon: 'user' },
];

export function BottomNav({ active = 'home', onSelect, availableIds }: { active?: string; onSelect?: (id: string) => void; availableIds?: readonly string[] }) {
  return <nav className="bottom-nav" aria-label="Основная навигация">
    {items.map(item => {
      const selectable = item.id === active || Boolean(onSelect && (!availableIds || availableIds.includes(item.id)));
      return <button
        type="button"
        key={item.id}
        className={item.id === active ? 'is-active' : ''}
        aria-current={item.id === active ? 'page' : undefined}
        onClick={() => onSelect?.(item.id)}
        disabled={!selectable}
      ><Icon name={item.icon} filled={item.id === active && (item.id === 'home' || item.id === 'profile')} /><span>{item.label}</span></button>;
    })}
  </nav>;
}
