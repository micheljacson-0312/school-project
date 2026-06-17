import { useEffect, useState } from 'react';
import Modal from '../../components/Modal.jsx';
import { SmartImage } from '../../components/Placeholder.jsx';
import { api } from '../../lib/api.js';

const blank = { title: '', subtitle: '', image_url: '', cta_label: '', cta_href: '', position: 0, is_active: true };

export default function SlidesAdminPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(blank);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  function load() {
    setLoading(true);
    api('/api/admin/slides').then(d => setItems(d.items)).finally(() => setLoading(false));
  }
  useEffect(load, []);

  function openCreate() { setForm(blank); setModal('create'); setError(null); }
  function openEdit(it) { setForm({ ...blank, ...it }); setModal({ id: it.id }); setError(null); }
  async function save() {
    setSubmitting(true); setError(null);
    try {
      const body = { ...form };
      if (!body.image_url) delete body.image_url;
      if (!body.subtitle) delete body.subtitle;
      if (!body.cta_label) delete body.cta_label;
      if (!body.cta_href) delete body.cta_href;
      if (modal === 'create') await api('/api/admin/slides', { method: 'POST', body });
      else await api(`/api/admin/slides/${modal.id}`, { method: 'PUT', body });
      setModal(null); load();
    } catch (e) { setError(e.data?.error || e.message); }
    finally { setSubmitting(false); }
  }
  async function remove(it) {
    if (!confirm(`Delete slide "${it.title}"?`)) return;
    await api(`/api/admin/slides/${it.id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Homepage carousel</h1>
          <p className="text-slate-500">Slides shown at the top of the public homepage. Position controls order.</p>
        </div>
        <button onClick={openCreate} className="btn-primary text-sm">+ New slide</button>
      </header>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && <p className="text-slate-500 col-span-full text-center py-8">Loading…</p>}
        {!loading && items.length === 0 && <p className="text-slate-500 col-span-full text-center py-8">No slides yet.</p>}
        {items.map(s => (
          <div key={s.id} className="card overflow-hidden">
            <SmartImage src={s.image_url} label={s.title} aspect="16/9" rounded="rounded-none" />
            <div className="card-body">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Position #{s.position}</span>
                <span className={'text-xs px-2 py-0.5 rounded ' + (s.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600')}>
                  {s.is_active ? 'Active' : 'Hidden'}
                </span>
              </div>
              <div className="font-semibold mt-1">{s.title}</div>
              {s.subtitle && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{s.subtitle}</p>}
              <div className="flex justify-between mt-3">
                <button onClick={() => openEdit(s)} className="text-xs text-brand-700 hover:underline">Edit</button>
                <button onClick={() => remove(s)} className="text-xs text-red-600 hover:underline">Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)}
             title={modal === 'create' ? 'New slide' : 'Edit slide'}
             footer={<>
               <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
               <button className="btn-primary" onClick={save} disabled={submitting}>{submitting ? 'Saving…' : 'Save'}</button>
             </>}>
        <div className="space-y-3">
          <div>
            <label className="label">Title *</label>
            <input className="input" value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <label className="label">Subtitle</label>
            <input className="input" value={form.subtitle || ''} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} />
          </div>
          <div>
            <label className="label">Image URL</label>
            <input className="input" value={form.image_url || ''} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="/images/hero/…" />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label">CTA label</label>
              <input className="input" value={form.cta_label || ''} onChange={e => setForm(f => ({ ...f, cta_label: e.target.value }))} />
            </div>
            <div>
              <label className="label">CTA link</label>
              <input className="input" value={form.cta_href || ''} onChange={e => setForm(f => ({ ...f, cta_href: e.target.value }))} placeholder="/admissions" />
            </div>
            <div>
              <label className="label">Position</label>
              <input type="number" className="input" value={form.position || 0} onChange={e => setForm(f => ({ ...f, position: Number(e.target.value) }))} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
            Active (visible on the public homepage)
          </label>
          {error && <div className="text-sm text-red-600">Could not save: {error}</div>}
        </div>
      </Modal>
    </div>
  );
}
