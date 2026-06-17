import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';

export default function StudentDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => { api('/api/student/dashboard').then(setData).catch(e => setError(e.message)); }, []);
  if (error) return <ErrorCard message={error} />;
  if (!data) return <p className="text-slate-500">Loading…</p>;
  const p = data.profile;
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{data.greeting}</h1>
        <p className="text-slate-500">Student portal.</p>
      </header>
      {p ? (
        <section className="card">
          <div className="card-body">
            <h2 className="font-semibold mb-2">Your class</h2>
            <dl className="grid sm:grid-cols-2 gap-y-2 text-sm">
              <Row k="Admission #" v={p.admission_no} />
              <Row k="Roll #"      v={p.roll_no} />
              <Row k="Class"       v={p.class_name} />
              <Row k="Section"     v={p.section_name} />
              <Row k="Session"     v={p.session_name} />
            </dl>
          </div>
        </section>
      ) : (
        <p className="text-slate-500">No student profile is linked to this account yet.</p>
      )}
      <section className="grid sm:grid-cols-3 gap-3">
        <Placeholder label="Live classes"     hint="Jitsi integration lands in Phase 4." />
        <Placeholder label="Assignments"      hint="LMS lands in Phase 4." />
        <Placeholder label="Fee summary"      hint="Fees module lands in Phase 6." />
      </section>
    </div>
  );
}
function Row({ k, v }) { return (<><dt className="text-slate-500">{k}</dt><dd className="font-medium">{v || '—'}</dd></>); }
function Placeholder({ label, hint }) {
  return (
    <div className="card">
      <div className="card-body">
        <div className="text-sm font-medium">{label}</div>
        <p className="text-xs text-slate-500 mt-1">{hint}</p>
      </div>
    </div>
  );
}
function ErrorCard({ message }) {
  return <div className="card"><div className="card-body"><h2 className="font-semibold text-red-600">Could not load dashboard</h2><p className="text-sm text-slate-600 mt-1">{message}</p></div></div>;
}
