import { useEffect, useState } from 'react';
import { api } from '../../../lib/api.js';

export default function TeacherResultsPage() {
  const [me, setMe] = useState(null);
  const [roster, setRoster] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [terms, setTerms] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [filter, setFilter] = useState({ class_id: '', section_id: '', session_id: '', term_id: '', subject_id: '' });
  const [marks, setMarks] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      api('/api/teacher/dashboard'),
      api('/api/teacher/subjects'),
      api('/api/admin/academic/terms'),
      api('/api/admin/academic/sessions'),
    ]).then(([d, s, t, sess]) => {
      setMe(d);
      setSubjects(s.items);
      setTerms(t.items);
      setSessions(sess.items);
    }).catch(() => {});
  }, []);

  async function loadRoster() {
    if (!filter.class_id || !filter.section_id) return;
    try {
      const r = await api(`/api/teacher/roster?class_id=${filter.class_id}&section_id=${filter.section_id}`);
      setRoster(r.items);
      setMarks({});
      setError(null);
    } catch (e) { setError(e.message); }
  }

  async function upload(s) {
    const m = marks[s.student_id];
    if (m == null || m === '') { setError(`Enter marks for ${s.full_name}`); return; }
    try {
      await api('/api/teacher/results', { method: 'POST', body: {
        student_id: s.student_id,
        subject_id: Number(filter.subject_id),
        term_id: Number(filter.term_id),
        session_id: Number(filter.session_id),
        marks_obtained: Number(m),
        total_marks: 100,
      }});
      setSaved({ student: s.full_name, marks: m });
      setTimeout(() => setSaved(null), 2000);
      setMarks(mk => { const n = { ...mk }; delete n[s.student_id]; return n; });
    } catch (e) { setError(e.data?.error || e.message); }
  }

  const classOpts = [...new Map((me?.assignments || []).map(a => [a.class_id, a])).values()];
  const sectionOpts = (me?.assignments || []).filter(a => String(a.class_id) === String(filter.class_id));
  const sessionOpts = sessions;
  const termOpts = filter.session_id ? terms.filter(t => String(t.session_id) === String(filter.session_id)) : terms;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">Upload results</h1>
        <p className="text-slate-500">Enter subject-wise marks for a class/section × term.</p>
      </header>

      <div className="card">
        <div className="card-body grid sm:grid-cols-5 gap-3">
          <div>
            <label className="label">Session</label>
            <select className="input" value={filter.session_id} onChange={e => setFilter({ ...filter, session_id: e.target.value, term_id: '' })}>
              <option value="">Select…</option>
              {sessionOpts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Term</label>
            <select className="input" value={filter.term_id} onChange={e => setFilter({ ...filter, term_id: e.target.value })}>
              <option value="">Select…</option>
              {termOpts.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Class</label>
            <select className="input" value={filter.class_id} onChange={e => setFilter({ ...filter, class_id: e.target.value, section_id: '' })}>
              <option value="">Select…</option>
              {classOpts.map(c => <option key={c.class_id} value={c.class_id}>{c.class_name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Section</label>
            <select className="input" value={filter.section_id} onChange={e => setFilter({ ...filter, section_id: e.target.value })} disabled={!filter.class_id}>
              <option value="">Select…</option>
              {sectionOpts.map(s => <option key={s.section_id} value={s.section_id}>{s.section}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Subject</label>
            <select className="input" value={filter.subject_id} onChange={e => setFilter({ ...filter, subject_id: e.target.value })}>
              <option value="">Select…</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
        <div className="px-5 pb-4">
          <button onClick={loadRoster} disabled={!filter.class_id || !filter.section_id || !filter.subject_id || !filter.term_id || !filter.session_id} className="btn-primary text-sm">Load roster</button>
        </div>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}
      {saved && <div className="text-sm text-emerald-700">✓ Saved marks for {saved.student}: {saved.marks}</div>}

      {roster.length > 0 && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500 text-xs uppercase">
              <tr><th className="px-3 py-2">Adm #</th><th>Name</th><th>Marks (out of 100)</th><th></th></tr>
            </thead>
            <tbody>
              {roster.map(s => (
                <tr key={s.student_id} className="border-t border-slate-200">
                  <td className="px-3 py-2 font-mono text-xs">{s.admission_no}</td>
                  <td className="px-3 py-2 font-medium">{s.full_name}</td>
                  <td className="px-3 py-2">
                    <input type="number" min={0} max={100} className="input !w-24 !py-1" value={marks[s.student_id] ?? ''} onChange={e => setMarks(m => ({ ...m, [s.student_id]: e.target.value }))} placeholder="0–100" />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => upload(s)} className="text-xs text-brand-700 hover:underline">Save</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
