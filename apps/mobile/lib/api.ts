import * as SecureStore from 'expo-secure-store';
import { API_URL } from './config';

const TOKEN_KEY = 'wealthguard_auth_token';
const USER_KEY = 'wealthguard_user';

export type AuthUser = {
  id: string;
  email: string;
  name?: string | null;
  isAdmin?: boolean;
};

export async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setSession(token: string, user: AuthUser) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function getStoredUser(): Promise<AuthUser | null> {
  try {
    const raw = await SecureStore.getItemAsync(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export async function clearSession() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}

type ApiOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
  formData?: FormData;
};

let onUnauthorized: (() => void) | null = null;

/** Registered by AuthProvider so an expired session sends the user back to sign-in. */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export async function api<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
  const token = options.token === undefined ? await getToken() : options.token;
  const headers: Record<string, string> = {};

  if (token) headers.Authorization = `Bearer ${token}`;
  if (!options.formData) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_URL}${path.startsWith('/') ? path : `/${path}`}`, {
    method: options.method || (options.body || options.formData ? 'POST' : 'GET'),
    headers,
    body: options.formData
      ? options.formData
      : options.body
        ? JSON.stringify(options.body)
        : undefined,
  });

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => ({}));

  if (res.status === 401 && token && !path.startsWith('/auth')) onUnauthorized?.();

  if (!res.ok) {
    throw new ApiError(data.error || data.message || 'Request failed', res.status, data.details);
  }

  return data as T;
}
