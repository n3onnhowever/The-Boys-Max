export class AppError extends Error {
  readonly code: string; readonly status: number;
  constructor(code: string, status = 422) { super(code); this.code = code; this.status = status; }
}
export function requireThat(condition: unknown, code: string, status = 422): asserts condition {
  if (!condition) throw new AppError(code, status);
}
