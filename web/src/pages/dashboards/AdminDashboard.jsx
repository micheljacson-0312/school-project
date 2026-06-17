import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    api('/api/admin/dashboard').then(setData).catch(e => setError(e.message));
  }, []);
  if (error) return <ErrorCard message={error} />;
  if (!data) return <p className="text-slate-500">Loading…</p>;
  const m = data.metrics || {};
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{data.greeting}</h1>
        <p className="text-slate-500">Admin portal — system overview.</p>
      </header>
      <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Metric label="Active users"       value={m.users_active} />
        <Metric label="Active students"    value={m.students_active} />
        <Metric label="Active teachers"    value={m.teachers_active} />
        <Metric label="Published news"     value={m.news_published} />
        <Metric label="New admissions"     value={m.new_admissions} />
      </section>
      <section className="card">
        <div className="card-body">
          <h2 className="font-semibold mb-3">Quick links</h2>
          <ul className="grid sm:grid-cols-2 gap-2 text-sm">
            {data.quick_links?.map(l => (
              <li key={l.label} className="px-3 py-2 rounded border border-slate-200 flex justify-between">
                <span>{l.label}</span>
                <span className="text-xs text-slate-500">{l.permission}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-500 mt-3">
            Phase 1 placeholder. Phase 3 will wire each link to its real UI.
          </p>
        </div>
      </section>
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

function ErrorCard({ message }) {
  return (
    <div className="card">
      <div className="card-body">
        <h2 className="font-semibold text-red-600">Could not load dashboard</h2>
        <p className="text-sm text-slate-600 mt-1">{message}</p>
      </div>
    </div>
  );
}
