import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';

const blank = { principal_name: '', designation: '', photo_url: '', message_body: '', signature_url: '' };

export default function PrincipalAdminPage() {
  const [form, setForm] = useState(blank);
  const [original, setOriginal] = useState(blank);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api('/api/admin/principal-message').then(d => {
      const it = d.item || blank;
      setForm({ ...blank, ...it });
      setOriginal({ ...blank, ...it });
    }).finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true); setError(null); setSaved(false);
    try {
      await api('/api/admin/principal-message', { method: 'PUT', body: form });
      setOriginal(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { setError(e.data?.error || e.message); }
    finally { setSaving(false); }
  }

  function reset() { setForm(original); }

  const dirty = JSON.stringify(form) !== JSON.stringify(original);

  if (loading) return <p className="text-slate-500">Loading…</p>;
  return (
    <div className="space-y-5 max-w-3xl">
      <header>
        <h1 className="text-2xl font-semibold">Principal's message</h1>
        <p className="text-slate-500">Shown on the public homepage and About page.</p>
      </header>
      <form onSubmit={e => { e.preventDefault(); save(); }} className="card">
        <div className="card-body space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Name *</label>
              <input className="input" value={form.principal_name} onChange={e => setForm(f => ({ ...f, principal_name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Designation</label>
              <input className="input" value={form.designation || ''} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))} />
            </div>
            <div>
              <label className="label">Photo URL</label>
              <input className="input" value={form.photo_url || ''} onChange={e => setForm(f => ({ ...f, photo_url: e.target.value }))} />
            </div>
            <div>
              <label className="label">Signature URL</label>
              <input className="input" value={form.signature_url || ''} onChange={e => setForm(f => ({ ...f, signature_url: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Message body *</label>
            <textarea rows={10} className="input" value={form.message_body} onChange={e => setForm(f => ({ ...f, message_body: e.target.value }))} />
            <p className="text-xs text-slate-500 mt-1">Use blank lines to separate paragraphs. Plain text only.</p>
          </div>
          {error && <div className="text-sm text-red-600">Could not save: {error}</div>}
          {saved && <div className="text-sm text-emerald-700">✓ Saved.</div>}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={reset} disabled={!dirty}>Reset</button>
            <button className="btn-primary" disabled={saving || !dirty || !form.principal_name || !form.message_body}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
