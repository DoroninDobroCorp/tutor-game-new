// Centralized helpers to map API errors to user-friendly messages
// Non-breaking: can be adopted gradually in components and mutations

export type ApiErrorPayload = {
  status?: number;
  data?: any;
};

export function getErrorMessage(err: unknown, fallback = 'Something went wrong') {
  if (!err) return fallback;
  // RTK Query style error
  const e = err as { status?: number; data?: any };
  const data = (e && e.data) ?? (err as any);

  if (typeof data === 'string') return data;
  if (data?.message && typeof data.message === 'string') return data.message;
  if (data?.error && typeof data.error === 'string') return data.error;

  try {
    return JSON.stringify(data);
  } catch {
    return fallback;
  }
}

export function isAuthError(err: unknown) {
  const e = err as { status?: number };
  return e?.status === 401 || e?.status === 419;
}
