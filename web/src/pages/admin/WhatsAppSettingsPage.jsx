// Admin: WhatsApp integration settings + test send.
// Three providers:
//   - click_to_chat : generates a wa.me URL only (no backend send)
//   - meta_cloud    : Meta WhatsApp Cloud API (graph.facebook.com)
//   - twilio        : Twilio WhatsApp
import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';

const PROVIDERS = [
  { value: 'click_to_chat', label: 'Click-to-chat (wa.me URL only — no backend send)' },
  { value: 'meta_cloud',    label: 'Meta WhatsApp Cloud API' },
  { value: 'twilio',        label: 'Twilio (WhatsApp)' },
];

const blank = {
  provider: 'click_to_chat', is_enabled: false,
  phone_number_id: '', business_account_id: '',
  access_token: '', api_version: 'v18.0',
  account_sid: '', from_number: '',
};

export default function WhatsAppSettingsPage() {
  const [form, setForm] = useState(blank);
  const [original, setOriginal] = useState(blank);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const [testTo, setTestTo] = useState('');
  const [testMsg, setTestMsg] = useState('School Platform test WhatsApp');
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    api('/api/integrations/whatsapp/status').then(s => {
      setStatus(s);
      setForm({ ...blank, provider: s.provider, is_enabled: !!s.enabled,
                phone_number_id: s.phone_number_id || '' });
      setOriginal({ ...blank, provider: s.provider, is_enabled: !!s.enabled,
                    phone_number_id: s.phone_number_id || '' });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function save() {
    setSaving(true); setError(null); setSaved(false); setTestResult(null);
    try {
      const body = { ...form };
      if (!body.access_token) delete body.access_token;
      await api('/api/integrations/whatsapp/settings', { method: 'PUT', body });
      setOriginal({ ...form, access_token: '' });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { setError(e.data?.error || e.message); }
    finally { setSaving(false); }
  }

  async function sendTest() {
    if (!testTo) { setError('Enter a phone number.'); return; }
    setTesting(true); setError(null); setTestResult(null);
    try {
      const r = await api('/api/integrations/whatsapp/test', { method: 'POST', body: { to: testTo, message: testMsg } });
      setTestResult(r);
    } catch (e) { setError(e.data?.error || e.message); }
    finally { setTesting(false); }
  }

  const dirty = JSON.stringify({ ...form, access_token: '' }) !== JSON.stringify({ ...original, access_token: '' });

  if (loading) return <p className="text-slate-500">Loading…</p>;

  return (
    <div className="space-y-5 max-w-3xl">
      <header>
        <h1 className="text-2xl font-semibold">WhatsApp integration</h1>
        <p className="text-slate-500 text-sm">
          Send WhatsApp messages to parents and staff. The public site already
          exposes a click-to-chat link; this page adds an outbound backend.
          Provider: <code className="ml-1 text-xs">{status?.provider || '—'}</code>
          {status?.enabled && <span className="ml-2 text-xs text-emerald-700">● active</span>}
        </p>
      </header>

      <form onSubmit={e => { e.preventDefault(); save(); }} className="card">
        <div className="card-body space-y-3">
          <div>
            <label className="label">Provider</label>
            <select className="input" value={form.provider} onChange={e => set('provider', e.target.value)}>
              {PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>

          {form.provider === 'meta_cloud' && (
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Phone number ID</label>
                <input className="input" value={form.phone_number_id || ''} onChange={e => set('phone_number_id', e.target.value)} />
              </div>
              <div>
                <label className="label">Business account ID</label>
                <input className="input" value={form.business_account_id || ''} onChange={e => set('business_account_id', e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className="label">{original.access_token ? 'New access token (blank to keep)' : 'Access token'}</label>
                <input type="password" className="input" value={form.access_token || ''} onChange={e => set('access_token', e.target.value)} />
              </div>
              <div>
                <label className="label">API version</label>
                <input className="input" value={form.api_version || 'v18.0'} onChange={e => set('api_version', e.target.value)} />
              </div>
            </div>
          )}

          {form.provider === 'twilio' && (
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Twilio Account SID</label>
                <input className="input" value={form.account_sid || ''} onChange={e => set('account_sid', e.target.value)} />
              </div>
              <div>
                <label className="label">{original.access_token ? 'New auth token (blank to keep)' : 'Twilio auth token'}</label>
                <input type="password" className="input" value={form.access_token || ''} onChange={e => set('access_token', e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className="label">From WhatsApp number (E.164)</label>
                <input className="input" value={form.from_number || ''} onChange={e => set('from_number', e.target.value)} placeholder="+923001234567" />
              </div>
            </div>
          )}

          {form.provider === 'click_to_chat' && (
            <p className="text-sm text-slate-500">
              Click-to-chat does not need backend credentials. The public site
              generates a <code>wa.me/&lt;number&gt;?text=...</code> URL on demand
              and parents open it in WhatsApp themselves. The "Send test" button
              below will return a dry-run result with the URL.
            </p>
          )}

          <label className="flex items-center gap-2 text-sm pt-2 border-t border-slate-200">
            <input type="checkbox" checked={!!form.is_enabled} onChange={e => set('is_enabled', e.target.checked)} />
            Enable backend WhatsApp sending
          </label>
          {error && <div className="text-sm text-red-600">Could not save: {error}</div>}
          {saved && <div className="text-sm text-emerald-700">✓ Saved.</div>}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setForm(original)} disabled={!dirty}>Reset</button>
            <button className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</button>
          </div>
        </div>
      </form>

      <section className="card">
        <div className="card-body space-y-3">
          <h2 className="font-semibold">Send a test WhatsApp</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <input className="input" placeholder="+923001234567" value={testTo} onChange={e => setTestTo(e.target.value)} />
            <input className="input" placeholder="Message body" value={testMsg} onChange={e => setTestMsg(e.target.value)} />
          </div>
          <div className="flex justify-end">
            <button onClick={sendTest} disabled={testing || (!form.is_enabled && form.provider !== 'click_to_chat')} className="btn-secondary">
              {testing ? 'Testing…' : 'Send test'}
            </button>
          </div>
          {testResult && (
            <div className={'text-sm rounded p-2 ' + (testResult.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700')}>
              <div className="font-semibold">{testResult.ok ? '✓ ' : '✗ '}{testResult.status}</div>
              <div className="text-xs">Provider: {testResult.provider || '—'}</div>
              {testResult.url && <div className="text-xs break-all"><a href={testResult.url} target="_blank" rel="noreferrer" className="underline">Open chat →</a></div>}
              {testResult.error && <div className="text-xs">{testResult.error}</div>}
              {testResult.responseCode && <div className="text-xs">Response: {testResult.responseCode}</div>}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
