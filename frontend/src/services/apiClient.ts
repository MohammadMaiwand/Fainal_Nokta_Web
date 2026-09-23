import axios, { AxiosError, type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { clearAuthSession, getCurrentAuthStorage, getStoredAuthValue, getStoredUser, isRememberedSession, persistAuthSession } from '@/features/auth/utils/authStorage';
import { findReachableApiBase } from '@/utils/apiReachability';
import { useAuthStore } from '@/store/authStore';

function resolveDefaultApiBaseUrl() {
  if (typeof window === 'undefined') {
    return 'http://127.0.0.1:8081/api';
  }

  const { hostname, port, origin } = window.location;
  const isLocalFrontend = ['localhost', '127.0.0.1'].includes(hostname) && ['4173', '5173', '5174', '5175', '5176', '5177', '5178', '5179'].includes(port);
  if (isLocalFrontend) {
    // Route through the Vite dev/preview proxy (see vite.config.ts).
    return `${origin}/api`;
  }

  return `${origin}/api`;
}

const defaultApiBaseUrl = resolveDefaultApiBaseUrl();

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  defaultApiBaseUrl;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  // JWT auth uses Authorization header; cookies are not used for sessions.
  withCredentials: false,
  headers: {
    'Content-Type': 'application/json'
  }
});

let activeApiBase = API_BASE_URL;
let apiBaseResolutionPromise: Promise<string> | null = null;

export function getActiveApiBase() {
  return activeApiBase;
}

export async function resolveApiClientBase(force = false) {
  if (!force && apiBaseResolutionPromise) {
    return apiBaseResolutionPromise;
  }

  apiBaseResolutionPromise = (async () => {
    const reachable = await findReachableApiBase(1200);
    if (reachable) {
      activeApiBase = reachable;
      apiClient.defaults.baseURL = reachable;
    }
    return activeApiBase;
  })();

  try {
    return await apiBaseResolutionPromise;
  } finally {
    apiBaseResolutionPromise = null;
  }
}

function isNetworkFailure(error: AxiosError) {
  return (
    error.code === 'ERR_NETWORK' ||
    error.code === 'ECONNABORTED' ||
    error.message === 'Network Error' ||
    error.response?.status === 0
  );
}

let refreshPromise: Promise<'ok' | 'network' | 'auth'> | null = null;
const offlineCachePrefix = 'nokta-api-cache:';
const offlineCacheVersion = 'v3';
const offlineCacheTtlMs = 24 * 60 * 60 * 1000;
/** Paths that must never be served from offline cache (auth/finance/admin secrets). */
const sensitiveCachePrefixes = [
  '/finance',
  '/payments',
  '/payroll',
  '/salaries',
  '/expenses',
  '/loans',
  '/academy-financial-report',
  '/auth/profile',
  '/auth/captcha',
  '/auth/refresh',
  '/auth/login',
  '/users',
  '/audit',
  '/roles',
  '/permissions',
  '/reports'
];

function isGetRequest(config?: AxiosRequestConfig) {
  return String(config?.method ?? 'get').toLowerCase() === 'get';
}

function isPublicApiRequest(url: string) {
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/captcha') ||
    url.includes('/auth/refresh') ||
    url.includes('/auth/register') ||
    url.includes('/auth/forgot-password') ||
    url.includes('/auth/reset-password') ||
    url.includes('/messages/public-contact')
  );
}

function isSensitiveCachePath(pathname: string) {
  return sensitiveCachePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function clearOfflineApiCache() {
  if (typeof window === 'undefined') return;
  const keys: string[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith(offlineCachePrefix)) keys.push(key);
  }
  keys.forEach((key) => window.localStorage.removeItem(key));
}

function buildOfflineCacheKey(config?: AxiosRequestConfig) {
  if (typeof window === 'undefined' || !config?.url) {
    return null;
  }

  const url = new URL(config.url, config.baseURL || activeApiBase || API_BASE_URL);
  if (isSensitiveCachePath(url.pathname.replace(/^\/api/, '') || url.pathname)) {
    return null;
  }

  const user = getStoredUser<{ id?: string }>();
  const userScope = user?.id ? `u:${user.id}` : 'anon';
  const params = new URLSearchParams(url.search);

  if (config.params && typeof config.params === 'object') {
    Object.entries(config.params as Record<string, unknown>).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        return;
      }
      params.set(key, String(value));
    });
  }

  params.sort();
  const query = params.toString();
  return `${offlineCachePrefix}${offlineCacheVersion}:${userScope}:${url.pathname}${query ? `?${query}` : ''}`;
}

function cacheGetResponse(response: AxiosResponse) {
  const key = buildOfflineCacheKey(response.config);
  if (!key || !isGetRequest(response.config) || response.status !== 200) {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify({
      cachedAt: Date.now(),
      data: response.data,
      status: response.status,
      statusText: response.statusText
    }));
  } catch {
    // Cache quota/private-mode failures should never break live API responses.
  }
}

