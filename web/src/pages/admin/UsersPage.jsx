import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api.js';

const ROLES = [
  { key: 'admin',       label: 'Administrator' },
  { key: 'coordinator', label: 'Coordinator' },
  { key: 'teacher',     label: 'Teacher' },
  { key: 'student',     label: 'Student' },
  { key: 'parent',      label: 'Parent' },
  { key: 'accountant',  label: 'Accountant' },
  { key: 'operator',    label: 'Computer Operator' },
  { key: 'alumni',      label: 'Alumni' },
];

const STATUSES = ['active','inactive','suspended','pending'];

export default function UsersPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ role: '', status: '', q: '' });
  const [refresh, setRefresh] = useState(0);

  function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter.role)   params.set('role', filter.role);
    if (filter.status) params.set('status', filter.status);
    if (filter.q)      params.set('q', filter.q);
    api(`/api/admin/users?${params}`)
      .then(d => setItems(d.items))
      .finally(() => setLoading(false));
  }
  useEffect(load, [filter, refresh]);

  async function toggleStatus(u) {
    const next = u.status === 'active' ? 'inactive' : 'active';
    if (!confirm(`Set ${u.full_name} → ${next}?`)) return;
    await api(`/api/admin/users/${u.id}`, { method: 'PUT', body: { status: next } });
    setRefresh(x => x + 1);
  }

  async function deleteUser(u) {
    if (!confirm(`Permanently delete ${u.full_name} (${u.email})? This cannot be undone.`)) return;
    await api(`/api/admin/users/${u.id}`, { method: 'DELETE' });
    setRefresh(x => x + 1);
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-slate-500">Everyone who can sign in. {items.length} matched.</p>
        </div>
        <Link to="/admin/users/new" className="btn-primary text-sm">+ New user</Link>
      </header>

      <div className="card">
        <div className="card-body grid sm:grid-cols-3 gap-3">
          <div>
            <label className="label">Search</label>
            <input className="input" placeholder="Name, email, or CNIC" value={filter.q}
                   onChange={e => setFilter({ ...filter, q: e.target.value })} />
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={filter.role} onChange={e => setFilter({ ...filter, role: e.target.value })}>
              <option value="">All roles</option>
              {ROLES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={filter.status} onChange={e => setFilter({ ...filter, status: e.target.value })}>
              <option value="">Any status</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500 text-xs uppercase">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Email / CNIC</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Last login</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">Loading…</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">No users match these filters.</td></tr>}
            {items.map(u => (
              <tr key={u.id} className="border-t border-slate-200 hover:bg-slate-50">
                <td className="px-3 py-2">
                  <Link to={`/admin/users/${u.id}/edit`} className="font-medium text-brand-700 hover:underline">{u.full_name}</Link>
                  {u.phone && <div className="text-xs text-slate-500">{u.phone}</div>}
                </td>
                <td className="px-3 py-2">
                  <div>{u.email}</div>
                  {u.cnic && <div className="text-xs text-slate-500">CNIC {u.cnic}</div>}
                </td>
                <td className="px-3 py-2">{u.role_name}</td>
                <td className="px-3 py-2">
                  <span className={'text-xs px-2 py-0.5 rounded ' + (
                    u.status === 'active'    ? 'bg-emerald-100 text-emerald-700' :
                    u.status === 'pending'   ? 'bg-amber-100 text-amber-700' :
                    u.status === 'suspended' ? 'bg-red-100 text-red-700' :
                                              'bg-slate-100 text-slate-600'
                  )}>{u.status}</span>
                </td>
                <td className="px-3 py-2 text-xs text-slate-500">
                  {u.last_login_at ? new Date(u.last_login_at).toLocaleString() : '—'}
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <button onClick={() => toggleStatus(u)} className="text-xs text-slate-600 hover:underline mr-3">
                    {u.status === 'active' ? 'Deactivate' : 'Activate'}
                  </button>
                  <button onClick={() => deleteUser(u)} className="text-xs text-red-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
