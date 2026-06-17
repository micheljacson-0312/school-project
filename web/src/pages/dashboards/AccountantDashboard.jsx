import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';

export default function AccountantDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => { api('/api/accountant/dashboard').then(setData).catch(e => setError(e.message)); }, []);
  if (error) return <ErrorCard message={error} />;
  if (!data) return <p className="text-slate-500">Loading…</p>;
  const s = data.summary || {};
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{data.greeting}</h1>
        <p className="text-slate-500">Accountant portal — fee summary.</p>
      </header>
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label="Unpaid bills"  value={s.unpaid} />
        <Metric label="Overdue"       value={s.overdue} />
        <Metric label="Paid"          value={s.paid} />
        <Metric label="Active structures total" value={s.active_structures_total} />
      </section>
      <p className="text-xs text-slate-500">
        Fee discount engine, challan generator, and defaulter workflows land in Phase 6.
      </p>
    </div>
  );
}
function Metric({ label, value }) {
  return (
    <div className="card">
      <div className="card-body">
        <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
        <div className="text-2xl font-semibold mt-1">{value ?? '—'}</div>
      </div>
    </div>
  );
}
function ErrorCard({ message }) { return <div className="card"><div className="card-body"><h2 className="font-semibold text-red-600">Could not load dashboard</h2><p className="text-sm text-slate-600 mt-1">{message}</p></div></div>; }
