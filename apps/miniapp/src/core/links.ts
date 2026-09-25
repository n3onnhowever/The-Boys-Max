/** Only exact configured HTTPS origins. Does not infer travel times or request geolocation. */
export function safeExternalUrl(value: string | null, origins: readonly string[]): string | null {
  if (!value || value !== value.trim() || /[\u0000-\u0020\\]/u.test(value)) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || !origins.includes(url.origin)) return null;
    return url.href;
  } catch { return null; }
}
/** Demo source pages are first-party explanatory pages, never a live provider link. */
export function safeDemoSourceUrl(value: string | null, currentOrigin: string | null): string | null {
  if (!value || !currentOrigin || value !== value.trim() || /[\u0000-\u0020\\]/u.test(value)) return null;
  try {
    const url = new URL(value);
    if (url.origin !== currentOrigin || !/^\/demo\/source\/[a-z0-9-]+$/.test(url.pathname) || url.search || url.hash || url.username || url.password) return null;
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname))) return null;
    return url.href;
  } catch { return null; }
}
export interface ClipboardPort { writeText(text: string): Promise<void>; }
export type CopyResult = { status: 'COPIED'; url: string } | { status: 'MANUAL'; url: string; message: string };
export async function copyInvitation(url: string, clipboard: ClipboardPort | null, origins: readonly string[]): Promise<CopyResult> {
  const allowed = safeExternalUrl(url, origins);
  if (!allowed) throw new Error('Небезопасная или неподтверждённая ссылка приглашения.');
  try {
    if (!clipboard) throw new Error('Clipboard unavailable');
    await clipboard.writeText(allowed);
    return { status: 'COPIED', url: allowed };
  } catch { return { status: 'MANUAL', url: allowed, message: 'Не удалось скопировать. Выделите ссылку и скопируйте её вручную.' }; }
}
