// Coordinator portal — Phase 5. Attendance + evaluations overview across classes.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../../lib/api.js';

function Metric({ label, value, hint }) {
  return (
    <div className="card"><div className="card-body">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-3xl font-semibold mt-1">{value ?? '—'}{hint && <span className="text-sm font-normal text-slate-500 ml-1">{hint}</span>}</div>
    </div></div>
  );
}

export default function CoordinatorDashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => { api('/api/coordinator/dashboard').then(setData).catch(e => setError(e.message)); }, []);
  if (error) return <div className="card"><div className="card-body text-red-700">{error}</div></div>;
  if (!data) return <p className="text-slate-500">Loading…</p>;
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{data.greeting}</h1>
        <p className="text-slate-500">Academic oversight — attendance and evaluations across classes.</p>
      </header>
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label="Active classes" value={data.classes} />
        <Metric label="Active students" value={data.students_active} />
        <Metric label="Defaulters (<75%)" value={data.defaulters} hint={data.defaulters ? 'this month' : ''} />
        <Metric label="Active evaluations" value={data.active_evaluations} />
      </section>
      <section className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
        <Link to="/coordinator/attendance" className="card hover:shadow">
          <div className="card-body">
            <div className="font-semibold">Attendance reports</div>
            <div className="text-xs text-slate-500 mt-1">Class-wise monthly breakdown + defaulters</div>
          </div>
        </Link>
        <Link to="/coordinator/teachers" className="card hover:shadow">
          <div className="card-body">
            <div className="font-semibold">Teacher attendance</div>
            <div className="text-xs text-slate-500 mt-1">Monthly present/late/absent per teacher</div>
          </div>
        </Link>
        <Link to="/coordinator/evaluations" className="card hover:shadow">
          <div className="card-body">
            <div className="font-semibold">Evaluations</div>
            <div className="text-xs text-slate-500 mt-1">Active forms + response summaries</div>
          </div>
        </Link>
      </section>
      <p className="text-xs text-slate-500">Phase 5: attendance reports, teacher attendance aggregation, evaluation summaries.</p>
    </div>
  );
}
