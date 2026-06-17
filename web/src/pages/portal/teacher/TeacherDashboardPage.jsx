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

export default function TeacherDashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => { api('/api/teacher/dashboard').then(setData).catch(e => setError(e.message)); }, []);
  if (error) return <div className="card"><div className="card-body text-red-700">Could not load dashboard: {error}</div></div>;
  if (!data) return <p className="text-slate-500">Loading…</p>;
  const t = data.teacher;
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{data.greeting}</h1>
        <p className="text-slate-500">
          {t ? <>{t.designation || 'Teacher'} · Code {t.employee_code}</> : 'No teacher profile linked.'}
        </p>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Metric label="Assigned classes" value={data.assignments?.length || 0} />
        <Metric label="Submissions to grade" value={data.pending_grading?.length || 0} />
        <Metric label="Upcoming live classes" value={data.upcoming_live?.length || 0} />
      </section>

      {data.assignments?.length > 0 && (
        <section className="card"><div className="card-body">
          <h2 className="font-semibold mb-2">Your assigned classes</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500 text-xs uppercase">
              <tr><th className="py-1">Subject</th><th>Class</th><th>Section</th><th>Session</th></tr>
            </thead>
            <tbody>
              {data.assignments.map(a => (
                <tr key={a.id} className="border-t border-slate-200">
                  <td className="py-2 font-medium">{a.subject}</td>
                  <td>{a.class_name}</td>
                  <td>{a.section}</td>
                  <td className="text-xs text-slate-500">{a.session_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></section>
      )}

      {data.pending_grading?.length > 0 && (
        <section className="card"><div className="card-body">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold">Submissions awaiting grading</h2>
            <Link to="/teacher/assignments" className="text-sm text-brand-700 font-medium">All assignments →</Link>
          </div>
          <ul className="divide-y divide-slate-200">
            {data.pending_grading.map(s => (
              <li key={s.id} className="py-2">
                <div className="font-medium">{s.title}</div>
                <div className="text-xs text-slate-500">{s.student_name} · Adm. {s.admission_no} · {s.submitted_at ? new Date(s.submitted_at).toLocaleString() : '—'}</div>
              </li>
            ))}
          </ul>
        </div></section>
      )}

      {data.upcoming_live?.length > 0 && (
        <section className="card"><div className="card-body">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold">Upcoming live classes</h2>
            <Link to="/teacher/lectures" className="text-sm text-brand-700 font-medium">All lectures →</Link>
          </div>
          <ul className="divide-y divide-slate-200">
            {data.upcoming_live.map(l => (
              <li key={l.id} className="py-2 flex items-center justify-between">
                <div>
                  <div className="font-medium">{l.title}</div>
                  <div className="text-xs text-slate-500">{l.subject_name} · {l.class_name}/{l.section_name} · {new Date(l.starts_at).toLocaleString()}</div>
                </div>
                <span className="text-xs text-brand-700">{l.status}</span>
              </li>
            ))}
          </ul>
        </div></section>
      )}
    </div>
  );
}
