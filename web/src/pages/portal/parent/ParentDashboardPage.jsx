import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../../lib/api.js';
import RoleQuickActions from '../../../components/RoleQuickActions.jsx';

function ChildCard({ child, summary }) {
  const a = summary.attendance || {};
  return (
    <div className="card">
      <div className="card-body space-y-3">
        <div>
          <div className="font-semibold text-lg">{summary.student_name || child.student_name}</div>
          <div className="text-xs text-slate-500">Adm. {child.admission_no} · {child.class_name} · Section {child.section_name} · {child.session_name}</div>
        </div>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <div className="text-xs text-slate-500">Attendance</div>
            <div className="font-semibold text-xl">{a.attendance_pct != null ? `${a.attendance_pct}%` : '—'}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Unpaid</div>
            <div className="font-semibold text-xl">{summary.fees?.unpaid_count || 0}</div>
            <div className="text-xs text-slate-500">{summary.fees?.unpaid_total ? `PKR ${Number(summary.fees.unpaid_total).toLocaleString()}` : '—'}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Latest result</div>
            <div className="font-semibold">
              {summary.latest_result
                ? <>{summary.latest_result.marks_obtained}/{summary.latest_result.total_marks}<div className="text-xs text-slate-500 font-normal">{summary.latest_result.subject_name}</div></>
                : '—'}
            </div>
          </div>
        </div>
        {summary.recent_remarks?.length > 0 && (
          <div>
            <div className="text-xs text-slate-500">Recent remarks</div>
            <ul className="text-sm mt-1 space-y-1">
              {summary.recent_remarks.map((r, i) => (
                <li key={i} className="text-slate-700 line-clamp-2"><span className="text-xs text-slate-500 mr-1">[{r.category}]</span>{r.body}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex gap-2 text-sm">
          <Link to={`/parent/children/${child.student_id}/attendance`} className="text-brand-700 hover:underline">Attendance</Link>
          <Link to={`/parent/children/${child.student_id}/results`} className="text-brand-700 hover:underline">Results</Link>
          <Link to={`/parent/children/${child.student_id}/fees`} className="text-brand-700 hover:underline">Fees</Link>
        </div>
      </div>
    </div>
  );
}

export default function ParentDashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => { api('/api/parent/dashboard').then(setData).catch(e => setError(e.message)); }, []);
  if (error) return <div className="card"><div className="card-body text-red-700">{error}</div></div>;
  if (!data) return <p className="text-slate-500">Loading…</p>;
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">{data.greeting}</h1>
        <p className="text-slate-500">{data.children.length === 0 ? 'No children linked to this account.' : `${data.children.length} child${data.children.length === 1 ? '' : 'ren'} linked.`}</p>
      </header>
      <RoleQuickActions roleKey="parent" />
      {data.children.length === 0 ? (
        <div className="card"><div className="card-body text-slate-500">Ask the school office to link your account to your child.</div></div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          {data.children.map(c => (
            <ChildCard key={c.student_id} child={c} summary={data.summaries.find(s => s.student_id === c.student_id) || {}} />
          ))}
        </div>
      )}
    </div>
  );
}
