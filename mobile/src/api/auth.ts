// Auth API — login, logout, me. The server endpoint accepts email OR
// CNIC (auto-detected by presence of '@' character) so we don't have to
// branch on the client.
import { api } from './client';

export type Role = 'admin' | 'coordinator' | 'teacher' | 'student'
              | 'parent' | 'accountant' | 'operator' | 'alumni';

export interface SessionUser {
  id: number;
  email: string;
  full_name: string;
  role: { key: Role; name: string };
  permissions: string[];
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
}

export async function login(identifier: string, password: string): Promise<LoginResponse> {
  // /api/auth/login is unauthenticated; bypass the interceptor's auth
  // header by using a fresh axios call.
  const { axiosBare } = await import('./clientBare');
  const r = await axiosBare.post('/api/auth/login', { identifier, password });
  return r.data;
}

export async function logout(): Promise<void> {
  const { getRefreshToken, setAccessToken, setRefreshToken } = await import('./client');
  try {
    const rt = await getRefreshToken();
    await api.post('/api/auth/logout', { refreshToken: rt });
  } catch { /* ignore */ }
  setAccessToken(null);
  await setRefreshToken(null);
}

export async function me(): Promise<SessionUser> {
  const r = await api.get('/api/auth/me');
  return r.data;
}
