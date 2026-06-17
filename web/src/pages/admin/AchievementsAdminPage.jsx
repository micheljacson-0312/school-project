import { useEffect, useState } from 'react';
import Modal from '../../components/Modal.jsx';
import { api } from '../../lib/api.js';

const ICONS = [
  { value: 'trophy', label: '🏆 Trophy' },
  { value: 'medal',  label: '🥇 Medal' },
  { value: 'star',   label: '⭐ Star' },
  { value: 'book',   label: '📚 Book' },
  { value: 'flask',  label: '🧪 Flask' },
];

const blank = { year: new Date().getFullYear(), title: '', description: '', icon: 'trophy', position: 0, is_active: true };

export default function AchievementsAdminPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(blank);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  function load() {
    setLoading(true);
    api('/api/admin/achievements').then(d => setItems(d.items)).finally(() => setLoading(false));
  }
  useEffect(load, []);

  function openCreate() { setForm(blank); setModal('create'); setError(null); }
  function openEdit(it) { setForm({ ...blank, ...it }); setModal({ id: it.id }); setError(null); }
  async function save() {
    setSubmitting(true); setError(null);
    try {
      const body = { ...form, year: Number(form.year), position: Number(form.position || 0) };
      if (!body.description) delete body.description;
      if (modal === 'create') await api('/api/admin/achievements', { method: 'POST', body });
      else await api(`/api/admin/achievements/${modal.id}`, { method: 'PUT', body });
      setModal(null); load();
    } catch (e) { setError(e.data?.error || e.message); }
    finally { setSubmitting(false); }
  }
  async function remove(it) {
    if (!confirm(`Delete "${it.title}"?`)) return;
    await api(`/api/admin/achievements/${it.id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Achievements</h1>
          <p className="text-slate-500">Highlights shown on the homepage and About page.</p>
        </div>
        <button onClick={openCreate} className="btn-primary text-sm">+ New achievement</button>
      </header>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500 text-xs uppercase">
            <tr><th className="px-3 py-2">Year</th><th>Title</th><th>Icon</th><th>Position</th><th>Status</th><th className="text-right">Actions</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">Loading…</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">Nothing yet.</td></tr>}
            {items.map(a => (
              <tr key={a.id} className="border-t border-slate-200 hover:bg-slate-50">
                <td className="px-3 py-2 font-medium">{a.year}</td>
                <td className="px-3 py-2">{a.title}</td>
                <td className="px-3 py-2">{ICONS.find(i => i.value === a.icon)?.label || a.icon}</td>
                <td className="px-3 py-2">{a.position}</td>
                <td className="px-3 py-2">{a.is_active ? <span className="text-emerald-700">Active</span> : 'Hidden'}</td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <button onClick={() => openEdit(a)} className="text-xs text-brand-700 hover:underline mr-3">Edit</button>
                  <button onClick={() => remove(a)} className="text-xs text-red-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)}
             title={modal === 'create' ? 'New achievement' : 'Edit achievement'}
             footer={<>
               <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
               <button className="btn-primary" onClick={save} disabled={submitting}>{submitting ? 'Saving…' : 'Save'}</button>
             </>}>
        <div className="space-y-3">
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="label">Year *</label>
              <input type="number" className="input" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} />
            </div>
            <div>
              <label className="label">Icon</label>
              <select className="input" value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}>
                {ICONS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Position</label>
              <input type="number" className="input" value={form.position || 0} onChange={e => setForm(f => ({ ...f, position: Number(e.target.value) }))} />
            </div>
          </div>
          <div>
            <label className="label">Title *</label>
            <input className="input" value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea rows={3} className="input" value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
            Active
          </label>
          {error && <div className="text-sm text-red-600">Could not save: {error}</div>}
        </div>
      </Modal>
    </div>
  );
}
