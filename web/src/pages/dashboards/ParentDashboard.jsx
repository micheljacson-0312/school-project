import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';

export default function ParentDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => { api('/api/parent/dashboard').then(setData).catch(e => setError(e.message)); }, []);
  if (error) return <ErrorCard message={error} />;
  if (!data) return <p className="text-slate-500">Loading…</p>;
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{data.greeting}</h1>
        <p className="text-slate-500">Parent portal — track your child(ren).</p>
      </header>
      <section className="card">
        <div className="card-body">
          <h2 className="font-semibold mb-3">Linked children</h2>
          {data.children?.length ? (
            <ul className="divide-y divide-slate-200">
              {data.children.map(c => (
                <li key={c.student_id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{c.class_name} · Section {c.section_name}</div>
                    <div className="text-xs text-slate-500">Adm. {c.admission_no} · Relation: {c.relation}</div>
                  </div>
                  <div className="text-xs text-slate-500">Roll {c.roll_no || '—'}</div>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-slate-500">No children linked to this account.</p>}
        </div>
      </section>
      <p className="text-xs text-slate-500">
        Login is supported by CNIC. Detailed attendance, result, and fee views land in later phases.
      </p>
    </div>
  );
}
function ErrorCard({ message }) { return <div className="card"><div className="card-body"><h2 className="font-semibold text-red-600">Could not load dashboard</h2><p className="text-sm text-slate-600 mt-1">{message}</p></div></div>; }
