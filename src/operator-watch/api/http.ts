/** Same-origin base path for the Operator Watch API (a Vercel function; vercel.json routes /api/ow/*). */
export const API_BASE_URL = (import.meta.env.VITE_OW_API_BASE_URL as string | undefined) ?? '/api/ow';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** The site's Supabase session token: the API signs the user in with it (no separate login). */
async function authorization(): Promise<Record<string, string>> {
  // Loaded on first use, so the API client still works (and tests run) without the site's Supabase settings.
  try {
    const { supabase } = await import('../../supabaseClient.js');
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return token ? { authorization: `Bearer ${token}` } : {};
  } catch {
    return {}; // no session: the API answers 401 and the gate says so
  }
}

async function request<T>(method: 'GET' | 'POST' | 'PUT', path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials: 'same-origin',
    headers: {
      accept: 'application/json',
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      ...(await authorization()),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    let message = res.statusText || `Request failed (${res.status})`;
    try {
      const data = (await res.json()) as { message?: string | string[] };
      if (data.message) message = Array.isArray(data.message) ? data.message.join(', ') : data.message;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const http = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown = {}) => request<T>('POST', path, body),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
};
