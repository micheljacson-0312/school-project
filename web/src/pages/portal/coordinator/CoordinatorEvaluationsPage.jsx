// Coordinator evaluations overview (Phase 5).
import { useEffect, useState } from 'react';
import { api } from '../../../lib/api.js';

export default function CoordinatorEvaluationsPage() {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    setLoading(true);
    // Admin/coordinator can see all forms by listing via direct query.
    // We use the same /forms endpoint as it returns active forms.
    api('/api/evaluation/forms').then(d => setForms(d.items || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function openSummary(f) {
    setSelected(f); setSummary(null);
    try {
      const [detail, summary] = await Promise.all([
        api(`/api/evaluation/forms/${f.id}`),
        api(`/api/evaluation/forms/${f.id}/summary`),
      ]);
      setSelected({ ...f, ...detail.item });
      setSummary(summary);
    } catch (e) {}
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">Evaluations</h1>
        <p className="text-slate-500">Active forms and their response summaries.</p>
      </header>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500 text-xs uppercase">
            <tr><th className="px-3 py-2">Title</th><th>Audience</th><th>Created</th><th className="text-right">Action</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-500">Loading…</td></tr>}
            {!loading && forms.length === 0 && <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-500">No active forms.</td></tr>}
            {forms.map(f => (
              <tr key={f.id} className="border-t border-slate-200">
                <td className="px-3 py-2 font-medium">{f.title}</td>
                <td className="px-3 py-2 text-xs">{f.audience}</td>
                <td className="px-3 py-2 text-xs">{f.created_at ? new Date(f.created_at).toLocaleDateString() : '—'}</td>
                <td className="px-3 py-2 text-right"><button onClick={() => openSummary(f)} className="text-xs text-brand-700 hover:underline">Summary</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && summary && (
        <div className="card"><div className="card-body">
          <h2 className="font-semibold">{selected.title}</h2>
          <p className="text-sm text-slate-500">{summary.respondents} respondent(s){summary.first_response ? ` · first ${new Date(summary.first_response).toLocaleDateString()}` : ''}</p>
          <table className="w-full text-sm mt-3">
            <thead className="text-left text-slate-500 text-xs uppercase">
              <tr><th className="py-1">Question</th><th>Type</th><th>Responses</th><th>Avg</th></tr>
            </thead>
            <tbody>
              {summary.per_question?.map((q, i) => (
                <tr key={i} className="border-t border-slate-200">
                  <td className="py-2">{q.question}</td>
                  <td className="py-2 text-xs">{q.type}</td>
                  <td className="py-2">{q.count}</td>
                  <td className="py-2">{q.avg ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></div>
      )}
    </div>
  );
}
