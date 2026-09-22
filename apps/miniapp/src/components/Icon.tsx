import type { SVGProps } from 'react';

export type IconName = 'arrow' | 'back' | 'bell' | 'bookmark' | 'calendar' | 'chevronDown' | 'chevronRight' | 'clock' | 'close' | 'coins' | 'external' | 'heart' | 'home' | 'map' | 'more' | 'music' | 'ok' | 'people' | 'pin' | 'plus' | 'search' | 'send' | 'settings' | 'share' | 'ticket' | 'user' | 'wallet' | 'wifi';

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  filled?: boolean;
}

export function Icon({ name, filled = false, ...props }: IconProps) {
  const common = { fill: filled ? 'currentColor' : 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...props}>
    {name === 'home' && <path {...common} d="M3.5 10.5 12 3.8l8.5 6.7v9.1a1 1 0 0 1-1 1h-5.2v-6.2H9.7v6.2H4.5a1 1 0 0 1-1-1z" />}
    {name === 'search' && <><circle {...common} cx="10.7" cy="10.7" r="6.7" /><path {...common} d="m16 16 4.4 4.4" /></>}
    {name === 'calendar' && <><rect {...common} x="3.5" y="5.3" width="17" height="15" rx="2.5" /><path {...common} d="M7.5 3.5v4M16.5 3.5v4M3.5 9.5h17" /><path {...common} d="m8.4 14 2.2 2.2 5-5" /></>}
    {name === 'people' && <><circle {...common} cx="9" cy="8.2" r="3.2" /><path {...common} d="M3.4 20v-1.5c0-3.1 2.4-5.3 5.6-5.3s5.6 2.2 5.6 5.3V20" /><path {...common} d="M16 5.7a3 3 0 0 1 0 5.8M16.3 13.5c2.7.3 4.3 2.2 4.3 4.8V20" /></>}
    {name === 'user' && <><circle {...common} cx="12" cy="7.7" r="4" /><path {...common} d="M4.5 21v-1.4c0-4.2 3.1-7 7.5-7s7.5 2.8 7.5 7V21" /></>}
    {name === 'bell' && <><path {...common} d="M5.2 17.5h13.6l-1.5-2.2V9.8c0-3-2.2-5.2-5.3-5.2S6.7 6.8 6.7 9.8v5.5z" /><path {...common} d="M9.5 20a2.8 2.8 0 0 0 5 0" /></>}
    {name === 'bookmark' && <path {...common} d="M6 3.7h12v17l-6-3.7-6 3.7z" />}
    {name === 'heart' && <path {...common} d="M20.7 8.4c0 5-8.7 10.4-8.7 10.4S3.3 13.4 3.3 8.4A4.7 4.7 0 0 1 12 5.9a4.7 4.7 0 0 1 8.7 2.5Z" />}
    {name === 'pin' && <><path {...common} d="M19 9.8c0 5-7 10.7-7 10.7S5 14.8 5 9.8a7 7 0 1 1 14 0Z" /><circle {...common} cx="12" cy="9.6" r="2.2" /></>}
    {name === 'arrow' && <><path {...common} d="M5 12h14M14 7l5 5-5 5" /></>}
    {name === 'back' && <><path {...common} d="m10 5-7 7 7 7" /><path {...common} d="M3 12h18" /></>}
    {name === 'close' && <><path {...common} d="m5 5 14 14" /><path {...common} d="M19 5 5 19" /></>}
    {name === 'chevronDown' && <path {...common} d="m7 9.5 5 5 5-5" />}
    {name === 'map' && <><path {...common} d="m3.5 5.5 5-2.5 7 3 5-2.5v15l-5 2.5-7-3-5 2.5z" /><path {...common} d="M8.5 3v15M15.5 6v15" /></>}
    {name === 'music' && <><path {...common} d="M9 17.5V6l10-2v11.5" /><circle {...common} cx="6.5" cy="17.5" r="2.5" /><circle {...common} cx="16.5" cy="15.5" r="2.5" /></>}
    {name === 'coins' && <><ellipse {...common} cx="12" cy="6" rx="7" ry="3" /><path {...common} d="M5 6v5c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 11v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" /></>}
    {name === 'share' && <><path {...common} d="M12 15V3m0 0L7.5 7.5M12 3l4.5 4.5" /><path {...common} d="M6 10H4.8A1.8 1.8 0 0 0 3 11.8v7.4A1.8 1.8 0 0 0 4.8 21h14.4a1.8 1.8 0 0 0 1.8-1.8v-7.4a1.8 1.8 0 0 0-1.8-1.8H18" /></>}
    {name === 'ticket' && <><path {...common} d="M4 7.2h16v3a2.2 2.2 0 0 0 0 4.4v2.2H4v-2.2a2.2 2.2 0 0 0 0-4.4z" /><path {...common} d="M9 7.2v9.6" strokeDasharray="2.2 2.2" /></>}
    {name === 'external' && <><path {...common} d="M14 4h6v6M20 4l-9 9" /><path {...common} d="M19 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h6" /></>}
    {name === 'chevronRight' && <path {...common} d="m9 5 7 7-7 7" />}
    {name === 'clock' && <><circle {...common} cx="12" cy="12" r="8.5" /><path {...common} d="M12 7v5l3.5 2" /></>}
    {name === 'plus' && <><path {...common} d="M12 5v14" /><path {...common} d="M5 12h14" /></>}
    {name === 'settings' && <><circle {...common} cx="12" cy="12" r="3" /><path {...common} d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" /></>}
    {name === 'wallet' && <><path {...common} d="M4 6.5h14.5A1.5 1.5 0 0 1 20 8v10a1.5 1.5 0 0 1-1.5 1.5h-14A1.5 1.5 0 0 1 3 18V6a2 2 0 0 1 2-2h11" /><path {...common} d="M15 11h5v4h-5a2 2 0 0 1 0-4Z" /></>}
    {name === 'send' && <><path {...common} d="m3.8 4.2 16.4 7.8-16.4 7.8 2.5-7.8z" /><path {...common} d="M6.3 12h13.9" /></>}
    {name === 'more' && <><circle cx="5" cy="12" r="1.25" fill="currentColor" /><circle cx="12" cy="12" r="1.25" fill="currentColor" /><circle cx="19" cy="12" r="1.25" fill="currentColor" /></>}
    {name === 'wifi' && <><path {...common} d="M3.5 9.5a13 13 0 0 1 17 0M6.5 13a8.4 8.4 0 0 1 11 0M9.5 16.4a3.8 3.8 0 0 1 5 0" /><circle fill="currentColor" cx="12" cy="19.4" r="1.2" /></>}
    {name === 'ok' && <><circle {...common} cx="12" cy="5.5" r="3" /><path {...common} d="M6.3 11a9.2 9.2 0 0 0 11.4 0M12 13v3m0-1-4.5 6M12 15l4.5 6" /></>}
  </svg>;
}
