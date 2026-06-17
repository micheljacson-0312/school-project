import { useEffect, useMemo, useState } from 'react';
import { api } from '../../../lib/api.js';

export default function StudentAttendancePage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  useEffect(() => {
    setLoading(true);
    api('/api/student/attendance').then(d => setItems(d.items)).finally(() => setLoading(false));
  }, []);
  const counts = useMemo(() => {
    const c = { present: 0, absent: 0, late: 0, leave: 0, holiday: 0 };
    for (const i of items) c[i.status] = (c[i.status] || 0) + 1;
    return c;
  }, [items]);
  const filtered = filter ? items.filter(i => i.status === filter) : items;
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">Attendance</h1>
        <p className="text-slate-500">Your daily attendance for the current session.</p>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
        {Object.entries(counts).map(([k, v]) => (
          <button key={k} onClick={() => setFilter(filter === k ? '' : k)}
            className={'card text-left transition ' + (filter === k ? 'ring-2 ring-brand-400' : 'hover:shadow')}>
            <div className="card-body py-3">
              <div className="text-xs uppercase text-slate-500">{k}</div>
              <div className="text-2xl font-semibold">{v}</div>
            </div>
          </button>
        ))}
      </section>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500 text-xs uppercase">
            <tr><th className="px-3 py-2">Date</th><th>Status</th><th>Remarks</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={3} className="px-3 py-6 text-center text-slate-500">Loading…</td></tr>}
            {!loading && filtered.length === 0 && <tr><td colSpan={3} className="px-3 py-6 text-center text-slate-500">No attendance records.</td></tr>}
            {filtered.map(a => (
              <tr key={a.date} className="border-t border-slate-200">
                <td className="px-3 py-2">{new Date(a.date).toLocaleDateString()}</td>
                <td className="px-3 py-2">
                  <span className={'text-xs px-2 py-0.5 rounded ' + (
                    a.status === 'present' ? 'bg-emerald-100 text-emerald-700' :
                    a.status === 'absent'  ? 'bg-red-100 text-red-700' :
                    a.status === 'late'    ? 'bg-amber-100 text-amber-700' :
                    a.status === 'leave'   ? 'bg-brand-100 text-brand-700' :
                                             'bg-slate-100 text-slate-600'
                  )}>{a.status}</span>
                </td>
                <td className="px-3 py-2 text-slate-500">{a.remarks || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
