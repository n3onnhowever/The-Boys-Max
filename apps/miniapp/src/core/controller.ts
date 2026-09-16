import type { Command, Envelope, Receipt, Route, View, VisualPort } from '../port/contracts.ts';
import { envelopeFor } from './commands.ts';
import { normalizeError, PortError } from './errors.ts';
export type Phase = 'loading' | 'ready' | 'submitting' | 'error' | 'offline' | 'auth-failed' | 'expired' | 'uncertain';
export interface UiState {
  phase: Phase; view: View | null; error: string | null;
  draft: Readonly<Record<string, string>>; receipt: Receipt['outcome'] | null;
}
/** UI coordinator only. Server views replace state atomically; no synthetic success or local plan DB. */
export class ViewController {
  private readonly port: VisualPort;
  private readonly online: () => boolean;
  private readonly newKey: () => string;
  private state: UiState = { phase: 'loading', view: null, error: null, draft: {}, receipt: null };
  private listeners = new Set<() => void>();
  private generation = 0;
  private abort: AbortController | null = null;
  private route: Route | null = null;
  private actorId: string | null = null;
  private drafts = new Map<string, Record<string, string>>();
  private pending: { envelope: Envelope; generation: number } | null = null;
  private sending = false;
  constructor(port: VisualPort, online = () => true, newKey = () => crypto.randomUUID()) {
    this.port = port; this.online = online; this.newKey = newKey;
  }
  getSnapshot = (): UiState => this.state;
  subscribe = (listener: () => void): (() => void) => { this.listeners.add(listener); return () => this.listeners.delete(listener); };
  private emit(patch: Partial<UiState>): void {
    this.state = { ...this.state, ...patch }; for (const listener of this.listeners) listener();
  }
  private draftKey(actor: string, route: Route): string { return `${actor}:${JSON.stringify(route)}`; }
  setDraft(name: string, value: string): void {
    if (!this.actorId || !this.route) return;
    const draft = { ...this.state.draft, [name]: value };
    this.drafts.set(this.draftKey(this.actorId, this.route), draft); this.emit({ draft });
  }
  private adopt(view: View): void {
    // The actor id is supplied only by a decoded, server-authenticated port response.
    // Changing identities never exposes the previous actor's in-memory form fields.
    this.actorId = view.actorId; this.route = view.route;
    const draft = this.drafts.get(this.draftKey(view.actorId, view.route)) ?? {};
    this.emit({ view, draft, phase: 'ready', error: null });
  }
  async load(route: Route): Promise<void> {
    if (this.pending) {
      this.emit({ phase: 'uncertain', error: 'Сначала проверьте результат предыдущего действия.' });
      return;
    }
    const generation = ++this.generation;
    this.abort?.abort(); this.abort = new AbortController(); this.route = structuredClone(route);
    // Do not retain private content from a different plan while loading.
    this.emit({ view: null, draft: {}, phase: 'loading', error: null, receipt: null });
    if (!this.online()) { this.emit({ phase: 'offline', error: 'Нет соединения. Изменения не отправлены.' }); return; }
    try {
      const view = await this.port.read(route, this.abort.signal);
      if (generation === this.generation) this.adopt(view);
    } catch (error) { if (generation === this.generation) this.fail(error, false); }
  }
  async refresh(): Promise<void> { if (this.route) await this.load(this.route); }
  private fail(error: unknown, mutation: boolean): void {
    const problem = normalizeError(error, mutation);
    const noPrivateView = ['AUTH_FAILED', 'EXPIRED', 'FORBIDDEN'].includes(problem.code);
    const phase: Phase = problem.code === 'AUTH_FAILED' || problem.code === 'FORBIDDEN' ? 'auth-failed'
      : problem.code === 'EXPIRED' ? 'expired' : problem.code === 'OFFLINE' ? 'offline'
      : problem.code === 'UNCERTAIN' ? 'uncertain' : 'error';
    if (noPrivateView) this.pending = null;
    this.emit({ phase, error: problem.message, receipt: null,
      ...(noPrivateView ? { view: null, draft: {} } : {}) });
  }
  async execute(command: Command): Promise<void> {
    if (this.sending || this.pending) return;
    const view = this.state.view;
    if (!view) { this.fail(new PortError('AUTH_FAILED', 'Откройте приложение в MAX и войдите снова.'), false); return; }
    if (!this.online()) { this.fail(new PortError('OFFLINE', 'Нет соединения. Изменения не отправлены.'), false); return; }
    // Actions are display capabilities from the server, NOT an authorization check.
    // The server must independently validate ACL, revisions, deadlines and idempotency.
    if (!view.actions.includes(command.type)) { this.fail(new PortError('CONFLICT', 'Действие недоступно. Обновите страницу.'), false); return; }
    try { this.pending = { envelope: envelopeFor(view, command, this.newKey()), generation: this.generation }; }
    catch { this.fail(new PortError('CONFLICT', 'Выберите место или обновите условия перед сохранением.'), false); return; }
    await this.sendPending();
  }
  private async sendPending(): Promise<void> {
    if (!this.pending || this.sending) return;
    if (!this.online()) { this.fail(new PortError('OFFLINE', 'Нет соединения. Результат запроса ещё не проверен.'), false); return; }
    const operation = this.pending; this.sending = true;
    this.emit({ phase: 'submitting', error: null, receipt: null });
    try {
      const receipt = await this.port.execute(operation.envelope);
      if (receipt.idempotencyKey !== operation.envelope.idempotencyKey) throw new PortError('UNCERTAIN', 'Сервер вернул ответ на другой запрос. Проверьте результат ещё раз.');
      if (receipt.view.actorId !== this.actorId) throw new PortError('AUTH_FAILED', 'Учётная запись изменилась. Откройте план снова.');
      this.pending = null;
      this.drafts.delete(this.draftKey(receipt.view.actorId, receipt.view.route));
      if (operation.generation === this.generation) { this.adopt(receipt.view); this.emit({ receipt: receipt.outcome }); }
    } catch (error) {
      const problem = normalizeError(error, true);
      // Definitive rejection permits a fresh command; an unknown outcome preserves the key.
      if (!['UNCERTAIN', 'NETWORK', 'OFFLINE'].includes(problem.code)) this.pending = null;
      this.fail(problem, true);
    } finally { this.sending = false; }
  }
  async retry(): Promise<void> { if (this.pending) await this.sendPending(); else await this.refresh(); }
  dispose(): void { this.abort?.abort(); this.generation++; this.listeners.clear(); this.drafts.clear(); }
}
