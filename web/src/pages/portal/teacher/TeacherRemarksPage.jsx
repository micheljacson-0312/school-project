import { useEffect, useState } from 'react';
import Modal from '../../../components/Modal.jsx';
import { api } from '../../../lib/api.js';

const CATS = ['behavior','performance','general','commendation'];

export default function TeacherRemarksPage() {
  const [items, setItems] = useState([]);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ student_id: '', category: 'general', body: '', is_visible_to_parent: true });
  const [roster, setRoster] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  function load() {
    setLoading(true);
    Promise.all([api('/api/teacher/remarks'), api('/api/teacher/dashboard')])
      .then(([r, d]) => { setItems(r.items); setMe(d); }).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function openCreate() {
    setError(null);
    setForm({ student_id: '', category: 'general', body: '', is_visible_to_parent: true });
    setRoster([]);
    setModal('create');
  }
  async function loadRoster(class_id, section_id) {
    const r = await api(`/api/teacher/roster?class_id=${class_id}&section_id=${section_id}`);
    setRoster(r.items);
  }

  async function save() {
    setSubmitting(true); setError(null);
    try {
      await api('/api/teacher/remarks', { method: 'POST', body: { ...form, student_id: Number(form.student_id) } });
      setModal(null); load();
    } catch (e) { setError(e.data?.error || e.message); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Remarks</h1>
          <p className="text-slate-500">Notes about students. Visible in student/parent portals.</p>
        </div>
        <button onClick={openCreate} className="btn-primary text-sm">+ New remark</button>
      </header>

      <ul className="space-y-3">
        {loading && <p className="text-slate-500">Loading…</p>}
        {!loading && items.length === 0 && <p className="text-slate-500 text-sm">No remarks yet.</p>}
        {items.map(r => (
          <li key={r.id} className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div className="text-xs">
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 mr-2">{r.category}</span>
                  <span className="text-slate-500">{new Date(r.created_at).toLocaleString()} · {r.author_name}</span>
                </div>
                {!r.is_visible_to_parent && <span className="text-xs text-amber-700">Not visible to parent</span>}
              </div>
              <p className="mt-2 text-slate-700">{r.body}</p>
              <div className="text-xs text-slate-500 mt-2">Adm. {r.admission_no} · {r.class_name}/{r.section_name}</div>
            </div>
          </li>
        ))}
      </ul>

      <Modal open={modal === 'create'} onClose={() => setModal(null)} title="New remark"
             footer={<>
               <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
               <button className="btn-primary" onClick={save} disabled={submitting || !form.student_id || !form.body}>{submitting ? 'Saving…' : 'Save'}</button>
             </>}>
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Class</label>
              <select className="input" onChange={e => {
                const c = me?.assignments?.find(a => String(a.class_id) === String(e.target.value));
                setForm(f => ({ ...f, student_id: '' }));
                if (c) loadRoster(c.class_id, c.section_id);
              }}>
                <option value="">Select…</option>
                {[...new Map((me?.assignments || []).map(a => [a.class_id, a])).values()].map(c => <option key={c.class_id} value={c.class_id}>{c.class_name}/{c.section}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Student *</label>
              <select className="input" value={form.student_id} onChange={e => setForm(f => ({ ...f, student_id: e.target.value }))} disabled={!roster.length}>
                <option value="">Select…</option>
                {roster.map(s => <option key={s.student_id} value={s.student_id}>{s.full_name} ({s.admission_no})</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Category</label>
            <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {CATS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Body *</label>
            <textarea rows={5} className="input" value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_visible_to_parent} onChange={e => setForm(f => ({ ...f, is_visible_to_parent: e.target.checked }))} />
            Visible to parents
          </label>
          {error && <div className="text-sm text-red-600">{error}</div>}
        </div>
      </Modal>
    </div>
  );
}
