import { Icon, type IconName } from './Icon.tsx';

const items: { id: string; label: string; icon: IconName }[] = [
  { id: 'home', label: 'Главная', icon: 'home' },
  { id: 'search', label: 'Поиск', icon: 'search' },
  { id: 'plan', label: 'План', icon: 'calendar' },
  { id: 'friends', label: 'Друзья', icon: 'people' },
  { id: 'profile', label: 'Профиль', icon: 'user' },
];

export function BottomNav({ active = 'home', onSelect }: { active?: string; onSelect?: (id: string) => void }) {
  return <nav className="bottom-nav" aria-label="Основная навигация">
    {items.map(item => <button
      type="button"
      key={item.id}
      className={item.id === active ? 'is-active' : ''}
      aria-current={item.id === active ? 'page' : undefined}
      onClick={() => onSelect?.(item.id)}
      disabled={!onSelect && item.id !== active}
    ><Icon name={item.icon} filled={item.id === active && (item.id === 'home' || item.id === 'profile')} /><span>{item.label}</span></button>)}
  </nav>;
}
