// Admin: Social media auto-posting settings.
// Four platforms supported (facebook, twitter, linkedin, instagram).
// All use OAuth access tokens (encrypted at rest). In dev, no real
// post is made — the broadcast endpoint just echoes what would have
// been sent.
import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';

const PLATFORMS = [
  { key: 'facebook',  label: 'Facebook',  hint: 'Page ID + page access token' },
  { key: 'twitter',   label: 'Twitter / X', hint: 'Bearer token (v2 API)' },
  { key: 'linkedin',  label: 'LinkedIn',  hint: 'Organization URN + access token' },
  { key: 'instagram', label: 'Instagram', hint: 'Business IG user id + access token' },
];

export default function SocialSettingsPage() {
  const [status, setStatus] = useState({ platforms: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(null); // platform being saved
  const [saved, setSaved] = useState(null);
  const [forms, setForms] = useState({});     // { platform: { is_enabled, page_or_handle, access_token } }
  const [originals, setOriginals] = useState({});
  const [broadcastText, setBroadcastText] = useState('');
  const [broadcastLink, setBroadcastLink] = useState('');
  const [broadcastResult, setBroadcastResult] = useState(null);
  const [broadcasting, setBroadcasting] = useState(false);

  useEffect(() => {
    api('/api/integrations/social/status').then(s => {
      setStatus(s);
      const f = {}; const o = {};
      for (const p of (s.platforms || [])) {
        f[p.platform] = { is_enabled: !!p.is_enabled, page_or_handle: p.page_or_handle || '', access_token: '' };
        o[p.platform] = { is_enabled: !!p.is_enabled, page_or_handle: p.page_or_handle || '', access_token: '' };
      }
      setForms(f); setOriginals(o);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  function set(platform, k, v) {
    setForms(f => ({ ...f, [platform]: { ...f[platform], [k]: v } }));
  }

  async function save(platform) {
    setSaving(platform); setError(null); setSaved(null);
    try {
      const body = { platform, ...forms[platform] };
      if (!body.access_token) delete body.access_token;
      await api('/api/integrations/social/settings', { method: 'PUT', body });
      setOriginals(o => ({ ...o, [platform]: { ...forms[platform], access_token: '' } }));
      setSaved(platform);
      setTimeout(() => setSaved(null), 3000);
      // Refresh status
      const s = await api('/api/integrations/social/status');
      setStatus(s);
    } catch (e) { setError(e.data?.error || e.message); }
    finally { setSaving(null); }
  }

  async function test(platform) {
    setError(null); setSaved(null);
    try {
      const r = await api('/api/integrations/social/test', {
        method: 'POST',
        body: { platform, text: 'Test post from School Platform.' },
      });
      setSaved({ platform, ok: r.ok, status: r.status, error: r.error });
      setTimeout(() => setSaved(null), 5000);
    } catch (e) { setError(e.data?.error || e.message); }
  }

  async function broadcast() {
    if (!broadcastText.trim()) { setError('Type something to post.'); return; }
    setBroadcasting(true); setError(null); setBroadcastResult(null);
    try {
      const r = await api('/api/integrations/social/broadcast', {
        method: 'POST',
        body: { text: broadcastText, link: broadcastLink || undefined },
      });
      setBroadcastResult(r);
    } catch (e) { setError(e.data?.error || e.message); }
    finally { setBroadcasting(false); }
  }

  if (loading) return <p className="text-slate-500">Loading…</p>;

  return (
    <div className="space-y-5 max-w-4xl">
      <header>
        <h1 className="text-2xl font-semibold">Social media auto-posting</h1>
        <p className="text-slate-500 text-sm">Publish announcements to Facebook, Twitter/X, LinkedIn and Instagram. Access tokens are encrypted at rest.</p>
      </header>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="grid lg:grid-cols-2 gap-4">
        {PLATFORMS.map(p => {
          const f = forms[p.key] || { is_enabled: false, page_or_handle: '', access_token: '' };
          const o = originals[p.key] || { is_enabled: false, page_or_handle: '', access_token: '' };
          const dirty = JSON.stringify({ ...f, access_token: '' }) !== JSON.stringify({ ...o, access_token: '' });
          return (
            <div key={p.key} className="card">
              <div className="card-body space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{p.label}</div>
                    <div className="text-xs text-slate-500">{p.hint}</div>
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={!!f.is_enabled}
                           onChange={e => set(p.key, 'is_enabled', e.target.checked)} />
                    Enabled
                  </label>
                </div>
                <div>
                  <label className="label">Page ID / handle / org URN</label>
                  <input className="input" value={f.page_or_handle || ''}
                         onChange={e => set(p.key, 'page_or_handle', e.target.value)} />
                </div>
                <div>
                  <label className="label">{o.access_token ? 'New access token (blank to keep)' : 'Access token'}</label>
                  <input type="password" className="input" value={f.access_token || ''}
                         onChange={e => set(p.key, 'access_token', e.target.value)} />
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => test(p.key)} className="btn-secondary text-sm" disabled={!f.is_enabled}>Test</button>
                  <button onClick={() => save(p.key)} className="btn-primary text-sm" disabled={saving === p.key || !dirty}>
                    {saving === p.key ? 'Saving…' : 'Save'}
                  </button>
                </div>
                {saved === p.key && <div className="text-xs text-emerald-700">✓ Saved.</div>}
                {saved && saved.platform === p.key && !saved.ok && (
                  <div className="text-xs text-red-700">Test failed: {saved.error || saved.status}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <section className="card">
        <div className="card-body space-y-3">
          <h2 className="font-semibold">Manual broadcast</h2>
          <p className="text-sm text-slate-500">Posts the same text (and optional link) to all enabled platforms in one shot.</p>
          <div>
            <label className="label">Message</label>
            <textarea className="input" rows={3} value={broadcastText} onChange={e => setBroadcastText(e.target.value)}
                      placeholder="School closed on Monday for the public holiday. Classes resume Tuesday." />
          </div>
          <div>
            <label className="label">Link (optional)</label>
            <input className="input" value={broadcastLink} onChange={e => setBroadcastLink(e.target.value)}
                   placeholder="https://school.test/news/…" />
          </div>
          <div className="flex justify-end">
            <button onClick={broadcast} disabled={broadcasting} className="btn-primary">
              {broadcasting ? 'Posting…' : 'Broadcast to enabled platforms'}
            </button>
          </div>
          {broadcastResult && (
            <div className="text-xs space-y-1">
              {Object.entries(broadcastResult.results || {}).map(([plat, r]) => (
                <div key={plat} className={r.ok ? 'text-emerald-700' : 'text-red-700'}>
                  {plat}: {r.ok ? `✓ ${r.status}` : `✗ ${r.status} ${r.error || ''}`}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
