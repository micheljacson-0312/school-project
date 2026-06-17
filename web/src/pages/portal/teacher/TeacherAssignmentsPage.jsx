import { useEffect, useState } from 'react';
import Modal from '../../../components/Modal.jsx';
import { api } from '../../../lib/api.js';

const blank = { subject_id: '', class_id: '', section_id: '', session_id: '', title: '', description: '', total_marks: 100, due_at: '' };

export default function TeacherAssignmentsPage() {
  const [items, setItems] = useState([]);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);             // 'create' | { id } (for grade)
  const [form, setForm] = useState(blank);
  const [gradeForm, setGradeForm] = useState({});      // { subId: { marks, feedback } }
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  function load() {
    setLoading(true);
    Promise.all([api('/api/lms/assignments'), api('/api/teacher/dashboard')])
      .then(([a, d]) => { setItems(a.items); setMe(d); }).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function openGrade(a) {
    setGradeForm({});
    setModal({ id: a.id });
    setError(null);
    try {
      const detail = await api(`/api/lms/assignments/${a.id}`);
      setModal({ id: a.id, item: detail.item });
    } catch (e) { setError(e.message); }
  }

  async function saveCreate() {
    setSubmitting(true); setError(null);
    try {
      await api('/api/lms/assignments', { method: 'POST', body: { ...form, total_marks: Number(form.total_marks) } });
      setModal(null); setForm(blank); load();
    } catch (e) { setError(e.data?.error || e.message); }
    finally { setSubmitting(false); }
  }
  async function grade(sub) {
    const g = gradeForm[sub.id] || {};
    if (g.marks == null || g.marks === '') { setError(`Enter marks for ${sub.student_name}`); return; }
    try {
      await api(`/api/lms/assignments/${modal.id}/grade/${sub.id}`, { method: 'POST', body: { marks_obtained: Number(g.marks), feedback: g.feedback } });
      setGradeForm(gf => { const n = { ...gf }; delete n[sub.id]; return n; });
      // refresh submissions list
      const detail = await api(`/api/lms/assignments/${modal.id}`);
      setModal({ id: modal.id, item: detail.item });
    } catch (e) { setError(e.data?.error || e.message); }
  }
  async function remove(a) {
    if (!confirm(`Delete "${a.title}"? All submissions will also be deleted.`)) return;
    await api(`/api/lms/assignments/${a.id}`, { method: 'DELETE' });
    load();
  }

  const sections = me?.assignments?.filter(a => String(a.class_id) === String(form.class_id)) || [];

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Assignments</h1>
          <p className="text-slate-500">Create assignments and grade student submissions.</p>
        </div>
        <button onClick={() => { setForm(blank); setModal('create'); setError(null); }} className="btn-primary text-sm">+ New assignment</button>
      </header>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500 text-xs uppercase">
            <tr><th className="px-3 py-2">Title</th><th>Subject</th><th>Class</th><th>Due</th><th>Marks</th><th className="text-right">Actions</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">Loading…</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">No assignments.</td></tr>}
            {items.map(a => (
              <tr key={a.id} className="border-t border-slate-200">
                <td className="px-3 py-2 font-medium">{a.title}</td>
                <td className="px-3 py-2">{a.subject_name}</td>
                <td className="px-3 py-2">{a.class_name}/{a.section_name}</td>
                <td className="px-3 py-2 text-xs">{new Date(a.due_at).toLocaleString()}</td>
                <td className="px-3 py-2">{a.total_marks}</td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <button onClick={() => openGrade(a)} className="text-xs text-brand-700 hover:underline mr-3">Grade</button>
                  <button onClick={() => remove(a)} className="text-xs text-red-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create modal */}
      <Modal open={modal === 'create'} onClose={() => setModal(null)} title="New assignment"
             footer={<>
               <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
               <button className="btn-primary" onClick={saveCreate} disabled={submitting}>{submitting ? 'Saving…' : 'Save'}</button>
             </>}>
        <div className="space-y-3">
          <div><label className="label">Title *</label><input className="input" value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="label">Subject *</label>
              <select className="input" value={form.subject_id || ''} onChange={e => {
                const sid = e.target.value;
                const a = (me?.assignments || []).find(a => a.subject_id === Number(sid));
                setForm(f => ({ ...f, subject_id: sid, class_id: a?.class_id || '', section_id: a?.section_id || '', session_id: a?.session_id || '' }));
              }}>
                <option value="">Select…</option>
                {[...new Map((me?.assignments || []).map(a => [a.subject_id, a])).values()].map(a => <option key={a.subject_id} value={a.subject_id}>{a.subject}</option>)}
              </select>
            </div>
            <div><label className="label">Total marks</label><input type="number" className="input" value={form.total_marks} onChange={e => setForm(f => ({ ...f, total_marks: e.target.value }))} /></div>
            <div><label className="label">Due at *</label><input type="datetime-local" className="input" value={form.due_at || ''} onChange={e => setForm(f => ({ ...f, due_at: e.target.value }))} /></div>
          </div>
          <div><label className="label">Description</label><textarea rows={4} className="input" value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
          {error && <div className="text-sm text-red-600">{error}</div>}
        </div>
      </Modal>

      {/* Grade modal */}
      <Modal open={modal && modal !== 'create'} onClose={() => setModal(null)} size="xl"
             title={modal?.item ? `Submissions: ${modal.item.title}` : 'Submissions'}>
        {modal?.item && (
          <div className="space-y-2 text-sm">
            <p className="text-slate-500 text-xs">{modal.item.subject_name} · {modal.item.class_name}/{modal.item.section_name}</p>
            {error && <div className="text-sm text-red-600">{error}</div>}
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500 text-xs uppercase">
                <tr><th className="py-1">Adm #</th><th>Name</th><th>Submitted</th><th>Marks</th><th>Feedback</th><th></th></tr>
              </thead>
              <tbody>
                {modal.item.submissions?.length === 0 && <tr><td colSpan={6} className="py-4 text-center text-slate-500">No submissions yet.</td></tr>}
                {modal.item.submissions?.map(s => (
                  <tr key={s.id} className="border-t border-slate-200 align-top">
                    <td className="py-2 font-mono text-xs">{s.admission_no}</td>
                    <td className="py-2 font-medium">{s.student_name}</td>
                    <td className="py-2 text-xs text-slate-500">{s.submitted_at ? new Date(s.submitted_at).toLocaleString() : '—'}</td>
                    <td className="py-2">
                      {s.marks_obtained != null
                        ? <span className="text-emerald-700 font-medium">{s.marks_obtained}/{modal.item.total_marks}</span>
                        : <input type="number" className="input !w-20 !py-1" placeholder="—" value={(gradeForm[s.id] || {}).marks ?? ''} onChange={e => setGradeForm(g => ({ ...g, [s.id]: { ...(g[s.id]||{}), marks: e.target.value } }))} />}
                    </td>
                    <td className="py-2">
                      {s.marks_obtained != null
                        ? <span className="text-xs text-slate-500">{s.feedback || '—'}</span>
                        : <input className="input !py-1" placeholder="optional feedback" value={(gradeForm[s.id] || {}).feedback ?? ''} onChange={e => setGradeForm(g => ({ ...g, [s.id]: { ...(g[s.id]||{}), feedback: e.target.value } }))} />}
                    </td>
                    <td className="py-2 text-right">
                      {s.marks_obtained == null && <button onClick={() => grade(s)} className="text-xs text-brand-700 hover:underline">Save</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </div>
  );
}
