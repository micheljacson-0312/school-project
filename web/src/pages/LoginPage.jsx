import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, dashboardPathFor } from '../lib/auth.jsx';

const DEMO_USERS = [
  { role: 'Admin',        email: 'admin@school.test' },
  { role: 'Coordinator',  email: 'coord@school.test' },
  { role: 'Teacher',      email: 'teacher@school.test' },
  { role: 'Student',      email: 'student@school.test' },
  { role: 'Parent',       email: 'parent@school.test' },
  { role: 'Accountant',   email: 'accounts@school.test' },
  { role: 'Operator',     email: 'operator@school.test' },
  { role: 'Alumni',       email: 'alumni@school.test' },
];

export default function LoginPage() {
  const { login, loading, error } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('admin@school.test');
  const [password, setPassword] = useState('Password123!');
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const user = await login(identifier, password);
      navigate(dashboardPathFor(user.role.key), { replace: true });
    } catch { /* error rendered from context */ }
    finally { setSubmitting(false); }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 grid lg:grid-cols-2 gap-8 items-start">
      {/* Intro column */}
      <section className="hidden lg:block">
        <div className="text-xs uppercase tracking-wider text-brand-700 font-semibold">Member sign in</div>
        <h1 className="text-3xl font-bold mt-2 leading-tight">Access your portal.</h1>
        <p className="text-slate-600 mt-3">
          Students, teachers, parents, and staff all sign in here. You'll be routed to the
          dashboard that matches your role.
        </p>
        <p className="text-sm text-slate-500 mt-6">
          Looking for something else? <Link to="/" className="text-brand-700 font-medium">Back to the homepage</Link>.
        </p>
      </section>

      {/* Form column */}
      <div className="card w-full max-w-md lg:ml-auto">
        <div className="card-body">
          <h2 className="text-xl font-semibold">Sign in</h2>
          <p className="text-sm text-slate-500 mt-1">
            Parents can sign in with their CNIC. Everyone else uses their email.
          </p>
          <form className="mt-5 space-y-3" onSubmit={onSubmit}>
            <div>
              <label className="label" htmlFor="identifier">Email or CNIC</label>
              <input id="identifier" className="input" value={identifier} onChange={e => setIdentifier(e.target.value)} autoComplete="username" required />
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <input id="password" type="password" className="input" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required />
            </div>
            {error && <div className="text-sm text-red-600">{error}</div>}
            <button className="btn-primary w-full" disabled={submitting || loading}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6">
            <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">Demo accounts (password: Password123!)</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {DEMO_USERS.map(u => (
                <button key={u.email} type="button"
                        onClick={() => { setIdentifier(u.email); setPassword('Password123!'); }}
                        className="text-left px-3 py-2 rounded border border-slate-200 hover:bg-slate-50">
                  <div className="font-medium text-slate-700">{u.role}</div>
                  <div className="text-xs text-slate-500 truncate">{u.email}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
