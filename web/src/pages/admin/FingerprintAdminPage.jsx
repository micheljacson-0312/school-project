// Admin fingerprint integration status (Phase 5). The brief calls for a
// pluggable interface; this page shows status + a stub-event simulator
// so admins can verify the hook works without a real device.
import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';

const blank = { device_id: 'dev-001', kind: 'teacher', identifier: 'T-0001', direction: 'in', timestamp: '' };

export default function FingerprintAdminPage() {
  const [status, setStatus] = useState(null);
  const [form, setForm] = useState(blank);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  function load() {
    api('/api/integrations/fingerprint/status').then(setStatus).catch(() => {});
  }
  useEffect(load, []);

  async function simulate() {
    setSending(true); setResult(null);
    try {
      const r = await api('/api/integrations/fingerprint/event', { method: 'POST', body: form });
      setResult(r);
      load();
    } catch (e) { setResult({ error: e.data?.error || e.message }); }
    finally { setSending(false); }
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <header>
        <h1 className="text-2xl font-semibold">Fingerprint integration</h1>
        <p className="text-slate-500">Pluggable hook for biometric attendance devices. Status reflects the stub driver; wire a real SDK in production.</p>
      </header>

      <div className="card"><div className="card-body space-y-2">
        <div className="flex items-center gap-3">
          <span className={'text-xs px-2 py-0.5 rounded ' + (status?.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600')}>
            {status?.enabled ? 'enabled' : 'stub'}
          </span>
          <span className="text-sm">Driver: <code>{status?.driver || '—'}</code></span>
        </div>
        <div className="text-sm">Total events received: <strong>{status?.total_events || 0}</strong></div>
        <div className="text-xs text-slate-500">Last event: {status?.last_event_at || '—'}</div>
      </div></div>

      <div className="card"><div className="card-body space-y-3">
        <h2 className="font-semibold">Simulate a device event</h2>
        <p className="text-xs text-slate-500">Sends a synthetic event to the integration. The audit log records the event with action <code>fingerprint.event</code>.</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Device ID</label>
            <input className="input" value={form.device_id} onChange={e => setForm(f => ({ ...f, device_id: e.target.value }))} />
          </div>
          <div>
            <label className="label">Kind</label>
            <select className="input" value={form.kind} onChange={e => setForm(f => ({ ...f, kind: e.target.value }))}>
              <option value="teacher">Teacher</option>
              <option value="student">Student</option>
            </select>
          </div>
          <div>
            <label className="label">Identifier</label>
            <input className="input" value={form.identifier} onChange={e => setForm(f => ({ ...f, identifier: e.target.value }))} placeholder="T-0001 / ADM-0001" />
          </div>
          <div>
            <label className="label">Direction</label>
            <select className="input" value={form.direction} onChange={e => setForm(f => ({ ...f, direction: e.target.value }))}>
              <option value="in">In</option>
              <option value="out">Out</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end">
          <button onClick={simulate} disabled={sending} className="btn-primary">
            {sending ? 'Sending…' : 'Send event'}
          </button>
        </div>
        {result && (
          <div className={'text-sm rounded p-2 ' + (result.error ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-800')}>
            {result.error ? '✗ ' + result.error : '✓ ' + JSON.stringify(result)}
          </div>
        )}
      </div></div>

      <div className="card"><div className="card-body text-sm">
        <h2 className="font-semibold">Integration notes</h2>
        <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-600">
          <li>POST <code>/api/integrations/fingerprint/event</code> is the canonical webhook for biometric devices.</li>
          <li>The stub driver logs every event to <code>audit_logs</code> so admins can confirm the wiring.</li>
          <li>To wire a real device: replace <code>processEvent</code> in <code>server/src/integrations/fingerprint.js</code> with the device SDK call.</li>
        </ul>
      </div></div>
    </div>
  );
}
