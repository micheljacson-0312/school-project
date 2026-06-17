import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';

export default function StudentsPage() {
  const [items, setItems] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ class_id: '', section_id: '', session_id: '', q: '' });

  function load() {
    setLoading(true);
    const params = new URLSearchParams();
    Object.entries(filter).forEach(([k, v]) => { if (v) params.set(k, v); });
    api(`/api/admin/academic/students?${params}`).then(d => setItems(d.items)).finally(() => setLoading(false));
  }
  useEffect(load, [filter]);
  useEffect(() => {
    Promise.all([
      api('/api/admin/academic/classes'),
      api('/api/admin/academic/sections'),
      api('/api/admin/academic/sessions'),
    ]).then(([c, sec, s]) => { setClasses(c.items); setSections(sec.items); setSessions(s.items); });
  }, []);

  const filteredSections = sections.filter(s => String(s.class_id) === String(filter.class_id));

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">Students</h1>
        <p className="text-slate-500">Enrolled students. Edit individual accounts on the Users page.</p>
      </header>

      <div className="card">
        <div className="card-body grid sm:grid-cols-4 gap-3">
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
              <option value="">Any</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Section</label>
            <select className="input" value={filter.section_id} onChange={e => setFilter({ ...filter, section_id: e.target.value })} disabled={!filter.class_id}>
              <option value="">Any</option>
              {filteredSections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Search</label>
            <input className="input" value={filter.q} onChange={e => setFilter({ ...filter, q: e.target.value })} placeholder="Name or admission #" />
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500 text-xs uppercase">
            <tr>
              <th className="px-3 py-2">Admission #</th><th>Name</th><th>Class</th><th>Section</th><th>Guardian</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">Loading…</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">No students match.</td></tr>}
            {items.map(s => (
              <tr key={s.student_id} className="border-t border-slate-200 hover:bg-slate-50">
                <td className="px-3 py-2 font-medium">{s.admission_no}</td>
                <td className="px-3 py-2">{s.full_name}</td>
                <td className="px-3 py-2">{s.class_name}</td>
                <td className="px-3 py-2">{s.section_name}</td>
                <td className="px-3 py-2">
                  <div>{s.guardian_name || '—'}</div>
                  <div className="text-xs text-slate-500">{s.guardian_phone || ''}</div>
                </td>
                <td className="px-3 py-2">{s.student_status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
