import { useEffect, useState } from 'react';
import { api } from '../../../lib/api.js';

export default function StudentResultsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    api('/api/student/results').then(d => setItems(d.items)).finally(() => setLoading(false));
  }, []);
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">Results</h1>
        <p className="text-slate-500">Subject-wise marks uploaded by your teachers.</p>
      </header>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500 text-xs uppercase">
            <tr><th className="px-3 py-2">Subject</th><th>Term</th><th>Session</th><th>Marks</th><th>Grade</th><th>Remarks</th><th>Date</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-500">Loading…</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-500">No results uploaded yet.</td></tr>}
            {items.map(r => {
              const pct = r.total_marks ? Math.round((r.marks_obtained / r.total_marks) * 100) : null;
              return (
                <tr key={r.id} className="border-t border-slate-200">
                  <td className="px-3 py-2 font-medium">{r.subject_name}</td>
                  <td className="px-3 py-2">{r.term_name}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">{r.session_name}</td>
                  <td className="px-3 py-2">
                    <span className="font-medium">{r.marks_obtained ?? '—'}</span>
                    <span className="text-slate-400">/{r.total_marks}</span>
                    {pct != null && <span className="text-xs text-slate-500 ml-1">({pct}%)</span>}
                  </td>
                  <td className="px-3 py-2">{r.grade || '—'}</td>
                  <td className="px-3 py-2 text-slate-500 text-xs">{r.remarks || '—'}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">{new Date(r.created_at).toLocaleDateString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
