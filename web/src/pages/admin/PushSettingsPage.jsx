// Admin: Web Push settings — view VAPID config, regenerate keys, toggle
// push notifications, and see active subscription counts. Push payload
// delivery itself is wired through the notifications system when channel='push'.
import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';

export default function PushSettingsPage() {
  const [cfg, setCfg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    api('/api/push/settings').then(setCfg).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  async function save(fields) {
    setSaving(true); setError(null); setSaved(false); setTestResult(null);
    try {
      await api('/api/push/settings', { method: 'PUT', body: fields });
      const fresh = await api('/api/push/settings');
      setCfg(fresh);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { setError(e.data?.error || e.message); }
    finally { setSaving(false); }
  }

  async function regenerate() {
    if (!confirm('Regenerating VAPID keys will invalidate existing push subscriptions — every user will need to re-subscribe. Continue?')) return;
    await save({ regenerate_keys: true });
  }

  async function sendTest() {
    setTesting(true); setError(null); setTestResult(null);
    try {
      const r = await api('/api/push/test', { method: 'POST' });
      setTestResult(r);
    } catch (e) { setError(e.data?.error || e.message); }
    finally { setTesting(false); }
  }

  if (loading) return <p className="text-slate-500">Loading…</p>;
  if (!cfg) return <p className="text-red-700">{error || 'Could not load push settings.'}</p>;

  return (
    <div className="space-y-5 max-w-3xl">
      <header>
        <h1 className="text-2xl font-semibold">Push notifications</h1>
        <p className="text-slate-500 text-sm">
          VAPID keys for Web Push. Generated server-side; private key is encrypted at rest.
          {cfg.has_private_key
            ? <span className="ml-2 text-emerald-700">● keys configured</span>
            : <span className="ml-2 text-amber-700">○ no keys yet</span>}
        </p>
      </header>

      <div className="card">
        <div className="card-body space-y-3">
          <div>
            <label className="label">VAPID subject (mailto: or https:// URL)</label>
            <input className="input" defaultValue={cfg.vapid_subject || ''}
                   onBlur={e => e.target.value !== cfg.vapid_subject && save({ vapid_subject: e.target.value })} />
          </div>
          <div>
            <label className="label">VAPID public key</label>
            <textarea className="input font-mono text-xs" rows={3} readOnly value={cfg.vapid_public_key || '— not generated —'} />
            <p className="text-xs text-slate-500 mt-1">Shared with the browser when subscribing. Public, safe to expose.</p>
          </div>
          <label className="inline-flex items-center gap-2 pt-2 border-t border-slate-200">
            <input type="checkbox" checked={!!cfg.is_enabled}
                   onChange={e => save({ is_enabled: e.target.checked })} />
            Enable push notifications
          </label>
          {error && <div className="text-sm text-red-600">Could not save: {error}</div>}
          {saved && <div className="text-sm text-emerald-700">✓ Saved.</div>}
          <div className="flex justify-end gap-2">
            <button onClick={sendTest} disabled={testing || !cfg.is_enabled || !cfg.has_private_key} className="btn-secondary text-sm">
              {testing ? 'Sending…' : 'Send test to me'}
            </button>
            <button onClick={regenerate} disabled={saving} className="btn-secondary text-sm">Regenerate keys</button>
          </div>
          {testResult && (
            <div className={'text-sm rounded p-2 ' + (testResult.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800')}>
              <div className="font-semibold">{testResult.ok ? '✓ Sent' : '⚠ ' + (testResult.note || 'Done')}</div>
              {testResult.endpoints != null && <div className="text-xs">Subscriptions reached: {testResult.endpoints}</div>}
              {testResult.queued != null && <div className="text-xs">Queued: {testResult.queued}</div>}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-body text-sm space-y-2">
          <h2 className="font-semibold">Status</h2>
          <div className="flex justify-between"><span className="text-slate-500">Active subscriptions</span><span className="font-mono">{cfg.active_subscriptions ?? 0}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Last updated</span><span>{cfg.updated_at ? new Date(cfg.updated_at).toLocaleString() : '—'}</span></div>
          <p className="text-xs text-slate-500 pt-2 border-t border-slate-200">
            Note: actual push delivery uses VAPID-signed POST requests to each
            subscriber&apos;s endpoint. The current build logs the intended send
            to <code>integration_send_log</code>; to actually deliver, drop in
            the <code>web-push</code> npm package and replace the body of
            <code>sendToUser()</code> in <code>routes/push.js</code>.
          </p>
        </div>
      </div>
    </div>
  );
}
