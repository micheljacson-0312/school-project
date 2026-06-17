// Alumni profile edit (Phase 7).
import { useEffect, useState } from 'react';
import { api } from '../../../lib/api.js';

export default function AlumniProfilePage() {
  const [form, setForm] = useState({ profession: '', organization: '', city: '', country: '', bio: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    api('/api/alumni/dashboard').then(d => {
      const p = d.profile || {};
      setForm({
        profession: p.profession || '',
        organization: p.organization || '',
        city: p.city || '',
        country: p.country || '',
        bio: p.bio || '',
      });
    }).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true); setError(null); setSaved(false);
    try {
      await api('/api/alumni/profile', { method: 'PUT', body: form });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { setError(e.data?.error || e.message); }
    finally { setSaving(false); }
  }

  if (loading) return <p className="text-slate-500">Loading…</p>;
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">My alumni profile</h1>
        <p className="text-slate-500">Keep your contact details and professional info up to date.</p>
      </header>
      <form onSubmit={e => { e.preventDefault(); save(); }} className="card"><div className="card-body space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Profession</label>
            <input className="input" value={form.profession} onChange={e => setForm(f => ({ ...f, profession: e.target.value }))} />
          </div>
          <div>
            <label className="label">Organization</label>
            <input className="input" value={form.organization} onChange={e => setForm(f => ({ ...f, organization: e.target.value }))} />
          </div>
          <div>
            <label className="label">City</label>
            <input className="input" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
          </div>
          <div>
            <label className="label">Country</label>
            <input className="input" value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} />
          </div>
        </div>
        <div>
          <label className="label">Bio</label>
          <textarea rows={4} className="input" value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} />
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        {saved && <div className="text-sm text-emerald-700">✓ Profile updated.</div>}
        <div className="flex justify-end">
          <button className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div></form>
    </div>
  );
}
