import { UserRole } from '../types/dentacore';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');

export function getAccessToken(): string | null {
  return accessToken;
}

export async function getFreshAccessTokenForSignalR(): Promise<string> {
  if (!accessToken) {
    return '';
  }

  if (isAccessTokenExpiringSoon(accessToken) && !(await refreshAccessToken())) {
    notifySessionExpired();
    return '';
  }

  return accessToken ?? '';
}

export function getApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
}

export interface AuthSession {
  accessToken: string;
  user: AuthUser;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly errors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type UnauthorizedListener = () => void;

let accessToken: string | null = null;
let csrfToken: string | null = null;
let refreshInFlight: Promise<boolean> | null = null;
const unauthorizedListeners = new Set<UnauthorizedListener>();

/**
 * Sessiya muddati tugaganda (401 + refresh muvaffaqiyatsiz) UI ni AuthScreen ga qaytarish uchun obuna
 */
export function onSessionExpired(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener);
  return () => {
    unauthorizedListeners.delete(listener);
  };
}

function notifySessionExpired(): void {
  unauthorizedListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Listener xatosi boshqa oqimlarni to‘xtatmasligi kerak
    }
  });
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  retryAfterRefresh = true,
): Promise<T> {
  const isNonLogoutAuthEndpoint =
    path.startsWith('/api/v1/auth/') && !path.endsWith('/logout');

  if (
    retryAfterRefresh &&
    accessToken &&
    !isNonLogoutAuthEndpoint &&
    isAccessTokenExpiringSoon(accessToken)
  ) {
    const refreshed = await refreshAccessToken();
    if (!refreshed) {
      notifySessionExpired();
      throw new ApiError(401, 'Sessiya muddati tugagan. Qayta kiring.');
    }
  }

  const headers = new Headers(init.headers);

  if (accessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData;
  if (init.body && !isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(getApiUrl(path), {
    ...init,
    headers,
    credentials: 'include',
  });

  if (
    response.status === 401 &&
    retryAfterRefresh &&
    accessToken &&
    !isNonLogoutAuthEndpoint
  ) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return apiRequest<T>(path, init, false);
    }
    notifySessionExpired();
  }

  if (!response.ok) {
    const problem = (await response.json().catch(() => null)) as {
      title?: string;
      detail?: string;
      errors?: Record<string, string[]>;
    } | null;

    const validationError = Object.values(problem?.errors ?? {}).flat()[0];
    throw new ApiError(
      response.status,
      problem?.detail ||
        validationError ||
        problem?.title ||
        `So‘rov bajarilmadi (${response.status}).`,
      problem?.errors,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const rawText = await response.text();
  if (!rawText) {
    return undefined as T;
  }

  return JSON.parse(rawText) as T;
}

async function getCsrfToken(forceRefresh = false): Promise<string> {
  if (csrfToken && !forceRefresh) {
    return csrfToken;
  }
  const result = await apiRequest<{ requestToken: string }>('/api/v1/auth/csrf');
  csrfToken = result.requestToken;
  return csrfToken;
}

export async function signIn(email: string, password: string): Promise<AuthSession> {
  const session = await apiRequest<AuthSession>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  accessToken = session.accessToken;
  csrfToken = null; // Login yangi anti-forgery cookie o‘rnatishi mumkin
  return session;
}

export async function registerPatient(input: {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
}): Promise<void> {
  await apiRequest<void>('/api/v1/auth/register-patient', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function restoreSession(): Promise<AuthSession | null> {
  try {
    const token = await getCsrfToken(true);
    const result = await apiRequest<{ accessToken: string }>(
      '/api/v1/auth/refresh',
      {
        method: 'POST',
        headers: { 'X-CSRF-TOKEN': token },
      },
      false,
    );
    accessToken = result.accessToken;
    csrfToken = null;
    const user = parseUserFromJwt(result.accessToken);
    if (!user) {
      accessToken = null;
      return null;
    }
    return { accessToken: result.accessToken, user };
  } catch (error) {
    accessToken = null;
    csrfToken = null;
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      return null;
    }
    throw error;
  }
}

export async function signOut(): Promise<void> {
  try {
    if (accessToken && isAccessTokenExpiringSoon(accessToken)) {
      const refreshed = await refreshAccessToken();
      if (!refreshed) {
        return;
      }
    }

    const token = await getCsrfToken(true);
    await apiRequest<void>(
      '/api/v1/auth/logout',
      {
        method: 'POST',
        headers: { 'X-CSRF-TOKEN': token },
      },
      false,
    );
  } catch (error) {
    // Sessiya allaqachon tugagan bo‘lsa ham (401/403) klient tomonida chiqish yakunlanadi
    if (!(error instanceof ApiError && (error.status === 401 || error.status === 403))) {
      throw error;
    }
  } finally {
    accessToken = null;
    csrfToken = null;
  }
}

async function refreshAccessToken(): Promise<boolean> {
  if (!refreshInFlight) {
    const attempt = (async () => {
      try {
        const token = await getCsrfToken(true);
        const result = await apiRequest<{ accessToken: string }>(
          '/api/v1/auth/refresh',
          {
            method: 'POST',
            headers: { 'X-CSRF-TOKEN': token },
          },
          false,
        );
        accessToken = result.accessToken;
        csrfToken = null;
        return true;
      } catch (error) {
        accessToken = null;
        csrfToken = null;
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          return false;
        }
        throw error;
      }
    })();
    refreshInFlight = attempt;
  }

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

function parseUserFromJwt(token: string): AuthUser | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const encodedPayload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = encodedPayload.padEnd(
      Math.ceil(encodedPayload.length / 4) * 4,
      '=',
    );
    const bytes = Uint8Array.from(atob(paddedPayload), (char) => char.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;

    // Token muddati tugagan bo‘lsa rad etish (5 soniya skew bilan)
    if (typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now() - 5000) {
      return null;
    }

    const rawRole =
      payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ??
      payload.role;
    const role = (Array.isArray(rawRole) ? rawRole[0] : rawRole) as UserRole | undefined;

    const id = (payload[
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'
    ] ?? payload.sub) as string | undefined;

    const fullName = (payload[
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'
    ] ?? payload.name) as string | undefined;

    const email = (payload[
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'
    ] ?? payload.email) as string | undefined;

    if (!id || !fullName || !role) return null;

    return {
      id,
      fullName,
      email: email ?? '',
      role,
    };
  } catch {
    return null;
  }
}

function isAccessTokenExpiringSoon(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;

    const encodedPayload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = encodedPayload.padEnd(
      Math.ceil(encodedPayload.length / 4) * 4,
      '=',
    );
    const bytes = Uint8Array.from(atob(paddedPayload), (char) => char.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;

    return (
      typeof payload.exp !== 'number' ||
      payload.exp * 1000 <= Date.now() + 30_000
    );
  } catch {
    return true;
  }
}