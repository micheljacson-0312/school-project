import { useEffect, useState } from 'react';
import Modal from '../../components/Modal.jsx';
import { api } from '../../lib/api.js';

export default function SubjectsPage() {
  const [items, setItems] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  function load() {
    setLoading(true);
    Promise.all([api('/api/admin/academic/subjects'), api('/api/admin/academic/classes')])
      .then(([s, c]) => { setItems(s.items); setClasses(c.items); })
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  function openCreate() { setForm({ class_id: '', name: '', code: '', is_optional: false }); setModal('create'); setError(null); }
  function openEdit(it) { setForm({ class_id: it.class_id, name: it.name, code: it.code || '', is_optional: !!it.is_optional }); setModal({ id: it.id }); setError(null); }
  async function save() {
    setSubmitting(true); setError(null);
    try {
      const body = { class_id: Number(form.class_id), name: form.name, code: form.code, is_optional: !!form.is_optional };
      if (modal === 'create') await api('/api/admin/academic/subjects', { method: 'POST', body });
      else await api(`/api/admin/academic/subjects/${modal.id}`, { method: 'PUT', body });
      setModal(null); load();
    } catch (e) { setError(e.data?.error || e.message); }
    finally { setSubmitting(false); }
  }
  async function remove(it) {
    if (!confirm(`Delete subject "${it.name}" for ${it.class_name}?`)) return;
    await api(`/api/admin/academic/subjects/${it.id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Subjects</h1>
          <p className="text-slate-500">Subjects offered by each class.</p>
        </div>
        <button onClick={openCreate} className="btn-primary text-sm">+ New subject</button>
      </header>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500 text-xs uppercase">
            <tr><th className="px-3 py-2">Class</th><th>Name</th><th>Code</th><th>Optional</th><th className="text-right">Actions</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">Loading…</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">No subjects yet.</td></tr>}
            {items.map(s => (
              <tr key={s.id} className="border-t border-slate-200 hover:bg-slate-50">
                <td className="px-3 py-2">{s.class_name}</td>
                <td className="px-3 py-2 font-medium">{s.name}</td>
                <td className="px-3 py-2 text-slate-500">{s.code || '—'}</td>
                <td className="px-3 py-2">{s.is_optional ? <span className="text-amber-700">Yes</span> : 'No'}</td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <button onClick={() => openEdit(s)} className="text-xs text-brand-700 hover:underline mr-3">Edit</button>
                  <button onClick={() => remove(s)} className="text-xs text-red-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)}
             title={modal === 'create' ? 'New subject' : 'Edit subject'}
             footer={<>
               <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
               <button className="btn-primary" onClick={save} disabled={submitting}>{submitting ? 'Saving…' : 'Save'}</button>
             </>}>
        <div className="space-y-3">
          <div>
            <label className="label">Class *</label>
            <select className="input" value={form.class_id || ''} onChange={e => setForm(f => ({ ...f, class_id: e.target.value }))}>
              <option value="">Select…</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Subject name *</label>
            <input className="input" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Code</label>
            <input className="input" value={form.code || ''} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!form.is_optional} onChange={e => setForm(f => ({ ...f, is_optional: e.target.checked }))} />
            Optional subject
          </label>
          {error && <div className="text-sm text-red-600">Could not save: {error}</div>}
        </div>
      </Modal>
    </div>
  );
}
