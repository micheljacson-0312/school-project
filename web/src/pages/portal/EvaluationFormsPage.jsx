// Evaluation forms to fill out — Phase 5. Shown on dashboards of student/teacher/parent/staff.
// Lists forms assigned to your audience and lets you submit a response (or view your previous one).
import { useEffect, useState } from 'react';
import Modal from '../../components/Modal.jsx';
import { api } from '../../lib/api.js';

export default function EvaluationFormsPage() {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);
  const [answers, setAnswers] = useState({});
  const [targetId, setTargetId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  function load() {
    setLoading(true);
    api('/api/evaluation/forms').then(d => setForms(d.items || [])).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function open(f) {
    setActive(f); setAnswers({}); setTargetId(''); setDone(false); setError(null);
    try {
      const detail = await api(`/api/evaluation/forms/${f.id}`);
      setActive({ ...f, ...detail.item });
      if (detail.item.my_response) setAnswers(detail.item.my_response.answers_json || {});
    } catch (e) { setError(e.message); }
  }
  async function submit() {
    setSubmitting(true); setError(null);
    try {
      await api(`/api/evaluation/forms/${active.id}/respond`, { method: 'POST', body: { answers, target_id: targetId ? Number(targetId) : undefined } });
      setDone(true); setTimeout(() => { setActive(null); load(); }, 2000);
    } catch (e) { setError(e.data?.error || e.message); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">Evaluation forms</h1>
        <p className="text-slate-500">Forms assigned to your role. Your responses are anonymous and aggregated.</p>
      </header>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500 text-xs uppercase">
            <tr><th className="px-3 py-2">Title</th><th>Audience</th><th>Status</th><th className="text-right">Action</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-500">Loading…</td></tr>}
            {!loading && forms.length === 0 && <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-500">No active forms for you.</td></tr>}
            {forms.map(f => (
              <tr key={f.id} className="border-t border-slate-200">
                <td className="px-3 py-2 font-medium">{f.title}</td>
                <td className="px-3 py-2 text-xs">{f.audience}</td>
                <td className="px-3 py-2">
                  {f.responded
                    ? <span className="text-xs text-emerald-700">Submitted</span>
                    : <span className="text-xs text-amber-700">Pending</span>}
                </td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => open(f)} className="text-xs text-brand-700 hover:underline">{f.responded ? 'View' : 'Respond'}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={!!active} onClose={() => setActive(null)} size="lg"
             title={active?.title || 'Evaluation'}
             footer={!active?.my_response && !done ? <>
               <button className="btn-secondary" onClick={() => setActive(null)}>Cancel</button>
               <button className="btn-primary" onClick={submit} disabled={submitting}>{submitting ? 'Submitting…' : 'Submit'}</button>
             </> : <button className="btn-secondary" onClick={() => setActive(null)}>Close</button>}>
        {active && (
          <div className="space-y-3 text-sm">
            {done && <div className="text-emerald-700">✓ Your response was submitted. Thank you.</div>}
            {error && <div className="text-red-600">{error}</div>}
            {active.my_response && <div className="text-xs text-slate-500">You submitted this on {new Date(active.my_response.created_at).toLocaleString()}. View your answers below.</div>}
            <div>
              <label className="label">Target (optional — teacher evaluating a student, etc.)</label>
              <input className="input" type="number" value={targetId} onChange={e => setTargetId(e.target.value)} placeholder="user id (optional)" />
            </div>
            <hr className="border-slate-200" />
            {(Array.isArray(active.schema_json) ? active.schema_json : []).map((q, i) => (
              <div key={q.id || i} className="border border-slate-200 rounded p-3">
                <div className="font-medium">{q.prompt || q.text || `Question ${i+1}`}</div>
                {q.type === 'rating' && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {Array.from({ length: q.scale || 5 }, (_, n) => n + 1).map(n => (
                      <label key={n} className={'px-3 py-1.5 rounded border cursor-pointer ' + (Number(answers[q.id ?? String(i)]) === n ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-700 border-slate-200')}>
                        <input type="radio" className="hidden" name={`q-${q.id ?? i}`} checked={Number(answers[q.id ?? String(i)]) === n} onChange={() => setAnswers(a => ({ ...a, [q.id ?? String(i)]: n }))} />
                        {n}
                      </label>
                    ))}
                  </div>
                )}
                {q.type === 'yesno' && (
                  <div className="mt-2 flex gap-2">
                    {['yes','no'].map(v => (
                      <label key={v} className={'px-3 py-1.5 rounded border cursor-pointer ' + (answers[q.id ?? String(i)] === v ? 'bg-brand-600 text-white border-brand-600' : 'bg-white border-slate-200')}>
                        <input type="radio" className="hidden" name={`q-${q.id ?? i}`} checked={answers[q.id ?? String(i)] === v} onChange={() => setAnswers(a => ({ ...a, [q.id ?? String(i)]: v }))} />
                        {v}
                      </label>
                    ))}
                  </div>
                )}
                {(q.type === 'text' || !q.type) && (
                  <textarea className="input mt-2" rows={3} value={answers[q.id ?? String(i)] || ''} onChange={e => setAnswers(a => ({ ...a, [q.id ?? String(i)]: e.target.value }))} />
                )}
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
