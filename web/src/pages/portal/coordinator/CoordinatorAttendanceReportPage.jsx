// Coordinator attendance report (Phase 5).
import { useEffect, useMemo, useState } from 'react';
import { api } from '../../../lib/api.js';

export default function CoordinatorAttendanceReportPage() {
  const [classes, setClasses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [sections, setSections] = useState([]);
  const [filter, setFilter] = useState({ class_id: '', section_id: '', session_id: '', month: new Date().toISOString().slice(0,7), threshold: 75 });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('summary');     // 'summary' | 'defaulters' | 'calendar'

  useEffect(() => {
    Promise.all([
      api('/api/admin/academic/classes'),
      api('/api/admin/academic/sessions'),
      api('/api/admin/academic/sections'),
    ]).then(([c, s, sec]) => { setClasses(c.items); setSessions(s.items); setSections(sec.items); }).catch(() => {});
  }, []);

  function load() {
    if (!filter.class_id || !filter.section_id) return;
    setLoading(true);
    const params = new URLSearchParams();
    params.set('class_id', filter.class_id);
    params.set('section_id', filter.section_id);
    if (filter.month) params.set('month', filter.month);
    const url = view === 'defaulters'
      ? `/api/attendance-reports/defaulters?${params}&threshold=${filter.threshold}`
      : `/api/attendance-reports/class?${params}`;
    api(url).then(d => setRows(d.items || [])).finally(() => setLoading(false));
  }
  useEffect(load, [filter.class_id, filter.section_id, filter.month, filter.threshold, view]);

  const filteredSections = useMemo(() => sections.filter(s => String(s.class_id) === String(filter.class_id)), [sections, filter.class_id]);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">Attendance reports</h1>
        <p className="text-slate-500">Class-level monthly attendance. Defaulters are students below the threshold.</p>
      </header>

      <div className="card">
        <div className="card-body grid sm:grid-cols-5 gap-3">
          <div>
            <label className="label">Session</label>
            <select className="input" value={filter.session_id} onChange={e => setFilter({ ...filter, session_id: e.target.value })}>
              <option value="">Any</option>
              {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Class</label>
            <select className="input" value={filter.class_id} onChange={e => setFilter({ ...filter, class_id: e.target.value, section_id: '' })}>
              <option value="">Select…</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Section</label>
            <select className="input" value={filter.section_id} onChange={e => setFilter({ ...filter, section_id: e.target.value })} disabled={!filter.class_id}>
              <option value="">Select…</option>
              {filteredSections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Month</label>
            <input type="month" className="input" value={filter.month} onChange={e => setFilter({ ...filter, month: e.target.value })} />
          </div>
          <div>
            <label className="label">View</label>
            <select className="input" value={view} onChange={e => setView(e.target.value)}>
              <option value="summary">Class summary</option>
              <option value="defaulters">Defaulters (&lt; {filter.threshold}%)</option>
            </select>
          </div>
        </div>
        {view === 'defaulters' && (
          <div className="px-5 pb-4">
            <label className="label">Threshold (%)</label>
            <input type="number" min={1} max={100} className="input max-w-[120px]" value={filter.threshold}
                   onChange={e => setFilter({ ...filter, threshold: Number(e.target.value) })} />
          </div>
        )}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500 text-xs uppercase">
            {view === 'defaulters'
              ? <tr><th className="px-3 py-2">Adm #</th><th>Name</th><th>Present</th><th>Late</th><th>Absent</th><th>Attendance %</th></tr>
              : <tr><th className="px-3 py-2">Adm #</th><th>Name</th><th>Present</th><th>Late</th><th>Absent</th><th>Leave</th><th>Total</th><th>Attendance %</th></tr>}
          </thead>
          <tbody>
            {loading && <tr><td colSpan={view === 'defaulters' ? 6 : 8} className="px-3 py-6 text-center text-slate-500">Loading…</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={view === 'defaulters' ? 6 : 8} className="px-3 py-6 text-center text-slate-500">No data. Pick a class + section + month.</td></tr>}
            {rows.map(r => (
              <tr key={r.student_id} className="border-t border-slate-200">
                <td className="px-3 py-2 font-mono text-xs">{r.admission_no}</td>
                <td className="px-3 py-2 font-medium">{r.full_name}</td>
                <td className="px-3 py-2">{r.present || 0}</td>
                <td className="px-3 py-2">{r.late || 0}</td>
                <td className="px-3 py-2">{r.absent || 0}</td>
                {view === 'defaulters'
                  ? <td className="px-3 py-2 font-semibold text-red-700">{r.attendance_pct != null ? `${r.attendance_pct}%` : '—'}</td>
                  : <>
                      <td className="px-3 py-2">{r.leave_days || 0}</td>
                      <td className="px-3 py-2">{r.total_marked || 0}</td>
                      <td className="px-3 py-2 font-semibold">{r.attendance_pct != null ? `${r.attendance_pct}%` : '—'}</td>
                    </>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
