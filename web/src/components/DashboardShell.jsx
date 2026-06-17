import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import NotificationBell from './NotificationBell.jsx';

const ROLE_LABEL = {
  admin: 'Administrator',
  coordinator: 'Coordinator',
  teacher: 'Teacher',
  student: 'Student',
  parent: 'Parent',
  accountant: 'Accountant',
  operator: 'Computer Operator',
  alumni: 'Alumni',
};

export default function DashboardShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  async function onLogout() {
    await logout();
    navigate('/login', { replace: true });
  }
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-brand-600 text-white grid place-items-center font-bold">S</div>
            <span className="font-semibold">School Platform</span>
          </Link>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <div className="text-right text-sm leading-tight">
              <div className="font-medium">{user?.full_name}</div>
              <div className="text-slate-500">{ROLE_LABEL[user?.role.key] || user?.role.key}</div>
            </div>
            <button onClick={onLogout} className="btn-secondary text-sm">Sign out</button>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 pb-3 flex gap-2 flex-wrap text-sm">
          <NavLink to="/" end className={({ isActive }) => 'px-3 py-1.5 rounded ' + (isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100')}>
            Home
          </NavLink>
          <span className="px-3 py-1.5 text-slate-400">·</span>
          <span className="px-3 py-1.5 text-slate-500">Phase 1 · Foundation only — dashboards show seeded data only.</span>
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        {children || <Outlet />}
      </main>
      <footer className="border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        School Platform · Phase 1 (Foundation) · Build module-by-module
      </footer>
    </div>
  );
}
