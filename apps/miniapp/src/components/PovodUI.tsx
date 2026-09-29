import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { BRAND_ASSETS } from '../assets.ts';
import { api } from '../../client.ts';
import { Icon, type IconName } from './Icon.tsx';
import './povod-v2.css';

export function AppHeader({ onNotifications, unreadCount = 0, onCity, city = 'Москва' }: {
  onNotifications?: () => void; unreadCount?: number; onCity?: () => void; city?: string;
}) {
  return <header className="v2-app-header">
    <img className="v2-wordmark" src={BRAND_ASSETS.wordmark} alt="Повод" />
    <button type="button" className="v2-icon-button" aria-label="Уведомления" onClick={onNotifications} disabled={!onNotifications}>
      <Icon name="bell" />{unreadCount > 0 && <span className="v2-unread" aria-label={`Непрочитанных: ${unreadCount}`}>{unreadCount > 9 ? '9+' : unreadCount}</span>}
    </button>
    {onCity && <button type="button" className="v2-city-trigger" onClick={onCity}><Icon name="pin" />{city}<Icon name="chevronDown" /></button>}
  </header>;
}

export function useUnreadCount() {
  const [count,setCount]=useState(0);
  useEffect(()=>{
    let active=true;
    const refresh=()=>{void api<{unreadCount:number}>('/api/v1/me/notifications/count').then(x=>{if(active)setCount(x.unreadCount)}).catch(()=>{})};
    refresh();const interval=window.setInterval(refresh,30000);window.addEventListener('focus',refresh);window.addEventListener('povod:notifications-read',refresh);
    return()=>{active=false;window.clearInterval(interval);window.removeEventListener('focus',refresh);window.removeEventListener('povod:notifications-read',refresh)};
  },[]);
  return count;
}

export function BackHeader({ title, onBack, action }: { title: string; onBack: () => void; action?: ReactNode }) {
  return <header className="v2-back-header"><button type="button" className="v2-back" aria-label="Назад" onClick={onBack}><Icon name="back" /></button><h1>{title}</h1><span className="v2-header-action">{action}</span></header>;
}

export function PovodButton({ children, onClick, variant = 'primary', disabled = false, type = 'button', icon }: {
  children: ReactNode; onClick?: () => void; variant?: 'primary'|'secondary'|'outline'|'quiet'; disabled?: boolean; type?: 'button'|'submit'; icon?: IconName|'max';
}) {
  return <button type={type} className={`v2-button v2-button-${variant}`} onClick={onClick} disabled={disabled}>{icon === 'max' ? <img className="v2-max-mark" src={`/assets/vendor/max/max-${variant === 'primary' ? 'white' : 'colored'}.svg`} alt="" aria-hidden="true" /> : icon && <Icon name={icon} />}{children}</button>;
}

export function Chip({ children, selected = false, onClick, disabled = false }: { children: ReactNode; selected?: boolean; onClick?: () => void; disabled?: boolean }) {
  return <button type="button" className={`v2-chip${selected ? ' is-selected' : ''}`} aria-pressed={selected} onClick={onClick} disabled={disabled}>{children}</button>;
}

export function StatusChip({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral'|'red'|'violet'|'green' }) {
  return <span className={`v2-status v2-status-${tone}`}>{children}</span>;
}

export function SettingsRow({ icon, label, value, onClick, disabled = false }: { icon: IconName; label: string; value?: string; onClick?: () => void; disabled?: boolean }) {
  return <button type="button" className="v2-settings-row" onClick={onClick} disabled={disabled || !onClick}><span className="v2-settings-icon"><Icon name={icon} /></span><span className="v2-settings-copy"><strong>{label}</strong>{value && <small>{value}</small>}</span><Icon name="chevronRight" /></button>;
}

export function SearchField({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return <label className="v2-search-wrap"><Icon name="search" /><input type="search" value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} aria-label={placeholder} /></label>;
}

export function FriendRow({ name, subtitle, action }: { name: string; subtitle: string; action: ReactNode }) {
  return <li className="v2-friend-row"><span className="v2-avatar">{name.slice(0,1)}</span><span className="v2-friend-copy"><strong>{name}</strong><small>{subtitle}</small></span>{action}</li>;
}

export function NotificationRow({ action, actorName, planTitle, eventTitle, createdAt, unread, icon, onOpen }: { action: string; actorName?: string|null; planTitle?: string|null; eventTitle?: string|null; createdAt: string; unread: boolean; icon: IconName; onOpen: () => void }) {
  const elapsed=Math.max(0,Date.now()-Date.parse(createdAt));
  const time=elapsed<3600000?`${Math.max(1,Math.floor(elapsed/60000))} мин назад`:elapsed<86400000?`${Math.floor(elapsed/3600000)} ч назад`:new Date(createdAt).toLocaleDateString('ru-RU',{day:'numeric',month:'short'});
  return <li><button type="button" className={`v2-notification-row${unread?' is-unread':''}`} onClick={onOpen}><span className="v2-notification-icon"><Icon name={icon}/></span><span className="v2-notification-copy"><strong>{actorName?<><b>{actorName}</b> · {action}</>:action}</strong>{(planTitle||eventTitle)&&<span className="v2-notification-context">{planTitle&&<span>{planTitle}</span>}{eventTitle&&eventTitle!==planTitle&&<span>{eventTitle}</span>}</span>}<small>{time}</small></span>{unread&&<span className="v2-row-dot" aria-label="Не прочитано"/>}</button></li>;
}

export function PovodSheet({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const background=document.getElementById('root');
    const previousInert=background?.inert??false;
    if(background)background.inert=true;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    ref.current?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current();
      if(event.key!=='Tab'||!ref.current)return;
      const controls=Array.from(ref.current.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),a[href]'));
      const first=controls[0],last=controls.at(-1);
      if(event.shiftKey&&(document.activeElement===first||document.activeElement===ref.current)){event.preventDefault();last?.focus()}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}
    };
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); document.body.style.overflow = previousOverflow; if(background)background.inert=previousInert; previous?.focus(); };
  }, [open]);
  if (!open) return null;
  return createPortal(<div className="v2-sheet-layer"><button type="button" className="v2-sheet-backdrop" aria-label="Закрыть" onClick={onClose} /><div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className="v2-sheet"><span className="v2-sheet-handle" /><div className="v2-sheet-heading"><h2>{title}</h2><button type="button" aria-label="Закрыть" onClick={onClose}><Icon name="close" /></button></div>{children}</div></div>, document.body);
}

export function EmptyState({ icon = 'calendar', title, description, action }: { icon?: IconName; title: string; description: string; action?: ReactNode }) {
  return <section className="v2-empty" role="status"><span className="v2-empty-icon"><Icon name={icon} /></span><h2>{title}</h2><p>{description}</p>{action}</section>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <section className="v2-error" role="alert"><strong>Не удалось продолжить</strong><p>{message}</p>{onRetry && <PovodButton onClick={onRetry}>Повторить</PovodButton>}</section>;
}
