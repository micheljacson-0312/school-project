import { useEffect, useState } from 'react';
import Modal from '../../../components/Modal.jsx';
import { api } from '../../../lib/api.js';

const blank = { subject_id: '', class_id: '', section_id: '', session_id: '', title: '', description: '', file_url: '', duration_min: '' };

export default function TeacherLecturesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState(null);
  const [modal, setModal] = useState(null);         // 'create' | 'live-create'
  const [form, setForm] = useState(blank);
  const [liveForm, setLiveForm] = useState({ subject_id: '', class_id: '', section_id: '', session_id: '', title: '', starts_at: '', ends_at: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  function load() {
    setLoading(true);
    Promise.all([
      api('/api/lms/lectures'),
      api('/api/teacher/dashboard'),
    ]).then(([l, d]) => { setItems(l.items); setMe(d); }).finally(() => setLoading(false));
  }
  useEffect(load, []);

  const sessionId = me?.assignments?.[0]?.session_id;

  async function saveLecture() {
    setSubmitting(true); setError(null);
    try {
      const body = { ...form, duration_min: form.duration_min ? Number(form.duration_min) : undefined };
      await api('/api/lms/lectures', { method: 'POST', body });
      setModal(null); setForm(blank); load();
    } catch (e) { setError(e.data?.error || e.message); }
    finally { setSubmitting(false); }
  }
  async function saveLiveClass() {
    setSubmitting(true); setError(null);
    try {
      await api('/api/lms/live-classes', { method: 'POST', body: liveForm });
      setModal(null); setLiveForm({ subject_id: '', class_id: '', section_id: '', session_id: '', title: '', starts_at: '', ends_at: '' });
    } catch (e) { setError(e.data?.error || e.message); }
    finally { setSubmitting(false); }
  }
  async function remove(l) {
    if (!confirm(`Delete lecture "${l.title}"?`)) return;
    await api(`/api/lms/lectures/${l.id}`, { method: 'DELETE' });
    load();
  }

  const assignmentBySubject = (sid) => me?.assignments?.find(a => a.subject_id === Number(sid));
  const sections = me?.assignments?.filter(a => String(a.class_id) === String(form.class_id)) || [];

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Lectures & recordings</h1>
          <p className="text-slate-500">Upload recorded lectures and schedule live Jitsi sessions.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setModal('live-create')} className="btn-secondary text-sm">+ Schedule live class</button>
          <button onClick={() => { setForm(blank); setModal('create'); }} className="btn-primary text-sm">+ Upload lecture</button>
        </div>
      </header>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500 text-xs uppercase">
            <tr><th className="px-3 py-2">Title</th><th>Subject</th><th>Class/Section</th><th>Duration</th><th>Recorded</th><th className="text-right">Actions</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">Loading…</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">No lectures yet.</td></tr>}
            {items.map(l => (
              <tr key={l.id} className="border-t border-slate-200">
                <td className="px-3 py-2">
                  <div className="font-medium">{l.title}</div>
                  {l.file_url && <a href={l.file_url} target="_blank" rel="noreferrer" className="text-xs text-brand-700 hover:underline">{l.file_url}</a>}
                </td>
                <td className="px-3 py-2">{l.subject_name}</td>
                <td className="px-3 py-2 text-xs">{l.class_name}/{l.section_name}</td>
                <td className="px-3 py-2 text-xs">{l.duration_min ? `${l.duration_min} min` : '—'}</td>
                <td className="px-3 py-2 text-xs text-slate-500">{l.recorded_at ? new Date(l.recorded_at).toLocaleDateString() : '—'}</td>
                <td className="px-3 py-2 text-right"><button onClick={() => remove(l)} className="text-xs text-red-600 hover:underline">Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modal === 'create'} onClose={() => setModal(null)} title="Upload lecture"
             footer={<>
               <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
               <button className="btn-primary" onClick={saveLecture} disabled={submitting}>{submitting ? 'Saving…' : 'Save'}</button>
             </>}>
        <div className="space-y-3">
          <div>
            <label className="label">Title *</label>
            <input className="input" value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="label">Subject *</label>
              <select className="input" value={form.subject_id || ''} onChange={e => {
                const sid = e.target.value;
                const a = assignmentBySubject(sid);
                setForm(f => ({ ...f, subject_id: sid, class_id: a?.class_id || '', section_id: a?.section_id || '', session_id: a?.session_id || '' }));
              }}>
                <option value="">Select…</option>
                {[...new Map((me?.assignments || []).map(a => [a.subject_id, a])).values()]
                  .map(a => <option key={a.subject_id} value={a.subject_id}>{a.subject}</option>)}
              </select>
            </div>
            <div>
              <label className="label">File URL</label>
              <input className="input" value={form.file_url || ''} onChange={e => setForm(f => ({ ...f, file_url: e.target.value }))} placeholder="/recordings/…" />
            </div>
            <div>
              <label className="label">Duration (min)</label>
              <input type="number" className="input" value={form.duration_min || ''} onChange={e => setForm(f => ({ ...f, duration_min: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea rows={3} className="input" value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
        </div>
      </Modal>

      <Modal open={modal === 'live-create'} onClose={() => setModal(null)} title="Schedule live class"
             footer={<>
               <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
               <button className="btn-primary" onClick={saveLiveClass} disabled={submitting}>{submitting ? 'Saving…' : 'Schedule'}</button>
             </>}>
        <div className="space-y-3">
          <div>
            <label className="label">Title *</label>
            <input className="input" value={liveForm.title || ''} onChange={e => setLiveForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="label">Subject *</label>
              <select className="input" value={liveForm.subject_id || ''} onChange={e => {
                const sid = e.target.value;
                const a = assignmentBySubject(sid);
                setLiveForm(f => ({ ...f, subject_id: sid, class_id: a?.class_id || '', section_id: a?.section_id || '', session_id: a?.session_id || '' }));
              }}>
                <option value="">Select…</option>
                {[...new Map((me?.assignments || []).map(a => [a.subject_id, a])).values()]
                  .map(a => <option key={a.subject_id} value={a.subject_id}>{a.subject}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Starts at *</label>
              <input type="datetime-local" className="input" value={liveForm.starts_at || ''} onChange={e => setLiveForm(f => ({ ...f, starts_at: e.target.value }))} />
            </div>
            <div>
              <label className="label">Ends at</label>
              <input type="datetime-local" className="input" value={liveForm.ends_at || ''} onChange={e => setLiveForm(f => ({ ...f, ends_at: e.target.value }))} />
            </div>
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
        </div>
      </Modal>
    </div>
  );
}
