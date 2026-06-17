import { useEffect, useState } from 'react';
import Modal from '../../components/Modal.jsx';
import { api } from '../../lib/api.js';

const blank = {
  title: '', department: '', location: 'On-campus',
  employment_type: 'full_time', description: '', requirements: '',
  salary_range: '', apply_deadline: '', is_published: false,
};

const TYPE_OPTIONS = [
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'contract',  label: 'Contract' },
  { value: 'visiting',  label: 'Visiting' },
  { value: 'internship', label: 'Internship' },
];

export default function JobsAdminPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(blank);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  function load() {
    setLoading(true);
    api('/api/admin/jobs').then(d => setItems(d.items)).finally(() => setLoading(false));
  }
  useEffect(load, []);

  function openCreate() { setForm(blank); setModal('create'); setError(null); }
  function openEdit(it) { setForm({ ...blank, ...it, apply_deadline: it.apply_deadline?.slice(0,10) || '' }); setModal({ id: it.id }); setError(null); }
  async function save() {
    setSubmitting(true); setError(null);
    try {
      const body = { ...form };
      if (!body.apply_deadline) delete body.apply_deadline;
      if (!body.department) delete body.department;
      if (!body.location) delete body.location;
      if (!body.salary_range) delete body.salary_range;
      if (!body.requirements) delete body.requirements;
      if (modal === 'create') await api('/api/admin/jobs', { method: 'POST', body });
      else await api(`/api/admin/jobs/${modal.id}`, { method: 'PUT', body });
      setModal(null); load();
    } catch (e) { setError(e.data?.error || e.message); }
    finally { setSubmitting(false); }
  }
  async function remove(it) {
    if (!confirm(`Delete "${it.title}"?`)) return;
    await api(`/api/admin/jobs/${it.id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Job postings</h1>
          <p className="text-slate-500">Open positions appear on the public Careers page.</p>
        </div>
        <button onClick={openCreate} className="btn-primary text-sm">+ New posting</button>
      </header>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500 text-xs uppercase">
            <tr><th className="px-3 py-2">Title</th><th>Department</th><th>Type</th><th>Deadline</th><th>Status</th><th className="text-right">Actions</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">Loading…</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">No postings.</td></tr>}
            {items.map(j => (
              <tr key={j.id} className="border-t border-slate-200 hover:bg-slate-50">
                <td className="px-3 py-2 font-medium">{j.title}</td>
                <td className="px-3 py-2">{j.department || '—'}</td>
                <td className="px-3 py-2">{TYPE_OPTIONS.find(t => t.value === j.employment_type)?.label || j.employment_type}</td>
                <td className="px-3 py-2 text-xs">{j.apply_deadline?.slice(0,10) || '—'}</td>
                <td className="px-3 py-2">
                  <span className={'text-xs px-2 py-0.5 rounded ' + (j.is_published ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600')}>
                    {j.is_published ? 'Published' : 'Draft'}
                  </span>
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <button onClick={() => openEdit(j)} className="text-xs text-brand-700 hover:underline mr-3">Edit</button>
                  <button onClick={() => remove(j)} className="text-xs text-red-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)}
             title={modal === 'create' ? 'New job posting' : 'Edit job posting'}
             size="lg"
             footer={<>
               <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
               <button className="btn-primary" onClick={save} disabled={submitting}>{submitting ? 'Saving…' : 'Save'}</button>
             </>}>
        <div className="space-y-3">
          <div>
            <label className="label">Title *</label>
            <input className="input" value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="label">Department</label>
              <input className="input" value={form.department || ''} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} />
            </div>
            <div>
              <label className="label">Location</label>
              <input className="input" value={form.location || ''} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
            </div>
            <div>
              <label className="label">Type</label>
              <select className="input" value={form.employment_type} onChange={e => setForm(f => ({ ...f, employment_type: e.target.value }))}>
                {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Salary range</label>
              <input className="input" value={form.salary_range || ''} onChange={e => setForm(f => ({ ...f, salary_range: e.target.value }))} placeholder="PKR 30,000 – 50,000 / month" />
            </div>
            <div>
              <label className="label">Apply deadline</label>
              <input type="date" className="input" value={form.apply_deadline || ''} onChange={e => setForm(f => ({ ...f, apply_deadline: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Description *</label>
            <textarea rows={4} className="input" value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <label className="label">Requirements</label>
            <textarea rows={3} className="input" value={form.requirements || ''} onChange={e => setForm(f => ({ ...f, requirements: e.target.value }))} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!form.is_published} onChange={e => setForm(f => ({ ...f, is_published: e.target.checked }))} />
            Published
          </label>
          {error && <div className="text-sm text-red-600">Could not save: {error}</div>}
        </div>
      </Modal>
    </div>
  );
}
