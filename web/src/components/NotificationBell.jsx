// Notification bell + dropdown (Phase 7) — shown in DashboardShell header.
// Visible to all authenticated users; shows unread count + last 10.
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';

const CAT_COLOR = {
  announcement: 'bg-brand-100 text-brand-700',
  academic:     'bg-emerald-100 text-emerald-700',
  fee:          'bg-amber-100 text-amber-700',
  event:        'bg-purple-100 text-purple-700',
  emergency:    'bg-red-100 text-red-700',
};

export default function NotificationBell() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);

  function load() {
    if (!user) return;
    Promise.all([
      api('/api/notifications'),
      api('/api/notifications/unread-count'),
    ]).then(([n, u]) => { setItems(n.items.slice(0, 10)); setUnread(u.count); })
      .catch(() => {});
  }
  useEffect(load, [user]);

  async function markRead(id) {
    await api(`/api/notifications/${id}/read`, { method: 'POST' });
    load();
  }

  if (!user) return null;
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className="relative p-2 rounded hover:bg-slate-100" aria-label="Notifications">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-600 text-white text-[10px] rounded-full px-1.5 min-w-[18px] text-center">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 max-h-[28rem] overflow-y-auto bg-white rounded-lg shadow-lg border border-slate-200 z-50">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <span className="font-semibold text-sm">Notifications</span>
            <span className="text-xs text-slate-500">{unread} unread</span>
          </div>
          {items.length === 0 && <p className="px-4 py-6 text-sm text-slate-500 text-center">All caught up.</p>}
          <ul className="divide-y divide-slate-200">
            {items.map(n => (
              <li key={n.id} className={'px-4 py-3 ' + (n.is_read ? '' : 'bg-brand-50/30')}>
                <div className="flex items-center justify-between gap-2">
                  <span className={'text-xs px-2 py-0.5 rounded ' + (CAT_COLOR[n.category] || 'bg-slate-100 text-slate-700')}>{n.category}</span>
                  {!n.is_read && <span className="text-[10px] px-1.5 rounded bg-red-100 text-red-700">new</span>}
                </div>
                <div className="font-medium text-sm mt-1">{n.title}</div>
                <p className="text-xs text-slate-600 mt-1 line-clamp-2">{n.body}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-slate-400">{new Date(n.created_at).toLocaleString()}</span>
                  {!n.is_read && (
                    <button onClick={() => markRead(n.id)} className="text-xs text-brand-700 hover:underline">Mark read</button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {user.role_key === 'admin' && (
            <Link to="/admin/notifications" onClick={() => setOpen(false)} className="block px-4 py-2 text-xs text-brand-700 hover:bg-slate-50 text-center border-t border-slate-200">
              Manage notifications →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
