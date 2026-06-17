import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';

const blank = {
  driver: 'log', host: '', port: '', username: '', password: '',
  encryption: 'tls', from_address: '', from_name: '', reply_to: '',
  is_enabled: false,
};

const DRIVERS = [
  { value: 'log',      label: 'Log (dev only — writes to console)' },
  { value: 'smtp',     label: 'SMTP (generic — Gmail, your own server, etc.)' },
  { value: 'sendmail', label: 'Sendmail (local MTA)' },
  { value: 'ses',      label: 'Amazon SES' },
  { value: 'mailgun',  label: 'Mailgun' },
  { value: 'postmark', label: 'Postmark' },
];

export default function MailSettingsPage() {
  const [form, setForm] = useState(blank);
  const [original, setOriginal] = useState(blank);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [saved, setSaved] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api('/api/admin/mail-settings').then(d => {
      const it = d.item || {};
      const f = { ...blank, ...it, port: it.port ?? '', password: '' };
      setForm(f);
      setOriginal(f);
    }).finally(() => setLoading(false));
  }, []);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function save() {
    setSaving(true); setError(null); setSaved(false); setTestResult(null);
    try {
      const body = { ...form };
      if (body.port === '') body.port = null;
      else body.port = Number(body.port);
      if (!body.password) delete body.password;        // don't overwrite unless user entered a new one
      await api('/api/admin/mail-settings', { method: 'PUT', body });
      setOriginal({ ...form, password: '' });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { setError(e.data?.error || e.message); }
    finally { setSaving(false); }
  }

  async function sendTest() {
    if (!testEmail) { setError('Enter a recipient email first.'); return; }
    setTesting(true); setError(null); setTestResult(null);
    try {
      const r = await api('/api/admin/mail-settings/test', { method: 'POST', body: { to: testEmail } });
      setTestResult(r);
    } catch (e) { setError(e.data?.error || e.message); }
    finally { setTesting(false); }
  }

  const dirty = JSON.stringify({ ...form, password: '' }) !== JSON.stringify({ ...original, password: '' });

  if (loading) return <p className="text-slate-500">Loading…</p>;

  return (
    <div className="space-y-5 max-w-3xl">
      <header>
        <h1 className="text-2xl font-semibold">Mail setup</h1>
        <p className="text-slate-500">Configure the SMTP driver for transactional email (admission confirmations, fee receipts, etc.). Passwords are stored encrypted at rest.</p>
      </header>

      <form onSubmit={e => { e.preventDefault(); save(); }} className="card">
        <div className="card-body space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Driver</label>
              <select className="input" value={form.driver} onChange={e => set('driver', e.target.value)}>
                {DRIVERS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Encryption</label>
              <select className="input" value={form.encryption} onChange={e => set('encryption', e.target.value)}>
                <option value="none">None</option>
                <option value="tls">TLS (recommended)</option>
                <option value="ssl">SSL</option>
              </select>
            </div>
            <div>
              <label className="label">Host</label>
              <input className="input" value={form.host || ''} onChange={e => set('host', e.target.value)} placeholder="smtp.gmail.com" />
            </div>
            <div>
              <label className="label">Port</label>
              <input type="number" className="input" value={form.port || ''} onChange={e => set('port', e.target.value)} placeholder="587" />
            </div>
            <div>
              <label className="label">Username</label>
              <input className="input" value={form.username || ''} onChange={e => set('username', e.target.value)} />
            </div>
            <div>
              <label className="label">{original.password ? 'New password (leave blank to keep)' : 'Password'}</label>
              <input type="password" className="input" value={form.password || ''} onChange={e => set('password', e.target.value)} />
            </div>
            <div>
              <label className="label">From address</label>
              <input type="email" className="input" value={form.from_address || ''} onChange={e => set('from_address', e.target.value)} placeholder="no-reply@school.test" />
            </div>
            <div>
              <label className="label">From name</label>
              <input className="input" value={form.from_name || ''} onChange={e => set('from_name', e.target.value)} />
            </div>
            <div>
              <label className="label">Reply-to (optional)</label>
              <input type="email" className="input" value={form.reply_to || ''} onChange={e => set('reply_to', e.target.value)} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm pt-2 border-t border-slate-200">
            <input type="checkbox" checked={!!form.is_enabled} onChange={e => set('is_enabled', e.target.checked)} />
            Enable mail sending
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
          <h2 className="font-semibold">Send a test email</h2>
          <p className="text-sm text-slate-500">Verifies the configuration. No real email is sent in the <code>log</code> driver — entries appear in the server console instead.</p>
          <div className="flex flex-wrap gap-2">
            <input type="email" className="input flex-1 min-w-[200px]" placeholder="recipient@example.com"
                   value={testEmail} onChange={e => setTestEmail(e.target.value)} />
            <button onClick={sendTest} disabled={testing || !form.is_enabled} className="btn-secondary">
              {testing ? 'Testing…' : 'Send test'}
            </button>
          </div>
          {!form.is_enabled && <p className="text-xs text-amber-700">Enable mail above to test.</p>}
          {testResult && (
            <div className={'text-sm rounded p-2 ' + (testResult.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700')}>
              {testResult.ok ? '✓ ' : '✗ '}{testResult.detail || (testResult.ok ? 'Test sent.' : 'Failed.')}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
