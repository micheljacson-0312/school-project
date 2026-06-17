// Fee structures management (Phase 6) — accountant view.
// Re-uses the resource admin pattern with CRUD + dropdowns for class + session.
import { useEffect, useState } from 'react';
import Modal from '../../components/Modal.jsx';
import { api } from '../../lib/api.js';

const blank = { session_id: '', class_id: '', name: '', amount: 0, due_day: 10, is_active: true };

export default function FeeStructuresAdminPage() {
  const [items, setItems] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(blank);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  function load() {
    setLoading(true);
    Promise.all([
      api('/api/accountant/fee-structures'),
      api('/api/admin/academic/classes'),
      api('/api/admin/academic/sessions'),
    ]).then(([fs, c, s]) => { setItems(fs.items); setClasses(c.items); setSessions(s.items); })
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  function openCreate() { setForm(blank); setModal('create'); setError(null); }
  function openEdit(s) {
    setForm({ session_id: s.session_id, class_id: s.class_id, name: s.name, amount: Number(s.amount), due_day: s.due_day, is_active: !!s.is_active });
    setModal({ id: s.id });
    setError(null);
  }
  async function save() {
    setSubmitting(true); setError(null);
    try {
      const body = { ...form, session_id: Number(form.session_id), class_id: Number(form.class_id), amount: Number(form.amount), due_day: Number(form.due_day) };
      if (modal === 'create') await api('/api/accountant/fee-structures', { method: 'POST', body });
      else await api(`/api/accountant/fee-structures/${modal.id}`, { method: 'PUT', body });
      setModal(null); load();
    } catch (e) { setError(e.data?.error || e.message); }
    finally { setSubmitting(false); }
  }
  async function remove(s) {
    if (!confirm(`Delete structure "${s.name}"?`)) return;
    await api(`/api/accountant/fee-structures/${s.id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Fee structures</h1>
          <p className="text-slate-500">Per-class × session fee templates used when generating bills.</p>
        </div>
        <button onClick={openCreate} className="btn-primary text-sm">+ New structure</button>
      </header>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500 text-xs uppercase">
            <tr><th className="px-3 py-2">Name</th><th>Class</th><th>Session</th><th>Amount</th><th>Due day</th><th>Status</th><th className="text-right">Actions</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-500">Loading…</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-500">No structures.</td></tr>}
            {items.map(s => (
              <tr key={s.id} className="border-t border-slate-200">
                <td className="px-3 py-2 font-medium">{s.name}</td>
                <td className="px-3 py-2">{s.class_name}</td>
                <td className="px-3 py-2">{s.session_name}</td>
                <td className="px-3 py-2">PKR {Number(s.amount).toLocaleString()}</td>
                <td className="px-3 py-2">{s.due_day}</td>
                <td className="px-3 py-2">{s.is_active ? <span className="text-xs text-emerald-700">Active</span> : <span className="text-xs text-slate-500">Inactive</span>}</td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <button onClick={() => openEdit(s)} className="text-xs text-brand-700 hover:underline mr-3">Edit</button>
                  <button onClick={() => remove(s)} className="text-xs text-red-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'create' ? 'New fee structure' : 'Edit fee structure'}
             footer={<>
               <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
               <button className="btn-primary" onClick={save} disabled={submitting}>{submitting ? 'Saving…' : 'Save'}</button>
             </>}>
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Name *</label>
              <input className="input" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Monthly Tuition" />
            </div>
            <div>
              <label className="label">Amount (PKR) *</label>
              <input type="number" className="input" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div>
              <label className="label">Session *</label>
              <select className="input" value={form.session_id} onChange={e => setForm(f => ({ ...f, session_id: e.target.value }))}>
                <option value="">Select…</option>
                {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Class *</label>
              <select className="input" value={form.class_id} onChange={e => setForm(f => ({ ...f, class_id: e.target.value }))}>
                <option value="">Select…</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Due day (of month)</label>
              <input type="number" min={1} max={28} className="input" value={form.due_day} onChange={e => setForm(f => ({ ...f, due_day: e.target.value }))} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
            Active (visible for bill generation)
          </label>
          {error && <div className="text-sm text-red-600">{error}</div>}
        </div>
      </Modal>
    </div>
  );
}
