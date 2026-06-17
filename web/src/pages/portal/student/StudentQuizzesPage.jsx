import { useEffect, useState } from 'react';
import { api } from '../../../lib/api.js';
import Modal from '../../../components/Modal.jsx';

// Sequential quiz-taking interface. Auto-grades MCQ + truefalse on submit;
// essays/short answers remain ungraded for the teacher.
export default function StudentQuizzesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);          // quiz object
  const [attemptId, setAttemptId] = useState(null);
  const [answers, setAnswers] = useState({});
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  function load() {
    setLoading(true);
    api('/api/lms/quizzes?available=1').then(d => setItems(d.items)).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function start(q) {
    setActive(q); setAttemptId(null); setAnswers({}); setStep(0); setResult(null); setError(null);
    try {
      const detail = await api(`/api/lms/quizzes/${q.id}`);
      setActive(detail.item);
      const a = await api(`/api/lms/quizzes/${q.id}/attempt`, { method: 'POST' });
      setAttemptId(a.id);
    } catch (e) { setError(e.data?.error || e.message); }
  }

  async function submit() {
    setSubmitting(true); setError(null);
    try {
      const r = await api(`/api/lms/quizzes/${active.id}/attempt/${attemptId}/submit`, { method: 'POST', body: { answers } });
      setResult({ score: r.score, total: active.questions?.reduce((s, q) => s + Number(q.marks), 0) || 0 });
    } catch (e) { setError(e.data?.error || e.message); }
    finally { setSubmitting(false); }
  }

  if (result) {
    return (
      <div className="space-y-5">
        <header><h1 className="text-2xl font-semibold">Quiz result</h1></header>
        <div className="card"><div className="card-body">
          <h2 className="text-xl font-semibold text-emerald-700">{active?.title}</h2>
          <p className="mt-2">Auto-graded score: <strong>{result.score}</strong> / {result.total}</p>
          <p className="text-sm text-slate-500 mt-1">Essay / short-answer questions will be graded by your teacher.</p>
          <button onClick={() => { setActive(null); setResult(null); load(); }} className="btn-secondary mt-4">Back to quizzes</button>
        </div></div>
      </div>
    );
  }

  if (active) {
    const questions = active.questions || [];
    const q = questions[step];
    return (
      <div className="space-y-5 max-w-3xl">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{active.title}</h1>
            <p className="text-slate-500 text-sm">{active.subject_name} · {questions.length} questions</p>
          </div>
          <button onClick={() => setActive(null)} className="btn-secondary text-sm">Cancel</button>
        </header>
        {error && <div className="text-sm text-red-600">{error}</div>}
        {q ? (
          <div className="card"><div className="card-body">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Question {step+1} of {questions.length}</span>
              <span className="text-xs text-slate-500">{Number(q.marks)} marks</span>
            </div>
            <p className="font-medium mt-2">{q.prompt}</p>
            <div className="mt-3 space-y-2">
              {q.type === 'mcq' && (q.options_json || []).map(o => (
                <label key={o.key} className={'flex items-center gap-2 p-2 rounded border cursor-pointer ' + (answers[String(q.id)] === o.key ? 'border-brand-400 bg-brand-50' : 'border-slate-200')}>
                  <input type="radio" name={`q-${q.id}`} checked={answers[String(q.id)] === o.key} onChange={() => setAnswers(a => ({ ...a, [String(q.id)]: o.key }))} />
                  <span>{o.text}</span>
                </label>
              ))}
              {q.type === 'truefalse' && (
                <div className="flex gap-2">
                  {['true','false'].map(v => (
                    <label key={v} className={'flex items-center gap-2 px-3 py-2 rounded border cursor-pointer ' + (answers[String(q.id)] === v ? 'border-brand-400 bg-brand-50' : 'border-slate-200')}>
                      <input type="radio" name={`q-${q.id}`} checked={answers[String(q.id)] === v} onChange={() => setAnswers(a => ({ ...a, [String(q.id)]: v }))} />
                      <span className="capitalize">{v}</span>
                    </label>
                  ))}
                </div>
              )}
              {(q.type === 'short' || q.type === 'essay') && (
                <textarea rows={q.type === 'essay' ? 6 : 2} className="input"
                  value={answers[String(q.id)] || ''}
                  onChange={e => setAnswers(a => ({ ...a, [String(q.id)]: e.target.value }))} />
              )}
            </div>
            <div className="flex justify-between mt-4">
              <button onClick={() => setStep(s => Math.max(0, s-1))} className="btn-secondary text-sm" disabled={step === 0}>Previous</button>
              {step < questions.length - 1
                ? <button onClick={() => setStep(s => s+1)} className="btn-primary text-sm">Next →</button>
                : <button onClick={submit} className="btn-primary text-sm" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit quiz'}</button>}
            </div>
          </div></div>
        ) : <p className="text-slate-500">This quiz has no questions yet.</p>}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">Quizzes</h1>
        <p className="text-slate-500">Quizzes currently available for your class.</p>
      </header>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500 text-xs uppercase">
            <tr><th className="px-3 py-2">Title</th><th>Subject</th><th>Available until</th><th>Time limit</th><th>Status</th><th className="text-right">Action</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">Loading…</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">No open quizzes.</td></tr>}
            {items.map(q => (
              <tr key={q.id} className="border-t border-slate-200">
                <td className="px-3 py-2 font-medium">{q.title}</td>
                <td className="px-3 py-2">{q.subject_name}</td>
                <td className="px-3 py-2 text-xs">{new Date(q.available_to).toLocaleString()}</td>
                <td className="px-3 py-2 text-xs">{q.time_limit_min ? `${q.time_limit_min} min` : '—'}</td>
                <td className="px-3 py-2">{q.completed ? <span className="text-xs text-emerald-700">Completed</span> : <span className="text-xs text-amber-700">Open</span>}</td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => start(q)} className="btn-primary text-xs" disabled={q.completed}>{q.completed ? 'Done' : 'Start'}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
