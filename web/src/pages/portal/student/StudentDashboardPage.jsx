import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../../lib/api.js';
import RoleQuickActions from '../../../components/RoleQuickActions.jsx';

function Metric({ label, value, hint }) {
  return (
    <div className="card"><div className="card-body">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-3xl font-semibold mt-1">{value ?? '—'}{hint && <span className="text-sm font-normal text-slate-500 ml-1">{hint}</span>}</div>
    </div></div>
  );
}

function StatusBadge({ s }) {
  const map = {
    present: 'bg-emerald-100 text-emerald-700',
    absent:  'bg-red-100 text-red-700',
    late:    'bg-amber-100 text-amber-700',
    leave:   'bg-brand-100 text-brand-700',
    holiday: 'bg-slate-100 text-slate-600',
  };
  return <span className={`text-xs px-2 py-0.5 rounded ${map[s] || 'bg-slate-100 text-slate-600'}`}>{s}</span>;
}

function StatusPill({ s }) {
  const map = {
    scheduled: 'bg-brand-100 text-brand-700',
    live:      'bg-emerald-100 text-emerald-700',
    ended:     'bg-slate-100 text-slate-600',
    cancelled: 'bg-red-100 text-red-700',
  };
  return <span className={`text-xs px-2 py-0.5 rounded ${map[s] || 'bg-slate-100 text-slate-600'}`}>{s}</span>;
}

export default function StudentDashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => { api('/api/student/dashboard').then(setData).catch(e => setError(e.message)); }, []);

  if (error) return <div className="card"><div className="card-body text-red-700">Could not load dashboard: {error}</div></div>;
  if (!data) return <p className="text-slate-500">Loading…</p>;
  if (!data.profile) {
    return (
      <div className="card"><div className="card-body">
        <h1 className="text-2xl font-semibold">Welcome, {data.greeting.replace('Welcome, ','')}</h1>
        <p className="text-slate-500 mt-2">No student profile is linked to this account yet. Ask your admin to set one up.</p>
      </div></div>
    );
  }

  const p = data.profile;
  const a = data.attendance || {};
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{data.greeting}</h1>
        <p className="text-slate-500">{p.class_name} · Section {p.section_name} · {p.session_name} · Adm. {p.admission_no}</p>
      </header>

      <RoleQuickActions roleKey="student" />

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label="Attendance (60d)" value={a.attendance_pct != null ? `${a.attendance_pct}%` : '—'} hint={a.counted ? `of ${a.counted} days` : ''} />
        <Metric label="Upcoming live"    value={data.live_classes?.length || 0} />
        <Metric label="Pending work"     value={data.pending_assignments?.length || 0} hint="assignments" />
        <Metric label="Unpaid fees"      value={data.fees?.unpaid_count ?? 0} hint={data.fees?.unpaid_total ? `PKR ${Number(data.fees.unpaid_total).toLocaleString()}` : ''} />
      </section>

      {data.live_classes?.length > 0 && (
        <section className="card"><div className="card-body">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold">Upcoming live classes</h2>
            <Link to="/student/live-classes" className="text-sm text-brand-700 font-medium">All →</Link>
          </div>
          <ul className="divide-y divide-slate-200">
            {data.live_classes.map(l => (
              <li key={l.id} className="py-3 flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium">{l.title}</div>
                  <div className="text-xs text-slate-500">{l.subject_name} · {l.teacher_name} · {new Date(l.starts_at).toLocaleString()}</div>
                </div>
                <StatusPill s={l.status} />
              </li>
            ))}
          </ul>
        </div></section>
      )}

      <section className="grid md:grid-cols-2 gap-4">
        <div className="card"><div className="card-body">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold">Pending assignments</h2>
            <Link to="/student/assignments" className="text-sm text-brand-700 font-medium">All →</Link>
          </div>
          {data.pending_assignments?.length ? (
            <ul className="divide-y divide-slate-200">
              {data.pending_assignments.map(a => (
                <li key={a.id} className="py-2">
                  <div className="font-medium">{a.title}</div>
                  <div className="text-xs text-slate-500">{a.subject_name} · Due {new Date(a.due_at).toLocaleString()}</div>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-slate-500">All caught up — no pending assignments.</p>}
        </div></div>

        <div className="card"><div className="card-body">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold">Available quizzes</h2>
            <Link to="/student/quizzes" className="text-sm text-brand-700 font-medium">All →</Link>
          </div>
          {data.quizzes?.length ? (
            <ul className="divide-y divide-slate-200">
              {data.quizzes.map(q => (
                <li key={q.id} className="py-2">
                  <div className="font-medium flex items-center gap-2">
                    {q.title} {q.completed ? <span className="text-xs text-emerald-600 font-normal">✓ completed</span> : null}
                  </div>
                  <div className="text-xs text-slate-500">{q.subject_name} · Closes {new Date(q.available_to).toLocaleString()}</div>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-slate-500">No open quizzes right now.</p>}
        </div></div>
      </section>
    </div>
  );
}
