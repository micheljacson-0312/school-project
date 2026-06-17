import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';

export default function TeachersPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  useEffect(() => {
    setLoading(true);
    api('/api/admin/academic/teachers').then(d => setItems(d.items)).finally(() => setLoading(false));
  }, []);
  const filtered = !q ? items : items.filter(t =>
    (t.full_name || '').toLowerCase().includes(q.toLowerCase()) ||
    (t.employee_code || '').toLowerCase().includes(q.toLowerCase()) ||
    (t.email || '').toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Teachers</h1>
          <p className="text-slate-500">Roster pulled from the academic backend. Manage user accounts on the Users page.</p>
        </div>
        <input className="input max-w-xs" placeholder="Search…" value={q} onChange={e => setQ(e.target.value)} />
      </header>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500 text-xs uppercase">
            <tr>
              <th className="px-3 py-2">Name</th><th>Code</th><th>Designation</th><th>Email</th><th>Assignments</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">Loading…</td></tr>}
            {!loading && filtered.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">No teachers.</td></tr>}
            {filtered.map(t => (
              <tr key={t.teacher_id} className="border-t border-slate-200 hover:bg-slate-50">
                <td className="px-3 py-2 font-medium">{t.full_name}</td>
                <td className="px-3 py-2 text-slate-500">{t.employee_code}</td>
                <td className="px-3 py-2">{t.designation || '—'}</td>
                <td className="px-3 py-2">{t.email}</td>
                <td className="px-3 py-2">{t.assignment_count}</td>
                <td className="px-3 py-2">{t.teacher_status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
