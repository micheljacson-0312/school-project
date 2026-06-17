// Report card view — used by student + parent (single page, role-aware data fetch).
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api.js';

export default function ReportCardPage() {
  // For students: shows own card. For parents: shows their child's.
  // Route: /student/report-card (own) or /parent/children/:id/report-card
  const { studentId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [terms, setTerms] = useState([]);
  const [termId, setTermId] = useState('');

  useEffect(() => {
    api('/api/admin/academic/terms').then(d => setTerms(d.items || []));
  }, []);

  useEffect(() => {
    setLoading(true);
    let url;
    if (studentId) url = `/api/results/report-card/${studentId}${termId ? `?term_id=${termId}` : ''}`;
    else {
      // student gets their own report card
      url = `/api/student/dashboard`;   // we'll fetch the student's id via the report-card by querying their own
    }
    if (studentId) {
      api(url).then(setData).finally(() => setLoading(false));
    } else {
      // Fetch the student's own id via dashboard, then report card.
      api('/api/student/dashboard').then(dash => {
        const sid = dash.profile?.student_id;
        if (!sid) { setData({ items: [], summary: {} }); setLoading(false); return; }
        return api(`/api/results/report-card/${sid}${termId ? `?term_id=${termId}` : ''}`).then(setData);
      }).catch(() => setData({ items: [], summary: {} })).finally(() => setLoading(false));
    }
  }, [studentId, termId]);

  if (loading) return <p className="text-slate-500">Loading…</p>;
  if (!data) return null;
  const { summary, items } = data;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Report card</h1>
          <p className="text-slate-500 text-sm">Subject-wise marks for the selected term.</p>
        </div>
        <div>
          <label className="label">Term</label>
          <select className="input max-w-xs" value={termId} onChange={e => setTermId(e.target.value)}>
            <option value="">Latest</option>
            {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      </header>

      <div className="grid sm:grid-cols-3 gap-3">
        <div className="card"><div className="card-body">
          <div className="text-xs uppercase text-slate-500">Subjects</div>
          <div className="text-3xl font-semibold">{summary?.subjects ?? 0}</div>
        </div></div>
        <div className="card"><div className="card-body">
          <div className="text-xs uppercase text-slate-500">Total marks</div>
          <div className="text-3xl font-semibold">{summary?.marks_obtained ?? 0}<span className="text-base text-slate-400"> / {summary?.total_marks ?? 0}</span></div>
        </div></div>
        <div className="card"><div className="card-body">
          <div className="text-xs uppercase text-slate-500">Overall</div>
          <div className="text-3xl font-semibold">{summary?.percentage != null ? `${summary.percentage}%` : '—'}</div>
        </div></div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500 text-xs uppercase">
            <tr><th className="px-3 py-2">Subject</th><th>Marks</th><th>Grade</th><th>Remarks</th></tr>
          </thead>
          <tbody>
            {items?.length === 0 && <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-500">No results for this term.</td></tr>}
            {items?.map(r => (
              <tr key={r.id} className="border-t border-slate-200">
                <td className="px-3 py-2 font-medium">{r.subject_name}</td>
                <td className="px-3 py-2">
                  <span className="font-medium">{r.marks_obtained}</span>
                  <span className="text-slate-400"> / {r.total_marks}</span>
                  <span className="text-xs text-slate-500 ml-1">
                    ({r.total_marks ? Math.round((Number(r.marks_obtained) / Number(r.total_marks)) * 100) : 0}%)
                  </span>
                </td>
                <td className="px-3 py-2">{r.grade || '—'}</td>
                <td className="px-3 py-2 text-xs text-slate-500">{r.remarks || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
