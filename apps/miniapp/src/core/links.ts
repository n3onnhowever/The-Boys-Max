/** Only exact configured HTTPS origins. Does not infer travel times or request geolocation. */
export function safeExternalUrl(value: string | null, origins: readonly string[]): string | null {
  if (!value || value !== value.trim() || /[\u0000-\u0020\\]/u.test(value)) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || !origins.includes(url.origin)) return null;
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
