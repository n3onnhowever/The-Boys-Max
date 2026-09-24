export type ErrorCode = 'OFFLINE' | 'NETWORK' | 'AUTH_FAILED' | 'EXPIRED' | 'FORBIDDEN'
  | 'CONFLICT' | 'VALIDATION' | 'SLOT_TAKEN' | 'INVALID_RESPONSE' | 'UNAVAILABLE' | 'UNCERTAIN';
export class PortError extends Error {
  readonly code: ErrorCode;
  constructor(code: ErrorCode, message: string) { super(message); this.name = 'PortError'; this.code = code; }
}
export function normalizeError(error: unknown, mutation = false): PortError {
  if (error instanceof PortError) return error;
  return new PortError(mutation ? 'UNCERTAIN' : 'NETWORK', mutation
    ? 'Не удалось узнать результат. Повторная проверка использует тот же запрос.'
    : 'Не удалось загрузить данные. Проверьте соединение и повторите попытку.');
}
