// Admin: manage homepage announcements (short time-sensitive notices).
// Reuses the notifications.create / notifications.view permissions.
import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';

const initial = {
  title: '', body: '', link_label: '', link_href: '',
  severity: 'info', starts_at: '', ends_at: '', is_active: true,
};

const SEVERITY_COLORS = {
  info:    'bg-sky-100 text-sky-800',
  success: 'bg-emerald-100 text-emerald-800',
  warning: 'bg-amber-100 text-amber-800',
  danger:  'bg-red-100 text-red-800',
};

export default function AnnouncementsAdminPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | 'new' | id
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const d = await api('/api/admin/announcements');
      setItems(d.items);
    } catch (e) {
      setError(e.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openNew() {
    setEditing('new');
    setForm(initial);
    setError(null);
  }
  function openEdit(a) {
    setEditing(a.id);
    setForm({
      title: a.title, body: a.body || '', link_label: a.link_label || '',
      link_href: a.link_href || '', severity: a.severity,
      starts_at: a.starts_at ? a.starts_at.slice(0, 16) : '',
      ends_at: a.ends_at ? a.ends_at.slice(0, 16) : '',
      is_active: !!a.is_active,
    });
    setError(null);
  }
  function cancel() { setEditing(null); setError(null); }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        // Convert empty datetime strings to null (server expects undefined or null).
        starts_at: form.starts_at || undefined,
        ends_at: form.ends_at || undefined,
      };
      if (editing === 'new') {
        await api('/api/admin/announcements', { method: 'POST', body: payload });
      } else {
        await api(`/api/admin/announcements/${editing}`, { method: 'PUT', body: payload });
      }
      setEditing(null);
      await load();
    } catch (err) {
      setError(err.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    if (!confirm('Delete this announcement?')) return;
    await api(`/api/admin/announcements/${id}`, { method: 'DELETE' });
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Announcements</h1>
          <p className="text-sm text-slate-500">Short time-sensitive notices shown on the homepage banner.</p>
        </div>
        <button onClick={openNew} className="btn-primary">+ New announcement</button>
      </div>

      {editing && (
        <form onSubmit={save} className="card">
          <div className="card-body space-y-3">
            <h2 className="text-lg font-semibold">{editing === 'new' ? 'Create announcement' : `Edit announcement #${editing}`}</h2>
            <div>
              <label className="label">Title *</label>
              <input className="input" required value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
            </div>
            <div>
              <label className="label">Body</label>
              <textarea className="input" rows={2} value={form.body} onChange={e => setForm({...form, body: e.target.value})} />
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="label">Severity</label>
                <select className="input" value={form.severity} onChange={e => setForm({...form, severity: e.target.value})}>
                  <option value="info">Info</option>
                  <option value="success">Success</option>
                  <option value="warning">Warning</option>
                  <option value="danger">Danger</option>
                </select>
              </div>
              <div>
                <label className="label">Starts at</label>
                <input className="input" type="datetime-local" value={form.starts_at} onChange={e => setForm({...form, starts_at: e.target.value})} />
              </div>
              <div>
                <label className="label">Ends at</label>
                <input className="input" type="datetime-local" value={form.ends_at} onChange={e => setForm({...form, ends_at: e.target.value})} />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Link label</label>
                <input className="input" value={form.link_label} onChange={e => setForm({...form, link_label: e.target.value})} placeholder="Read more" />
              </div>
              <div>
                <label className="label">Link URL</label>
                <input className="input" value={form.link_href} onChange={e => setForm({...form, link_href: e.target.value})} placeholder="/admissions" />
              </div>
            </div>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} />
              Active (visible on homepage)
            </label>
            {error && <div className="text-sm text-red-600">Could not save: {error}</div>}
            <div className="flex gap-2">
              <button className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
              <button type="button" onClick={cancel} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : items.length === 0 ? (
        <div className="card"><div className="card-body text-slate-600">No announcements yet.</div></div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="p-3">Title</th>
                <th className="p-3">Severity</th>
                <th className="p-3">Window</th>
                <th className="p-3">Active</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(a => (
                <tr key={a.id} className="border-t border-slate-100">
                  <td className="p-3">
                    <div className="font-medium">{a.title}</div>
                    {a.body && <div className="text-xs text-slate-500 line-clamp-1">{a.body}</div>}
                  </td>
                  <td className="p-3">
                    <span className={'text-xs px-2 py-1 rounded ' + (SEVERITY_COLORS[a.severity] || SEVERITY_COLORS.info)}>
                      {a.severity}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-slate-600">
                    {a.starts_at ? new Date(a.starts_at).toLocaleDateString() : '—'}
                    {' → '}
                    {a.ends_at ? new Date(a.ends_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="p-3">
                    <span className={a.is_active ? 'text-emerald-700' : 'text-slate-400'}>
                      {a.is_active ? '●' : '○'}
                    </span>
                  </td>
                  <td className="p-3 text-right space-x-2">
                    <button onClick={() => openEdit(a)} className="text-brand-700 hover:underline">Edit</button>
                    <button onClick={() => remove(a.id)} className="text-red-600 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
