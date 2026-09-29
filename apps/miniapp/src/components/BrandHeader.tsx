import { AppHeader, useUnreadCount } from './PovodUI.tsx';

export function BrandHeader({onNotifications,onCity,city}:{onNotifications?:()=>void;onCity?:()=>void;city?:string}) {
  const unreadCount=useUnreadCount();
  return <AppHeader onNotifications={onNotifications} unreadCount={unreadCount} onCity={onCity} city={city}/>;
}
