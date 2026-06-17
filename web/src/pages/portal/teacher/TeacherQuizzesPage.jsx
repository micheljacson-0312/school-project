import { useEffect, useState } from 'react';
import Modal from '../../../components/Modal.jsx';
import { api } from '../../../lib/api.js';

const blankQuiz = { subject_id: '', class_id: '', section_id: '', session_id: '', title: '', total_marks: 100, available_from: '', available_to: '', time_limit_min: '' };
const blankQ = { type: 'mcq', prompt: '', options_json: [{key:'a',text:''},{key:'b',text:''}], correct_key: 'a', marks: 1, position: 0 };

export default function TeacherQuizzesPage() {
  const [items, setItems] = useState([]);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);             // 'create' | { id, item }
  const [form, setForm] = useState(blankQuiz);
  const [qForm, setQForm] = useState(blankQ);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  function load() {
    setLoading(true);
    Promise.all([api('/api/lms/quizzes'), api('/api/teacher/dashboard')])
      .then(([q, d]) => { setItems(q.items); setMe(d); }).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function openQuiz(q) {
    setModal({ id: q.id });
    setError(null);
    try {
      const detail = await api(`/api/lms/quizzes/${q.id}`);
      setModal({ id: q.id, item: detail.item });
    } catch (e) { setError(e.message); }
  }

  async function saveCreate() {
    setSubmitting(true); setError(null);
    try {
      const body = { ...form, total_marks: Number(form.total_marks), time_limit_min: form.time_limit_min ? Number(form.time_limit_min) : undefined };
      await api('/api/lms/quizzes', { method: 'POST', body });
      setModal(null); setForm(blankQuiz); load();
    } catch (e) { setError(e.data?.error || e.message); }
    finally { setSubmitting(false); }
  }
  async function addQuestion() {
    setSubmitting(true); setError(null);
    try {
      const body = { ...qForm, marks: Number(qForm.marks), options_json: qForm.type === 'mcq' ? qForm.options_json : undefined };
      await api(`/api/lms/quizzes/${modal.id}/questions`, { method: 'POST', body });
      // refresh
      const detail = await api(`/api/lms/quizzes/${modal.id}`);
      setModal({ id: modal.id, item: detail.item });
      setQForm(blankQ);
    } catch (e) { setError(e.data?.error || e.message); }
    finally { setSubmitting(false); }
  }
  async function removeQuestion(qid) {
    await api(`/api/lms/quizzes/${modal.id}/questions/${qid}`, { method: 'DELETE' });
    const detail = await api(`/api/lms/quizzes/${modal.id}`);
    setModal({ id: modal.id, item: detail.item });
  }
  async function remove(q) {
    if (!confirm(`Delete quiz "${q.title}"?`)) return;
    await api(`/api/lms/quizzes/${q.id}`, { method: 'DELETE' });
    load();
  }

  function setOption(idx, key, val) {
    const next = qForm.options_json.map((o, i) => i === idx ? { ...o, [key]: val } : o);
    setQForm(f => ({ ...f, options_json: next }));
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Quizzes</h1>
          <p className="text-slate-500">Create quizzes and add questions. MCQ/truefalse auto-grade.</p>
        </div>
        <button onClick={() => { setForm(blankQuiz); setModal('create'); setError(null); }} className="btn-primary text-sm">+ New quiz</button>
      </header>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500 text-xs uppercase">
            <tr><th className="px-3 py-2">Title</th><th>Subject</th><th>Class</th><th>Available</th><th>Marks</th><th className="text-right">Actions</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">Loading…</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">No quizzes.</td></tr>}
            {items.map(q => (
              <tr key={q.id} className="border-t border-slate-200">
                <td className="px-3 py-2 font-medium">{q.title}</td>
                <td className="px-3 py-2">{q.subject_name}</td>
                <td className="px-3 py-2">{q.class_name}/{q.section_name}</td>
                <td className="px-3 py-2 text-xs">{new Date(q.available_from).toLocaleString()} → {new Date(q.available_to).toLocaleString()}</td>
                <td className="px-3 py-2">{q.total_marks}</td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <button onClick={() => openQuiz(q)} className="text-xs text-brand-700 hover:underline mr-3">Questions</button>
                  <button onClick={() => remove(q)} className="text-xs text-red-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create modal */}
      <Modal open={modal === 'create'} onClose={() => setModal(null)} title="New quiz"
             footer={<>
               <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
               <button className="btn-primary" onClick={saveCreate} disabled={submitting}>{submitting ? 'Saving…' : 'Save'}</button>
             </>}>
        <div className="space-y-3">
          <div><label className="label">Title *</label><input className="input" value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="label">Subject *</label>
              <select className="input" value={form.subject_id || ''} onChange={e => {
                const sid = e.target.value;
                const a = (me?.assignments || []).find(a => a.subject_id === Number(sid));
                setForm(f => ({ ...f, subject_id: sid, class_id: a?.class_id || '', section_id: a?.section_id || '', session_id: a?.session_id || '' }));
              }}>
                <option value="">Select…</option>
                {[...new Map((me?.assignments || []).map(a => [a.subject_id, a])).values()].map(a => <option key={a.subject_id} value={a.subject_id}>{a.subject}</option>)}
              </select>
            </div>
            <div><label className="label">Total marks</label><input type="number" className="input" value={form.total_marks} onChange={e => setForm(f => ({ ...f, total_marks: e.target.value }))} /></div>
            <div><label className="label">Time limit (min)</label><input type="number" className="input" value={form.time_limit_min || ''} onChange={e => setForm(f => ({ ...f, time_limit_min: e.target.value }))} /></div>
            <div><label className="label">Available from *</label><input type="datetime-local" className="input" value={form.available_from || ''} onChange={e => setForm(f => ({ ...f, available_from: e.target.value }))} /></div>
            <div><label className="label">Available to *</label><input type="datetime-local" className="input" value={form.available_to || ''} onChange={e => setForm(f => ({ ...f, available_to: e.target.value }))} /></div>
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
        </div>
      </Modal>

      {/* Questions modal */}
      <Modal open={modal && modal !== 'create'} onClose={() => setModal(null)} size="xl"
             title={modal?.item ? `Questions: ${modal.item.title}` : 'Questions'}>
        {modal?.item && (
          <div className="space-y-4 text-sm">
            <p className="text-xs text-slate-500">{modal.item.subject_name} · {modal.item.class_name}/{modal.item.section_name}</p>
            <ol className="space-y-2">
              {modal.item.questions?.length === 0 && <li className="text-slate-500 text-center py-4">No questions yet.</li>}
              {modal.item.questions?.map((q, i) => (
                <li key={q.id} className="border border-slate-200 rounded p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">Q{i+1}. {q.prompt}</div>
                    <button onClick={() => removeQuestion(q.id)} className="text-xs text-red-600 hover:underline">Remove</button>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Type: <code>{q.type}</code> · Marks: {q.marks} · Correct: <code>{q.correct_key || '—'}</code></div>
                  {q.type === 'mcq' && (
                    <ul className="mt-2 grid sm:grid-cols-2 gap-1 text-xs">
                      {(q.options_json || []).map(o => (
                        <li key={o.key} className={'px-2 py-1 rounded ' + (q.correct_key === o.key ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-600')}>
                          <code>{o.key}</code> — {o.text}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ol>

            <hr className="border-slate-200" />
            <h3 className="font-semibold">Add question</h3>
            <div>
              <label className="label">Type</label>
              <select className="input" value={qForm.type} onChange={e => setQForm(f => ({ ...f, type: e.target.value }))}>
                <option value="mcq">MCQ</option>
                <option value="truefalse">True / False</option>
                <option value="short">Short answer</option>
                <option value="essay">Essay</option>
              </select>
            </div>
            <div><label className="label">Prompt *</label><textarea rows={2} className="input" value={qForm.prompt || ''} onChange={e => setQForm(f => ({ ...f, prompt: e.target.value }))} /></div>
            {qForm.type === 'mcq' && (
              <div className="space-y-2">
                <label className="label">Options (tick the correct one)</label>
                {qForm.options_json.map((o, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input type="radio" name="correct" checked={qForm.correct_key === o.key} onChange={() => setQForm(f => ({ ...f, correct_key: o.key }))} />
                    <input className="input !w-16 !py-1" value={o.key} onChange={e => setOption(i, 'key', e.target.value)} placeholder="key" />
                    <input className="input !py-1 flex-1" value={o.text} onChange={e => setOption(i, 'text', e.target.value)} placeholder="text" />
                    {qForm.options_json.length > 2 && <button type="button" onClick={() => setQForm(f => ({ ...f, options_json: f.options_json.filter((_, j) => j !== i) }))} className="text-xs text-red-600">×</button>}
                  </div>
                ))}
                <button type="button" onClick={() => setQForm(f => ({ ...f, options_json: [...f.options_json, { key: String.fromCharCode(97 + f.options_json.length), text: '' }] }))} className="text-xs text-brand-700 hover:underline">+ add option</button>
              </div>
            )}
            {qForm.type === 'truefalse' && (
              <div>
                <label className="label">Correct answer</label>
                <select className="input" value={qForm.correct_key || 'true'} onChange={e => setQForm(f => ({ ...f, correct_key: e.target.value }))}>
                  <option value="true">True</option>
                  <option value="false">False</option>
                </select>
              </div>
            )}
            <div className="grid sm:grid-cols-2 gap-3">
              <div><label className="label">Marks</label><input type="number" className="input" value={qForm.marks} onChange={e => setQForm(f => ({ ...f, marks: e.target.value }))} /></div>
            </div>
            {error && <div className="text-sm text-red-600">{error}</div>}
            <div className="flex justify-end">
              <button onClick={addQuestion} disabled={submitting || !qForm.prompt} className="btn-primary">{submitting ? 'Adding…' : 'Add question'}</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
