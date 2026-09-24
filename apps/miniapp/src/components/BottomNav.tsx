import { createContext, useContext } from 'react';
import { Icon, type IconName } from './Icon.tsx';

const items: { id: string; label: string; icon: IconName }[] = [
  { id: 'home', label: 'Главная', icon: 'home' },
  { id: 'search', label: 'Поиск', icon: 'search' },
  { id: 'plan', label: 'План', icon: 'calendar' },
  { id: 'friends', label: 'Друзья', icon: 'people' },
  { id: 'profile', label: 'Профиль', icon: 'user' },
];

interface NavigationCapability { onSelect: (id: string) => void; availableIds: readonly string[]; }
const NavigationContext = createContext<NavigationCapability | null>(null);
export const NavigationProvider = NavigationContext.Provider;

export function BottomNav({ active = 'home', onSelect, availableIds }: { active?: string; onSelect?: (id: string) => void; availableIds?: readonly string[] }) {
  const navigation = useContext(NavigationContext);
  const select = onSelect ?? navigation?.onSelect;
  const available = availableIds ?? navigation?.availableIds ?? [];
  return <nav className="bottom-nav" aria-label="Основная навигация">
    {items.map(item => {
      const selectable = item.id === active || Boolean(select && available.includes(item.id));
      return <button
        type="button"
        key={item.id}
        className={item.id === active ? 'is-active' : ''}
        aria-current={item.id === active ? 'page' : undefined}
        title={!selectable ? `${item.label}: функция пока недоступна` : undefined}
        onClick={() => select?.(item.id)}
        disabled={!selectable}
      ><Icon name={item.icon} filled={item.id === active && (item.id === 'home' || item.id === 'profile')} /><span>{item.label}</span></button>;
    })}
  </nav>;
}
