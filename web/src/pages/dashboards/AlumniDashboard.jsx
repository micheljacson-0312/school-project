import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';

export default function AlumniDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => { api('/api/alumni/dashboard').then(setData).catch(e => setError(e.message)); }, []);
  if (error) return <ErrorCard message={error} />;
  if (!data) return <p className="text-slate-500">Loading…</p>;
  const p = data.profile;
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{data.greeting}</h1>
        <p className="text-slate-500">Alumni network.</p>
      </header>
      {p ? (
        <section className="card">
          <div className="card-body">
            <h2 className="font-semibold mb-2">Your alumni profile</h2>
            <dl className="grid sm:grid-cols-2 gap-y-2 text-sm">
              <Row k="Batch"        v={p.batch_name} />
              <Row k="Passing year" v={p.passing_year} />
              <Row k="Profession"   v={p.profession} />
              <Row k="Organization" v={p.organization} />
              <Row k="City / Country" v={`${p.city || '—'}, ${p.country || '—'}`} />
            </dl>
          </div>
        </section>
      ) : <p className="text-slate-500">No alumni profile linked.</p>}
      <p className="text-xs text-slate-500">Search and registration UI lands in Phase 7.</p>
    </div>
  );
}
function Row({ k, v }) { return (<><dt className="text-slate-500">{k}</dt><dd className="font-medium">{v || '—'}</dd></>); }
function ErrorCard({ message }) { return <div className="card"><div className="card-body"><h2 className="font-semibold text-red-600">Could not load dashboard</h2><p className="text-sm text-slate-600 mt-1">{message}</p></div></div>; }
