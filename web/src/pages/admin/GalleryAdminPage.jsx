import { useEffect, useState } from 'react';
import Modal from '../../components/Modal.jsx';
import { SmartImage } from '../../components/Placeholder.jsx';
import { api } from '../../lib/api.js';

const blank = { category: '', caption: '', media_url: '', media_type: 'image', taken_on: '', is_published: true };

export default function GalleryAdminPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(blank);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  function load() {
    setLoading(true);
    api('/api/admin/gallery').then(d => setItems(d.items)).finally(() => setLoading(false));
  }
  useEffect(load, []);

  function openCreate() { setForm(blank); setModal('create'); setError(null); }
  function openEdit(it) { setForm({ ...blank, ...it, taken_on: it.taken_on?.slice(0,10) || '' }); setModal({ id: it.id }); setError(null); }
  async function save() {
    setSubmitting(true); setError(null);
    try {
      const body = { ...form };
      if (!body.taken_on) delete body.taken_on;
      if (!body.category) delete body.category;
      if (!body.caption) delete body.caption;
      if (modal === 'create') await api('/api/admin/gallery', { method: 'POST', body });
      // No PUT endpoint for gallery — only delete + create
      setModal(null); load();
    } catch (e) { setError(e.data?.error || e.message); }
    finally { setSubmitting(false); }
  }
  async function remove(it) {
    if (!confirm(`Delete "${it.caption || it.category}"?`)) return;
    await api(`/api/admin/gallery/${it.id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Gallery</h1>
          <p className="text-slate-500">Images shown on the public Gallery page. Upload via URL for now; bulk upload coming in a later phase.</p>
        </div>
        <button onClick={openCreate} className="btn-primary text-sm">+ New image</button>
      </header>

      <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {loading && <p className="text-slate-500 col-span-full text-center py-8">Loading…</p>}
        {!loading && items.length === 0 && <p className="text-slate-500 col-span-full text-center py-8">No images yet.</p>}
        {items.map(g => (
          <div key={g.id} className="card overflow-hidden">
            <SmartImage src={g.media_url} label={g.caption || g.category} aspect="4/3" rounded="rounded-none" />
            <div className="card-body">
              <div className="font-medium text-sm">{g.caption || '—'}</div>
              <div className="text-xs text-slate-500">{g.category} · {g.taken_on?.slice(0,10) || ''}</div>
              <div className="flex justify-between mt-3">
                <button onClick={() => openEdit(g)} className="text-xs text-brand-700 hover:underline">Edit</button>
                <button onClick={() => remove(g)} className="text-xs text-red-600 hover:underline">Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)}
             title={modal === 'create' ? 'New gallery image' : 'Edit gallery image'}
             footer={<>
               <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
               <button className="btn-primary" onClick={save} disabled={submitting}>{submitting ? 'Saving…' : 'Save'}</button>
             </>}>
        <div className="space-y-3">
          <div>
            <label className="label">Image URL *</label>
            <input className="input" value={form.media_url || ''} onChange={e => setForm(f => ({ ...f, media_url: e.target.value }))} placeholder="/images/gallery/…" />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Category</label>
              <input className="input" value={form.category || ''} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="campus, sports, academics, events" />
            </div>
            <div>
              <label className="label">Taken on</label>
              <input type="date" className="input" value={form.taken_on || ''} onChange={e => setForm(f => ({ ...f, taken_on: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Caption</label>
            <input className="input" value={form.caption || ''} onChange={e => setForm(f => ({ ...f, caption: e.target.value }))} />
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
