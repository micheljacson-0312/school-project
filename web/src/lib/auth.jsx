// Auth context: holds the current user, exposes login/logout, persists
// refresh token in localStorage, keeps access token in memory.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setAccessToken, getAccessToken } from './api.js';

const AuthContext = createContext(null);

const REFRESH_KEY = 'school_platform_refresh';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Try to restore a session on first mount.
  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      const refresh = localStorage.getItem(REFRESH_KEY);
      if (!refresh) { setLoading(false); return; }
      try {
        const r = await api('/api/auth/refresh', { method: 'POST', body: { refreshToken: refresh } });
        if (cancelled) return;
        setAccessToken(r.accessToken);
        localStorage.setItem(REFRESH_KEY, r.refreshToken);
        const me = await api('/api/auth/me');
        if (!cancelled) setUser(me);
      } catch {
        localStorage.removeItem(REFRESH_KEY);
        setAccessToken(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    bootstrap();
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (identifier, password) => {
    setError(null);
    try {
      const r = await api('/api/auth/login', { method: 'POST', body: { identifier, password } });
      setAccessToken(r.accessToken);
      localStorage.setItem(REFRESH_KEY, r.refreshToken);
      setUser(r.user);
      return r.user;
    } catch (e) {
      const msg = e.data?.error === 'invalid_credentials'
        ? 'Incorrect email/CNIC or password.'
        : (e.data?.error || e.message);
      setError(msg);
      throw e;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      const refresh = localStorage.getItem(REFRESH_KEY);
      await api('/api/auth/logout', { method: 'POST', body: { refreshToken: refresh } });
    } catch { /* ignore */ }
    localStorage.removeItem(REFRESH_KEY);
    setAccessToken(null);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, error, login, logout, getAccessToken }), [user, loading, error, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

// Route the user to the right dashboard based on role key.
export function dashboardPathFor(roleKey) {
  switch (roleKey) {
    case 'admin':       return '/admin';
    case 'coordinator': return '/coordinator';
    case 'teacher':     return '/teacher';
    case 'student':     return '/student';
    case 'parent':      return '/parent';
    case 'accountant':  return '/accountant';
    case 'operator':    return '/operator';
    case 'alumni':      return '/alumni';
    default:            return '/';
  }
}
