// Notifications admin (Phase 7) — create + view in-app feed.
import { useEffect, useState } from 'react';
import Modal from '../../components/Modal.jsx';
import { api } from '../../lib/api.js';

const AUDIENCES = [
  { value: 'all', label: 'Everyone' },
  { value: 'students', label: 'Students' },
  { value: 'teachers', label: 'Teachers' },
  { value: 'parents', label: 'Parents' },
  { value: 'staff', label: 'Staff (coordinator/accountant/operator)' },
];
const CHANNELS = [
  { value: 'inapp', label: 'In-app' },
  { value: 'email', label: 'Email (if SMTP enabled)' },
  { value: 'sms',   label: 'SMS (if provider configured)' },
];
const CATEGORIES = ['announcement','academic','fee','event','emergency'];
const blank = { title: '', body: '', audience: 'all', channel: 'inapp', category: 'announcement' };

export default function NotificationsAdminPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(blank);
  const [submitting, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [flags, setFlags] = useState({ email_enabled: false, sms_enabled: false });

  function load() {
    setLoading(true);
    api('/api/notifications').then(d => { setItems(d.items); setFlags({ email_enabled: !!d.email_enabled, sms_enabled: !!d.sms_enabled }); }).finally(() => setLoading(false));
  }
  useEffect(load, []);

  function openCreate() { setForm(blank); setModal('create'); setError(null); }
  async function save() {
    setSaving(true); setError(null);
    try {
      await api('/api/notifications', { method: 'POST', body: form });
      setModal(null); load();
    } catch (e) { setError(e.data?.error || e.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Notifications</h1>
          <p className="text-slate-500">Send announcements to roles / audiences. Email &amp; SMS dispatch are feature-flagged via env vars.</p>
        </div>
        <button onClick={openCreate} className="btn-primary text-sm">+ New notification</button>
      </header>

      <div className="flex gap-2 text-xs">
        <span className={'px-2 py-1 rounded ' + (flags.email_enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500')}>
          Email dispatch: {flags.email_enabled ? 'ENABLED' : 'stub'}
        </span>
        <span className={'px-2 py-1 rounded ' + (flags.sms_enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500')}>
          SMS dispatch: {flags.sms_enabled ? 'ENABLED' : 'stub'}
        </span>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500 text-xs uppercase">
            <tr><th className="px-3 py-2">Title</th><th>Audience</th><th>Category</th><th>Channel</th><th>Created</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">Loading…</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">No notifications yet.</td></tr>}
            {items.map(n => (
              <tr key={n.id} className="border-t border-slate-200">
                <td className="px-3 py-2">
                  <div className="font-medium">{n.title}</div>
                  <div className="text-xs text-slate-500 line-clamp-1">{n.body}</div>
                </td>
                <td className="px-3 py-2 text-xs">{n.audience}</td>
                <td className="px-3 py-2"><span className="text-xs px-2 py-0.5 rounded bg-slate-100">{n.category}</span></td>
                <td className="px-3 py-2 text-xs">{n.channel}</td>
                <td className="px-3 py-2 text-xs text-slate-500">{new Date(n.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title="New notification"
             footer={<>
               <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
               <button className="btn-primary" onClick={save} disabled={submitting}>{submitting ? 'Sending…' : 'Send'}</button>
             </>}>
        <div className="space-y-3">
          <div>
            <label className="label">Title *</label>
            <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <label className="label">Body *</label>
            <textarea rows={4} className="input" value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} />
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="label">Audience</label>
              <select className="input" value={form.audience} onChange={e => setForm(f => ({ ...f, audience: e.target.value }))}>
                {AUDIENCES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Channel</label>
              <select className="input" value={form.channel} onChange={e => setForm(f => ({ ...f, channel: e.target.value }))}>
                {CHANNELS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
        </div>
      </Modal>
    </div>
  );
}
