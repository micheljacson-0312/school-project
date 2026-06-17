// Bulk results upload (Phase 5) — teacher enters marks for a whole roster at once.
import { useEffect, useMemo, useState } from 'react';
import { api } from '../../../lib/api.js';

export default function TeacherBulkResultsPage() {
  const [me, setMe] = useState(null);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [terms, setTerms] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [filter, setFilter] = useState({ class_id: '', section_id: '', session_id: '', term_id: '', subject_id: '' });
  const [roster, setRoster] = useState([]);
  const [marks, setMarks] = useState({});          // { student_id: { marks, grade, remarks } }
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      api('/api/teacher/dashboard'),
      api('/api/teacher/subjects'),
      api('/api/admin/academic/classes'),
      api('/api/admin/academic/sections'),
      api('/api/admin/academic/terms'),
      api('/api/admin/academic/sessions'),
    ]).then(([d, sub, c, sec, t, sess]) => {
      setMe(d);
      setSubjects(sub.items);
      setClasses(c.items);
      setSections(sec.items);
      setTerms(t.items);
      setSessions(sess.items);
    });
  }, []);

  const sectionOpts = useMemo(() => sections.filter(s => String(s.class_id) === String(filter.class_id)), [sections, filter.class_id]);
  const termOpts = useMemo(() => filter.session_id ? terms.filter(t => String(t.session_id) === String(filter.session_id)) : terms, [terms, filter.session_id]);

  async function loadRoster() {
    if (!filter.class_id || !filter.section_id) return;
    const r = await api(`/api/teacher/roster?class_id=${filter.class_id}&section_id=${filter.section_id}`);
    setRoster(r.items);
    setMarks({});
    setSaved(false); setError(null);
  }

  function bulk(value) {
    const next = {};
    for (const s of roster) next[s.student_id] = { ...(marks[s.student_id] || { marks: value, grade: '', remarks: '' }) };
    setMarks(next);
  }

  async function saveAll() {
    setSaving(true); setError(null); setSaved(false);
    try {
      const results = roster.map(s => ({
        student_id: s.student_id,
        marks_obtained: Number(marks[s.student_id]?.marks || 0),
        grade: marks[s.student_id]?.grade || undefined,
        remarks: marks[s.student_id]?.remarks || undefined,
      }));
      await api('/api/results/bulk', { method: 'POST', body: {
        subject_id: Number(filter.subject_id),
        term_id: Number(filter.term_id),
        session_id: Number(filter.session_id),
        total_marks: 100,
        results,
      }});
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { setError(e.data?.error || e.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">Bulk results upload</h1>
        <p className="text-slate-500">Enter marks for a whole class/section at once. Each save upserts the row.</p>
      </header>

      <div className="card">
        <div className="card-body grid sm:grid-cols-5 gap-3">
          <div>
            <label className="label">Session</label>
            <select className="input" value={filter.session_id} onChange={e => setFilter({ ...filter, session_id: e.target.value, term_id: '' })}>
              <option value="">Select…</option>
              {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
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
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Section</label>
            <select className="input" value={filter.section_id} onChange={e => setFilter({ ...filter, section_id: e.target.value })} disabled={!filter.class_id}>
              <option value="">Select…</option>
              {sectionOpts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
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
          <button onClick={loadRoster} disabled={!filter.class_id || !filter.section_id} className="btn-primary text-sm">Load roster</button>
        </div>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}
      {saved && <div className="text-sm text-emerald-700">✓ Saved.</div>}

      {roster.length > 0 && (
        <>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">Bulk:</span>
            {[0, 50, 75, 100].map(v => (
              <button key={v} onClick={() => bulk(v)} className="px-2 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50">{v}</button>
            ))}
          </div>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500 text-xs uppercase">
                <tr><th className="px-3 py-2">Adm #</th><th>Name</th><th>Marks</th><th>Grade</th><th>Remarks</th></tr>
              </thead>
              <tbody>
                {roster.map(s => (
                  <tr key={s.student_id} className="border-t border-slate-200">
                    <td className="px-3 py-2 font-mono text-xs">{s.admission_no}</td>
                    <td className="px-3 py-2 font-medium">{s.full_name}</td>
                    <td className="px-3 py-2">
                      <input type="number" min={0} max={100} className="input !w-20 !py-1"
                             value={marks[s.student_id]?.marks ?? ''}
                             onChange={e => setMarks(m => ({ ...m, [s.student_id]: { ...(m[s.student_id]||{}), marks: e.target.value } }))}
                             placeholder="0–100" />
                    </td>
                    <td className="px-3 py-2">
                      <input className="input !w-16 !py-1" value={marks[s.student_id]?.grade ?? ''}
                             onChange={e => setMarks(m => ({ ...m, [s.student_id]: { ...(m[s.student_id]||{}), grade: e.target.value } }))} placeholder="A/B" />
                    </td>
                    <td className="px-3 py-2">
                      <input className="input !py-1" value={marks[s.student_id]?.remarks ?? ''}
                             onChange={e => setMarks(m => ({ ...m, [s.student_id]: { ...(m[s.student_id]||{}), remarks: e.target.value } }))} placeholder="optional" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end">
            <button onClick={saveAll} disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save all results'}</button>
          </div>
        </>
      )}
    </div>
  );
}
