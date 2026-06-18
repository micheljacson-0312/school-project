// Session context — provides { user, loading, login, logout } to the
// whole app. Hydrates from SecureStore on mount. Notifies the axios
// interceptor on logout via onUnauthorized().
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, hydrateAccessToken, setAccessToken, setRefreshToken, onUnauthorized } from '../api/client';
import { login as apiLogin, logout as apiLogout, me, SessionUser, Role } from '../api/auth';

interface SessionState {
  user: SessionUser | null;
  loading: boolean;
  loginError: string | null;
  login: (identifier: string, password: string) => Promise<SessionUser | null>;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Bootstrap: try to restore session from SecureStore.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const access = await hydrateAccessToken();
        if (!access) { setLoading(false); return; }
        // Verify the token still works.
        const meRes = await me();
        if (!cancelled) setUser(meRes);
      } catch {
        // Token invalid or expired and refresh also failed. Clear.
        setAccessToken(null);
        await setRefreshToken(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Hook the interceptor into our logout.
  useEffect(() => {
    onUnauthorized(() => {
      setUser(null);
      setAccessToken(null);
      setRefreshToken(null);
    });
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    setLoginError(null);
    try {
      const r = await apiLogin(identifier, password);
      setAccessToken(r.accessToken);
      await setRefreshToken(r.refreshToken);
      setUser(r.user);
      return r.user;
    } catch (e: any) {
      const code = e?.response?.data?.error;
      let msg = code || e?.message || 'Login failed';
      if (code === 'invalid_credentials') msg = 'Incorrect email/CNIC or password.';
      else if (code === 'account_locked')    msg = 'Account locked. Try again later.';
      else if (code === 'user_inactive')     msg = 'Account is inactive. Contact the admin.';
      else if (code === 'rate_limited')      msg = 'Too many attempts. Slow down and try again.';
      setLoginError(msg);
      return null;
    }
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  const value = useMemo<SessionState>(() => ({ user, loading, loginError, login, logout }),
    [user, loading, loginError, login, logout]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>');
  return ctx;
}

// Helper for navigation guards.
export function dashboardPathFor(role: Role): string {
  switch (role) {
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
