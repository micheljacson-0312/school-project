// Coordinator teacher-attendance aggregate (Phase 5).
import { useEffect, useState } from 'react';
import { api } from '../../../lib/api.js';

export default function CoordinatorTeacherAttendancePage() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0,7));
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    api(`/api/teacher-attendance/report?month=${month}`).then(d => setItems(d.items)).catch(() => {}).finally(() => setLoading(false));
  }, [month]);

  const totals = items.reduce((acc, t) => {
    acc.present += t.present_days || 0;
    acc.late += t.late_days || 0;
    acc.absent += t.absent_days || 0;
    return acc;
  }, { present: 0, late: 0, absent: 0 });

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Teacher attendance</h1>
          <p className="text-slate-500">Monthly present / late / absent summary for all active teachers.</p>
        </div>
        <input type="month" className="input max-w-[160px]" value={month} onChange={e => setMonth(e.target.value)} />
      </header>
      <section className="grid grid-cols-3 gap-3">
        <div className="card"><div className="card-body"><div className="text-xs text-slate-500">Present-days</div><div className="text-2xl font-semibold">{totals.present}</div></div></div>
        <div className="card"><div className="card-body"><div className="text-xs text-slate-500">Late-days</div><div className="text-2xl font-semibold text-amber-700">{totals.late}</div></div></div>
        <div className="card"><div className="card-body"><div className="text-xs text-slate-500">Absent-days</div><div className="text-2xl font-semibold text-red-700">{totals.absent}</div></div></div>
      </section>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500 text-xs uppercase">
            <tr><th className="px-3 py-2">Name</th><th>Code</th><th>Present</th><th>Late</th><th>Absent</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">Loading…</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">No data.</td></tr>}
            {items.map(t => (
              <tr key={t.teacher_id} className="border-t border-slate-200">
                <td className="px-3 py-2 font-medium">{t.full_name}</td>
                <td className="px-3 py-2 font-mono text-xs">{t.employee_code}</td>
                <td className="px-3 py-2 text-emerald-700">{t.present_days || 0}</td>
                <td className="px-3 py-2 text-amber-700">{t.late_days || 0}</td>
                <td className="px-3 py-2 text-red-700">{t.absent_days || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
