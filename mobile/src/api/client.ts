// axios HTTP client with auto-refresh interceptor.
//
//   - On every request, attach Authorization: Bearer <accessToken>
//     from SecureStore (in-memory cache for fast access).
//   - On 401, call /api/auth/refresh once, rotate tokens, retry the
//     original request. If refresh also fails, clear the session and
//     notify SessionContext so the user is bounced to the login screen.
//
// The auth state is read from a tiny in-memory module variable. The
// SessionProvider hydrates it on mount. Logout clears it.
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import { env } from '../config/env';

let _accessToken: string | null = null;
let _onUnauthorized: (() => void) | null = null;

export function setAccessToken(token: string | null) {
  _accessToken = token;
}

export function getAccessToken() {
  return _accessToken;
}

// SessionProvider registers this on mount so we can force a logout.
export function onUnauthorized(handler: () => void) {
  _onUnauthorized = handler;
}

export const api: AxiosInstance = axios.create({
  baseURL: env.apiUrl,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

// Attach token + auto-refresh.
let isRefreshing = false;
let pendingQueue: Array<(token: string | null) => void> = [];

function processQueue(token: string | null) {
  pendingQueue.forEach(cb => cb(token));
  pendingQueue = [];
}

api.interceptors.request.use((cfg: AxiosRequestConfig) => {
  if (_accessToken && cfg.headers) {
    cfg.headers.Authorization = `Bearer ${_accessToken}`;
  }
  return cfg;
});

api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const original = err.config as AxiosRequestConfig & { _retry?: boolean };
    // Skip auth endpoints themselves and the public endpoints
    if (!original || original._retry ||
        (original.url || '').includes('/api/auth/') ||
        (original.url || '').includes('/api/public/')) {
      return Promise.reject(err);
    }
    if (err.response?.status !== 401) return Promise.reject(err);
    if (isRefreshing) {
      // Wait for the in-flight refresh, then retry.
      return new Promise((resolve, reject) => {
        pendingQueue.push((token) => {
          if (!token) return reject(err);
          original._retry = true;
          original.headers = { ...(original.headers || {}), Authorization: `Bearer ${token}` };
          resolve(api(original));
        });
      });
    }
    original._retry = true;
    isRefreshing = true;
    try {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) throw new Error('no_refresh_token');
      const r = await axios.post(`${env.apiUrl}/api/auth/refresh`, { refreshToken });
      const newAccess = r.data?.accessToken;
      const newRefresh = r.data?.refreshToken;
      if (!newAccess || !newRefresh) throw new Error('refresh_response_invalid');
      await setRefreshToken(newRefresh);
      setAccessToken(newAccess);
      processQueue(newAccess);
      original.headers = { ...(original.headers || {}), Authorization: `Bearer ${newAccess}` };
      return api(original);
    } catch (refreshErr) {
      processQueue(null);
      _onUnauthorized?.();
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  },
);

// ---------------- SecureStore wrapper ----------------
// Tiny in-memory cache for the refresh token too.
let _refreshTokenCache: string | null = null;
const REFRESH_KEY = 'school_platform_refresh_v1';
const ACCESS_KEY = 'school_platform_access_v1';

import * as SecureStore from 'expo-secure-store';

export async function setRefreshToken(token: string | null) {
  _refreshTokenCache = token;
  if (token) {
    await SecureStore.setItemAsync(REFRESH_KEY, token);
    // The access token is short-lived; we still cache it so the
    // interceptor can read it without awaiting SecureStore.
    await SecureStore.setItemAsync(ACCESS_KEY, _accessToken || '');
  } else {
    await SecureStore.deleteItemAsync(REFRESH_KEY);
    await SecureStore.deleteItemAsync(ACCESS_KEY);
  }
}

export async function getRefreshToken(): Promise<string | null> {
  if (_refreshTokenCache) return _refreshTokenCache;
  const v = await SecureStore.getItemAsync(REFRESH_KEY);
  _refreshTokenCache = v;
  return v;
}

// Hydrate the in-memory access token at app boot (called from SessionProvider).
export async function hydrateAccessToken(): Promise<string | null> {
  const v = await SecureStore.getItemAsync(ACCESS_KEY);
  _accessToken = v || null;
  return _accessToken;
}
