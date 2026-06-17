import { useEffect, useState } from 'react';
import Modal from '../../components/Modal.jsx';
import { api } from '../../lib/api.js';

export default function TeacherAssignmentsPage() {
  const [items, setItems] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  function load() {
    setLoading(true);
    Promise.all([
      api('/api/admin/academic/teacher-assignments'),
      api('/api/admin/academic/teachers'),
      api('/api/admin/academic/classes'),
      api('/api/admin/academic/sections'),
      api('/api/admin/academic/subjects'),
      api('/api/admin/academic/sessions'),
    ]).then(([a, t, c, sec, sub, sess]) => {
      setItems(a.items); setTeachers(t.items); setClasses(c.items);
      setSections(sec.items); setSubjects(sub.items); setSessions(sess.items);
    }).finally(() => setLoading(false));
  }
  useEffect(load, []);

  const filteredSections  = sections.filter(s  => String(s.class_id)  === String(form.class_id));
  const filteredSubjects  = subjects.filter(s  => String(s.class_id)  === String(form.class_id));

  function openCreate() { setForm({ teacher_id: '', class_id: '', section_id: '', subject_id: '', session_id: '' }); setModal('create'); setError(null); }
  async function save() {
    setSubmitting(true); setError(null);
    try {
      const body = {
        teacher_id: Number(form.teacher_id),
        class_id: Number(form.class_id),
        section_id: Number(form.section_id),
        subject_id: Number(form.subject_id),
        session_id: Number(form.session_id),
      };
      await api('/api/admin/academic/teacher-assignments', { method: 'POST', body });
      setModal(null); load();
    } catch (e) { setError(e.data?.error || e.message); }
    finally { setSubmitting(false); }
  }
  async function remove(it) {
    if (!confirm(`Remove assignment: ${it.teacher_name} → ${it.class_name}/${it.section_name} ${it.subject_name}?`)) return;
    await api(`/api/admin/academic/teacher-assignments/${it.id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Teacher assignments</h1>
          <p className="text-slate-500">Who teaches what — the link between teachers, subjects, classes, and sections.</p>
        </div>
        <button onClick={openCreate} className="btn-primary text-sm">+ New assignment</button>
      </header>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500 text-xs uppercase">
            <tr><th className="px-3 py-2">Teacher</th><th>Subject</th><th>Class</th><th>Section</th><th>Session</th><th className="text-right">Actions</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">Loading…</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">No assignments yet.</td></tr>}
            {items.map(a => (
              <tr key={a.id} className="border-t border-slate-200 hover:bg-slate-50">
                <td className="px-3 py-2">
                  <div className="font-medium">{a.teacher_name}</div>
                  <div className="text-xs text-slate-500">{a.employee_code}</div>
                </td>
                <td className="px-3 py-2">{a.subject_name}</td>
                <td className="px-3 py-2">{a.class_name}</td>
                <td className="px-3 py-2">{a.section_name}</td>
                <td className="px-3 py-2 text-xs text-slate-500">{a.session_name}</td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => remove(a)} className="text-xs text-red-600 hover:underline">Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title="New assignment"
             footer={<>
               <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
               <button className="btn-primary" onClick={save} disabled={submitting}>{submitting ? 'Saving…' : 'Save'}</button>
             </>}>
        <div className="space-y-3">
          <div>
            <label className="label">Teacher *</label>
            <select className="input" value={form.teacher_id || ''} onChange={e => setForm(f => ({ ...f, teacher_id: e.target.value }))}>
              <option value="">Select…</option>
              {teachers.map(t => <option key={t.teacher_id} value={t.teacher_id}>{t.full_name} ({t.employee_code})</option>)}
            </select>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Session *</label>
              <select className="input" value={form.session_id || ''} onChange={e => setForm(f => ({ ...f, session_id: e.target.value }))}>
                <option value="">Select…</option>
                {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Class *</label>
              <select className="input" value={form.class_id || ''} onChange={e => setForm(f => ({ ...f, class_id: e.target.value, section_id: '', subject_id: '' }))}>
                <option value="">Select…</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Section *</label>
              <select className="input" value={form.section_id || ''} onChange={e => setForm(f => ({ ...f, section_id: e.target.value }))} disabled={!form.class_id}>
                <option value="">Select…</option>
                {filteredSections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Subject *</label>
              <select className="input" value={form.subject_id || ''} onChange={e => setForm(f => ({ ...f, subject_id: e.target.value }))} disabled={!form.class_id}>
                <option value="">Select…</option>
                {filteredSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          {error && <div className="text-sm text-red-600">Could not save: {error}</div>}
        </div>
      </Modal>
    </div>
  );
}
