import type { Codec, Envelope, Receipt, Route, View, VisualPort } from './contracts.ts';
import { PortError } from '../core/errors.ts';
export interface HttpOptions {
  fetcher: typeof fetch; origin: string; codec: Codec;
  csrfToken: () => Promise<string>;
}
/** Proposed same-origin endpoints, not claims about an existing MAX/API deployment. */
export class HttpVisualPort implements VisualPort {
  private readonly options: HttpOptions;
  constructor(options: HttpOptions) {
    const origin = new URL(options.origin);
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname);
    if (origin.protocol !== 'https:' && !(origin.protocol === 'http:' && loopback)) throw new Error('HTTPS or loopback is required');
    if (origin.origin !== options.origin) throw new Error('Use an origin without path or credentials');
    this.options = options;
  }
  private async json(response: Response, mutation: boolean): Promise<unknown> {
    if (response.status === 401) throw new PortError('AUTH_FAILED', 'Сессия завершилась. Откройте приложение в MAX снова.');
    if (response.status === 403) throw new PortError('FORBIDDEN', 'Нет доступа к этому плану.');
    if (response.status === 410) throw new PortError('EXPIRED', 'Срок действия ссылки или сессии истёк.');
    if (response.status === 409) throw new PortError('CONFLICT', 'Условия или состав изменились. Обновите данные; введённый текст сохранён.');
    if (response.status === 422) {
      let code:string|null=null;
      try {
        const body=await response.json() as {error?:{code?:unknown}};
        if(typeof body.error?.code==='string'&&/^[A-Z][A-Z0-9_]{0,79}$/.test(body.error.code))code=body.error.code;
      } catch { /* The HTTP status is still a definitive rejection. */ }
      throw new PortError('VALIDATION',code?`Исправьте запрос (${code}) и повторите.`:'Исправьте данные запроса и повторите.');
    }
    if (!response.ok) throw new PortError(mutation ? 'UNCERTAIN' : 'UNAVAILABLE', mutation
      ? 'Результат действия пока неизвестен. Проверьте его повторно.' : 'Сервис временно недоступен. Повторите попытку.');
    if (!response.headers.get('content-type')?.toLowerCase().includes('application/json')) throw new PortError(mutation ? 'UNCERTAIN' : 'INVALID_RESPONSE', 'Не удалось прочитать ответ сервера.');
    try { return await response.json() as unknown; }
    catch { throw new PortError(mutation ? 'UNCERTAIN' : 'INVALID_RESPONSE', 'Ответ сервера повреждён. Повторите проверку.'); }
  }
  async read(route: Route, signal: AbortSignal): Promise<View> {
    const url = new URL('/api/ui/v1/view', this.options.origin);
    url.searchParams.set('route', JSON.stringify(route));
    const response = await this.options.fetcher(url, { method: 'GET', credentials: 'same-origin', cache: 'no-store', redirect: 'error', signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]) });
    try { return this.options.codec.view(await this.json(response, false)); }
    catch (error) { if (error instanceof PortError) throw error; throw new PortError('INVALID_RESPONSE', 'Не удалось прочитать данные плана.'); }
  }
  async execute(envelope: Envelope): Promise<Receipt> {
    let token: string;
    try { token = await this.options.csrfToken(); }
    catch { throw new PortError('AUTH_FAILED', 'Войдите в MAX заново перед сохранением.'); }
    if (!token) throw new PortError('AUTH_FAILED', 'Войдите в MAX заново перед сохранением.');
    let response: Response;
    try {
      response = await this.options.fetcher(new URL('/api/ui/v1/commands', this.options.origin), {
        method: 'POST', credentials: 'same-origin', redirect: 'error', cache: 'no-store',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token, 'Idempotency-Key': envelope.idempotencyKey },
        body: JSON.stringify(envelope), signal: AbortSignal.timeout(10000),
      });
    } catch { throw new PortError('UNCERTAIN', 'Запрос мог быть принят. Проверьте его результат; новый запрос не создаётся.'); }
    const data = await this.json(response, true);
    try { return this.options.codec.receipt(data); }
    catch { throw new PortError('UNCERTAIN', 'Не удалось прочитать результат действия. Проверьте его повторно.'); }
  }
}
