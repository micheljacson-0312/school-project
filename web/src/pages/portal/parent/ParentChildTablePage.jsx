// Generic child-drilldown page used for attendance / results / fees.
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../../lib/api.js';

const TABS = [
  { to: 'attendance', label: 'Attendance' },
  { to: 'results',    label: 'Results' },
  { to: 'fees',       label: 'Fees' },
];

export default function ParentChildAttendancePage() {
  return <ChildPage kind="attendance" />;
}
export function ParentChildResultsPage() {
  return <ChildPage kind="results" />;
}
export function ParentChildFeesPage() {
  return <ChildPage kind="fees" />;
}

function ChildPage({ kind }) {
  const { studentId } = useParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    setLoading(true);
    api(`/api/parent/children/${studentId}/${kind}`).then(d => setItems(d.items || [])).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [studentId, kind]);
  return (
    <div className="space-y-5">
      <header>
        <Link to="/parent" className="text-sm text-brand-700">← All children</Link>
        <h1 className="text-2xl font-semibold capitalize">{kind}</h1>
        <p className="text-slate-500 text-sm">For student #{studentId}.</p>
        <nav className="flex gap-2 text-sm mt-3">
          {TABS.map(t => (
            <Link key={t.to} to={`/parent/children/${studentId}/${t.to}`}
                  className={'px-3 py-1.5 rounded ' + (t.to === kind ? 'bg-brand-600 text-white' : 'bg-white border border-slate-200')}>
              {t.label}
            </Link>
          ))}
        </nav>
      </header>

      {error && <div className="text-sm text-red-600">{error}</div>}
      {loading && <p className="text-slate-500">Loading…</p>}
      {!loading && items.length === 0 && <p className="text-slate-500 text-sm">Nothing to show.</p>}

      {kind === 'attendance' && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500 text-xs uppercase">
              <tr><th className="px-3 py-2">Date</th><th>Status</th><th>Remarks</th></tr>
            </thead>
            <tbody>
              {items.map(a => (
                <tr key={a.date} className="border-t border-slate-200">
                  <td className="px-3 py-2">{new Date(a.date).toLocaleDateString()}</td>
                  <td className="px-3 py-2">
                    <span className={'text-xs px-2 py-0.5 rounded ' + (
                      a.status === 'present' ? 'bg-emerald-100 text-emerald-700' :
                      a.status === 'absent'  ? 'bg-red-100 text-red-700' :
                      a.status === 'late'    ? 'bg-amber-100 text-amber-700' :
                      a.status === 'leave'   ? 'bg-brand-100 text-brand-700' :
                                               'bg-slate-100 text-slate-600'
                    )}>{a.status}</span>
                  </td>
                  <td className="px-3 py-2 text-slate-500">{a.remarks || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {kind === 'results' && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500 text-xs uppercase">
              <tr><th className="px-3 py-2">Subject</th><th>Term</th><th>Session</th><th>Marks</th><th>Grade</th><th>Remarks</th></tr>
            </thead>
            <tbody>
              {items.map(r => (
                <tr key={`${r.subject_name}-${r.created_at}`} className="border-t border-slate-200">
                  <td className="px-3 py-2 font-medium">{r.subject_name}</td>
                  <td className="px-3 py-2">{r.term_name}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">{r.session_name}</td>
                  <td className="px-3 py-2">{r.marks_obtained ?? '—'}/{r.total_marks}</td>
                  <td className="px-3 py-2">{r.grade || '—'}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">{r.remarks || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {kind === 'fees' && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500 text-xs uppercase">
              <tr>
                <th className="px-3 py-2">Structure</th><th>Session</th><th>Due</th>
                <th>Net</th><th>Paid</th><th>Outstanding</th><th>Status</th><th>Challan</th>
              </tr>
            </thead>
            <tbody>
              {items.map((f, i) => (
                <tr key={i} className="border-t border-slate-200">
                  <td className="px-3 py-2 font-medium">{f.structure_name}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">{f.session_name}</td>
                  <td className="px-3 py-2 text-xs">{f.due_date?.slice(0,10)}</td>
                  <td className="px-3 py-2">PKR {Number(f.net_amount).toLocaleString()}</td>
                  <td className="px-3 py-2">PKR {Number(f.paid_amount).toLocaleString()}</td>
                  <td className="px-3 py-2 font-medium">PKR {Number(f.net_amount - f.paid_amount).toLocaleString()}</td>
                  <td className="px-3 py-2">{f.status}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">{f.challan_no || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