function readCachedGetResponse(error: AxiosError) {
  if (!isNetworkFailure(error)) {
    return null;
  }

  const config = error.config;
  const key = buildOfflineCacheKey(config);
  if (!key || !isGetRequest(config) || error.response?.status === 401 || error.response?.status === 403) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return null;
    }

    const cached = JSON.parse(raw) as { data: unknown; status?: number; statusText?: string; cachedAt?: number };
    if (cached.cachedAt && Date.now() - cached.cachedAt > offlineCacheTtlMs) {
      window.localStorage.removeItem(key);
      return null;
    }

    return {
      data: cached.data,
      status: cached.status ?? 200,
      statusText: cached.statusText ?? 'OK (offline cache)',
      headers: { 'x-offline-cache': '1' },
      config: config!,
      request: error.request
    } as AxiosResponse;
  } catch {
    return null;
  }
}

function forceLogoutToLogin() {
  clearOfflineApiCache();
  useAuthStore.getState().logout();
  if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
    window.location.href = '/login';
  }
}

async function refreshAccessToken(): Promise<'ok' | 'network' | 'auth'> {
  const storedRefreshToken = getStoredAuthValue('refreshToken');
  if (!storedRefreshToken) {
    return 'auth';
  }

  if (!refreshPromise) {
    refreshPromise = apiClient
      .post('/auth/refresh', { refreshToken: storedRefreshToken })
      .then((response) => {
        const payload = response.data?.data ?? {};
        const nextAccessToken = payload.tokens?.accessToken ?? payload.accessToken ?? null;
        const nextRefreshToken = payload.tokens?.refreshToken ?? payload.refreshToken ?? storedRefreshToken;
        const nextUser = payload.user ?? useAuthStore.getState().user ?? getStoredUser();

        if (!nextAccessToken) {
          return 'auth' as const;
        }

        const rememberMe = getCurrentAuthStorage() === window.localStorage || isRememberedSession();
        useAuthStore.getState().setAuth(nextUser, nextAccessToken, nextRefreshToken, rememberMe);
        return 'ok' as const;
      })
      .catch((error: AxiosError) => {
        if (isNetworkFailure(error)) {
          return 'network' as const;
        }
        clearOfflineApiCache();
        clearAuthSession();
        useAuthStore.getState().logout();
        return 'auth' as const;
      })
      .finally(() => {
        refreshPromise = null;
      }) as Promise<'ok' | 'network' | 'auth'>;
  }

  return refreshPromise;
}

apiClient.interceptors.request.use(
  (config) => {
    const url = config.url ?? '';

    if (!isPublicApiRequest(url)) {
      const token = getStoredAuthValue('accessToken');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => {
    cacheGetResponse(response);
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
    const requestUrl = originalRequest?.url ?? '';
    const serverMessage =
      typeof error.response?.data === 'object' && error.response?.data && 'message' in error.response.data
        ? String((error.response.data as { message?: unknown }).message ?? '')
        : '';

    if (serverMessage) {
      error.message = serverMessage;
    }

    const isPublicRequest = isPublicApiRequest(requestUrl);

    if (error.response?.status === 401 && !originalRequest?._retry && !isPublicRequest) {
      originalRequest._retry = true;
      const refreshResult = await refreshAccessToken();
      if (refreshResult === 'ok') {
        const nextAccessToken = getStoredAuthValue('accessToken');
        originalRequest.headers = {
          ...(originalRequest.headers ?? {}),
          Authorization: `Bearer ${nextAccessToken}`
        };
        return apiClient(originalRequest);
      }
      if (refreshResult === 'network') {
        const cachedDuringNetwork = readCachedGetResponse(error);
        if (cachedDuringNetwork) {
          return cachedDuringNetwork;
        }
        return Promise.reject(error);
      }
    }

    if (error.response?.status === 401 && !isPublicRequest) {
      forceLogoutToLogin();
    }

    const cachedResponse = readCachedGetResponse(error);
    if (cachedResponse) {
      return cachedResponse;
    }

    const retriableRequest = originalRequest as AxiosRequestConfig & { _networkRetry?: boolean };
    if (isNetworkFailure(error) && retriableRequest && !retriableRequest._networkRetry) {
      retriableRequest._networkRetry = true;
      const reachable = await findReachableApiBase(1200);
      if (reachable && reachable !== activeApiBase) {
        activeApiBase = reachable;
        apiClient.defaults.baseURL = reachable;
        retriableRequest.baseURL = reachable;
        return apiClient(retriableRequest);
      }
    }

    return Promise.reject(error);
  }
);

export const api = apiClient;
export default apiClient;
