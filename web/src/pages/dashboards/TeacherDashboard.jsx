import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';

export default function TeacherDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => { api('/api/teacher/dashboard').then(setData).catch(e => setError(e.message)); }, []);
  if (error) return <ErrorCard message={error} />;
  if (!data) return <p className="text-slate-500">Loading…</p>;
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{data.greeting}</h1>
        <p className="text-slate-500">Teacher portal.</p>
      </header>
      <section className="card">
        <div className="card-body">
          <h2 className="font-semibold mb-3">Your assignments</h2>
          {data.assignments?.length ? (
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr><th className="py-1">Subject</th><th>Class</th><th>Section</th><th>Session</th></tr>
              </thead>
              <tbody>
                {data.assignments.map(a => (
                  <tr key={a.id} className="border-t border-slate-200">
                    <td className="py-2 font-medium">{a.subject}</td>
                    <td>{a.class_name}</td>
                    <td>{a.section}</td>
                    <td>{a.session_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="text-sm text-slate-500">No class assignments yet.</p>}
        </div>
      </section>
      <section className="grid sm:grid-cols-3 gap-3">
        <Hint label="Attendance" hint="Marking UI lands in Phase 5." />
        <Hint label="Lectures & recordings" hint="Upload UI lands in Phase 4." />
        <Hint label="Results" hint="Upload UI lands in Phase 5." />
      </section>
    </div>
  );
}
function Hint({ label, hint }) { return <div className="card"><div className="card-body"><div className="text-sm font-medium">{label}</div><p className="text-xs text-slate-500 mt-1">{hint}</p></div></div>; }
function ErrorCard({ message }) { return <div className="card"><div className="card-body"><h2 className="font-semibold text-red-600">Could not load dashboard</h2><p className="text-sm text-slate-600 mt-1">{message}</p></div></div>; }
