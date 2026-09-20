import type { SVGProps } from 'react';

export type IconName = 'arrow' | 'back' | 'bell' | 'calendar' | 'chevronDown' | 'close' | 'coins' | 'heart' | 'home' | 'map' | 'music' | 'people' | 'pin' | 'search' | 'user' | 'wifi';

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
    {name === 'heart' && <path {...common} d="M20.7 8.4c0 5-8.7 10.4-8.7 10.4S3.3 13.4 3.3 8.4A4.7 4.7 0 0 1 12 5.9a4.7 4.7 0 0 1 8.7 2.5Z" />}
    {name === 'pin' && <><path {...common} d="M19 9.8c0 5-7 10.7-7 10.7S5 14.8 5 9.8a7 7 0 1 1 14 0Z" /><circle {...common} cx="12" cy="9.6" r="2.2" /></>}
    {name === 'arrow' && <><path {...common} d="M5 12h14M14 7l5 5-5 5" /></>}
    {name === 'back' && <><path {...common} d="m10 5-7 7 7 7" /><path {...common} d="M3 12h18" /></>}
    {name === 'close' && <><path {...common} d="m5 5 14 14" /><path {...common} d="M19 5 5 19" /></>}
    {name === 'chevronDown' && <path {...common} d="m7 9.5 5 5 5-5" />}
    {name === 'map' && <><path {...common} d="m3.5 5.5 5-2.5 7 3 5-2.5v15l-5 2.5-7-3-5 2.5z" /><path {...common} d="M8.5 3v15M15.5 6v15" /></>}
    {name === 'music' && <><path {...common} d="M9 17.5V6l10-2v11.5" /><circle {...common} cx="6.5" cy="17.5" r="2.5" /><circle {...common} cx="16.5" cy="15.5" r="2.5" /></>}
    {name === 'coins' && <><ellipse {...common} cx="12" cy="6" rx="7" ry="3" /><path {...common} d="M5 6v5c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 11v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" /></>}
    {name === 'wifi' && <><path {...common} d="M3.5 9.5a13 13 0 0 1 17 0M6.5 13a8.4 8.4 0 0 1 11 0M9.5 16.4a3.8 3.8 0 0 1 5 0" /><circle fill="currentColor" cx="12" cy="19.4" r="1.2" /></>}
  </svg>;
}
