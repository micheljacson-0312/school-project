import { useEffect, useState } from 'react';
import Modal from '../../components/Modal.jsx';
import { api } from '../../lib/api.js';

const blank = { type: 'news', title: '', slug: '', excerpt: '', body: '', cover_image: '', event_date: '', is_published: false };

export default function NewsAdminPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(blank);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  function load() {
    setLoading(true);
    api('/api/admin/news').then(d => setItems(d.items)).finally(() => setLoading(false));
  }
  useEffect(load, []);

  function openCreate() { setForm(blank); setModal('create'); setError(null); }
  function openEdit(it) { setForm({ ...blank, ...it, cover_image: it.cover_image || '', event_date: it.event_date?.slice(0,10) || '' }); setModal({ id: it.id }); setError(null); }
  async function save() {
    setSubmitting(true); setError(null);
    try {
      const body = { ...form };
      if (!body.event_date) delete body.event_date;
      if (!body.cover_image) delete body.cover_image;
      if (modal === 'create') await api('/api/admin/news', { method: 'POST', body });
      else await api(`/api/admin/news/${modal.id}`, { method: 'PUT', body });
      setModal(null); load();
    } catch (e) { setError(e.data?.error || e.message); }
    finally { setSubmitting(false); }
  }
  async function remove(it) {
    if (!confirm(`Delete "${it.title}"?`)) return;
    await api(`/api/admin/news/${it.id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">News & events</h1>
          <p className="text-slate-500">Articles appear on the public News & Events page.</p>
        </div>
        <button onClick={openCreate} className="btn-primary text-sm">+ New article</button>
      </header>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500 text-xs uppercase">
            <tr><th className="px-3 py-2">Type</th><th>Title</th><th>Slug</th><th>Status</th><th>Updated</th><th className="text-right">Actions</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">Loading…</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">No articles.</td></tr>}
            {items.map(n => (
              <tr key={n.id} className="border-t border-slate-200 hover:bg-slate-50">
                <td className="px-3 py-2">
                  <span className={'text-xs px-2 py-0.5 rounded ' + (n.type === 'event' ? 'bg-purple-100 text-purple-700' : 'bg-brand-100 text-brand-700')}>
                    {n.type}
                  </span>
                </td>
                <td className="px-3 py-2 font-medium">{n.title}</td>
                <td className="px-3 py-2 text-slate-500">{n.slug}</td>
                <td className="px-3 py-2">
                  <span className={'text-xs px-2 py-0.5 rounded ' + (n.is_published ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600')}>
                    {n.is_published ? 'Published' : 'Draft'}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs text-slate-500">
                  {n.published_at ? new Date(n.published_at).toLocaleDateString() : '—'}
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <button onClick={() => openEdit(n)} className="text-xs text-brand-700 hover:underline mr-3">Edit</button>
                  <button onClick={() => remove(n)} className="text-xs text-red-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)}
             title={modal === 'create' ? 'New article' : 'Edit article'}
             size="lg"
             footer={<>
               <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
               <button className="btn-primary" onClick={save} disabled={submitting}>{submitting ? 'Saving…' : 'Save'}</button>
             </>}>
        <div className="space-y-3">
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="label">Type *</label>
              <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="news">News</option>
                <option value="event">Event</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Title *</label>
              <input className="input" value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value, slug: f.slug || e.target.value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') }))} />
            </div>
            <div>
              <label className="label">Slug *</label>
              <input className="input" value={form.slug || ''} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Cover image URL</label>
              <input className="input" value={form.cover_image || ''} onChange={e => setForm(f => ({ ...f, cover_image: e.target.value }))} placeholder="/images/news/…" />
            </div>
            {form.type === 'event' && (
              <div>
                <label className="label">Event date</label>
                <input type="date" className="input" value={form.event_date || ''} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} />
              </div>
            )}
            <div className="sm:col-span-2">
              <label className="label">Excerpt</label>
              <input className="input" value={form.excerpt || ''} onChange={e => setForm(f => ({ ...f, excerpt: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Body (HTML allowed)</label>
            <textarea rows={6} className="input" value={form.body || ''} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!form.is_published} onChange={e => setForm(f => ({ ...f, is_published: e.target.checked }))} />
            Published (visible on the public site)
          </label>
          {error && <div className="text-sm text-red-600">Could not save: {error}</div>}
        </div>
      </Modal>
    </div>
  );
}
