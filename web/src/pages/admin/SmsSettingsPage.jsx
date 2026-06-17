// Admin: SMS gateway settings + test send. Pluggable — see the integration
// table for supported drivers (log, twilio, nexmo, plivo, generic_http).
import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';

const DRIVERS = [
  { value: 'log',          label: 'Log (dev only — prints to console)' },
  { value: 'twilio',       label: 'Twilio' },
  { value: 'nexmo',        label: 'Vonage (formerly Nexmo)' },
  { value: 'plivo',        label: 'Plivo' },
  { value: 'generic_http', label: 'Generic HTTP (POST {to,message})' },
];

const blank = {
  driver: 'log', is_enabled: false,
  account_sid: '', auth_token: '', from_number: '',
  api_url: '', api_key: '',
};

export default function SmsSettingsPage() {
  const [form, setForm] = useState(blank);
  const [original, setOriginal] = useState(blank);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const [testTo, setTestTo] = useState('');
  const [testMsg, setTestMsg] = useState('School Platform test SMS');
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    Promise.all([
      api('/api/integrations/sms/status'),
    ]).then(([s]) => {
      setStatus(s);
      // Pre-fill what we know from status, leave secrets blank.
      setForm({ ...blank, driver: s.driver, is_enabled: !!s.enabled, from_number: s.from || '' });
      setOriginal({ ...blank, driver: s.driver, is_enabled: !!s.enabled, from_number: s.from || '' });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function save() {
    setSaving(true); setError(null); setSaved(false); setTestResult(null);
    try {
      const body = { ...form };
      // Don't overwrite secrets unless the user typed something.
      if (!body.auth_token) delete body.auth_token;
      if (!body.api_key)    delete body.api_key;
      await api('/api/integrations/sms/settings', { method: 'PUT', body });
      setOriginal({ ...form, auth_token: '', api_key: '' });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { setError(e.data?.error || e.message); }
    finally { setSaving(false); }
  }

  async function sendTest() {
    if (!testTo) { setError('Enter a phone number (E.164 format, e.g. +923001234567).'); return; }
    setTesting(true); setError(null); setTestResult(null);
    try {
      const r = await api('/api/integrations/sms/test', { method: 'POST', body: { to: testTo, message: testMsg } });
      setTestResult(r);
    } catch (e) { setError(e.data?.error || e.message); }
    finally { setTesting(false); }
  }

  const dirty = JSON.stringify({ ...form, auth_token: '', api_key: '' }) !== JSON.stringify({ ...original, auth_token: '', api_key: '' });

  if (loading) return <p className="text-slate-500">Loading…</p>;

  return (
    <div className="space-y-5 max-w-3xl">
      <header>
        <h1 className="text-2xl font-semibold">SMS gateway</h1>
        <p className="text-slate-500 text-sm">
          Outbound SMS for fee reminders, attendance alerts, and emergency broadcasts.
          Driver and credentials are encrypted at rest. Backend:
          <code className="ml-1 text-xs">{status?.driver || '—'}</code>
          {status?.enabled && <span className="ml-2 text-xs text-emerald-700">● active</span>}
        </p>
      </header>

      <form onSubmit={e => { e.preventDefault(); save(); }} className="card">
        <div className="card-body space-y-3">
          <div>
            <label className="label">Driver</label>
            <select className="input" value={form.driver} onChange={e => set('driver', e.target.value)}>
              {DRIVERS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>

          {(form.driver === 'twilio' || form.driver === 'nexmo' || form.driver === 'plivo') && (
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="label">{form.driver === 'nexmo' ? 'API key' : 'Account SID'}</label>
                <input className="input" value={form.account_sid || ''} onChange={e => set('account_sid', e.target.value)} />
              </div>
              <div>
                <label className="label">{form.driver === 'nexmo' ? 'API secret' : (original.auth_token ? 'New auth token (blank to keep)' : 'Auth token')}</label>
                <input type="password" className="input" value={form.auth_token || ''} onChange={e => set('auth_token', e.target.value)} />
              </div>
            </div>
          )}

          {(form.driver === 'twilio' || form.driver === 'plivo' || form.driver === 'nexmo') && (
            <div>
              <label className="label">From number (E.164)</label>
              <input className="input" value={form.from_number || ''} onChange={e => set('from_number', e.target.value)} placeholder="+923001234567" />
            </div>
          )}

          {form.driver === 'generic_http' && (
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="label">API URL</label>
                <input className="input" value={form.api_url || ''} onChange={e => set('api_url', e.target.value)} placeholder="https://api.example.com/sms" />
              </div>
              <div>
                <label className="label">API key</label>
                <input type="password" className="input" value={form.api_key || ''} onChange={e => set('api_key', e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className="label">From number (optional)</label>
                <input className="input" value={form.from_number || ''} onChange={e => set('from_number', e.target.value)} placeholder="+923001234567" />
              </div>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm pt-2 border-t border-slate-200">
            <input type="checkbox" checked={!!form.is_enabled} onChange={e => set('is_enabled', e.target.checked)} />
            Enable SMS sending
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
          <h2 className="font-semibold">Send a test SMS</h2>
          <p className="text-sm text-slate-500">In the <code>log</code> driver this just prints to the server console. Real drivers use the configured credentials.</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <input className="input" placeholder="+923001234567" value={testTo} onChange={e => setTestTo(e.target.value)} />
            <input className="input" placeholder="Message body" value={testMsg} onChange={e => setTestMsg(e.target.value)} />
          </div>
          <div className="flex justify-end">
            <button onClick={sendTest} disabled={testing || !form.is_enabled} className="btn-secondary">
              {testing ? 'Testing…' : 'Send test'}
            </button>
          </div>
          {!form.is_enabled && <p className="text-xs text-amber-700">Enable SMS above to test.</p>}
          {testResult && (
            <div className={'text-sm rounded p-2 ' + (testResult.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700')}>
              <div className="font-semibold">{testResult.ok ? '✓ ' : '✗ '}{testResult.status}</div>
              <div className="text-xs">Provider: {testResult.provider || '—'}</div>
              {testResult.error && <div className="text-xs">{testResult.error}</div>}
              {testResult.responseCode && <div className="text-xs">Response: {testResult.responseCode}</div>}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
