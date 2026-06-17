import { useEffect, useState } from 'react';
import { api } from '../../../lib/api.js';
import Modal from '../../../components/Modal.jsx';

export default function StudentAssignmentsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);
  const [notes, setNotes] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  function load() {
    setLoading(true);
    api('/api/lms/assignments').then(d => setItems(d.items)).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function open(a) {
    setActive(a);
    setNotes('');
    setFileUrl('');
    setError(null);
    try {
      const r = await api(`/api/lms/assignments/${a.id}`);
      setActive({ ...a, my_submission: r.item.my_submission });
    } catch {}
  }

  async function submit() {
    setSubmitting(true); setError(null);
    try {
      await api(`/api/lms/assignments/${active.id}/submit`, { method: 'POST', body: { notes, file_url: fileUrl } });
      setActive(null);
      load();
    } catch (e) { setError(e.data?.error || e.message); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">Assignments</h1>
        <p className="text-slate-500">Homework and projects. Submit before the due date.</p>
      </header>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500 text-xs uppercase">
            <tr><th className="px-3 py-2">Title</th><th>Subject</th><th>Due</th><th>Marks</th><th>Status</th><th className="text-right">Action</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">Loading…</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">No assignments.</td></tr>}
            {items.map(a => (
              <tr key={a.id} className="border-t border-slate-200">
                <td className="px-3 py-2 font-medium">{a.title}</td>
                <td className="px-3 py-2">{a.subject_name}</td>
                <td className="px-3 py-2 text-xs">{new Date(a.due_at).toLocaleString()}</td>
                <td className="px-3 py-2">{a.total_marks}</td>
                <td className="px-3 py-2">
                  {a.my_submission_id
                    ? <span className="text-xs text-emerald-700">Submitted</span>
                    : <span className="text-xs text-amber-700">Pending</span>}
                </td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => open(a)} className="text-xs text-brand-700 hover:underline">{a.my_submission_id ? 'View' : 'Submit'}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={!!active} onClose={() => setActive(null)}
             title={active?.my_submission ? 'Your submission' : 'Submit assignment'}
             size="lg"
             footer={!active?.my_submission ? <>
               <button className="btn-secondary" onClick={() => setActive(null)}>Cancel</button>
               <button className="btn-primary" onClick={submit} disabled={submitting}>{submitting ? 'Submitting…' : 'Submit'}</button>
             </> : <button className="btn-secondary" onClick={() => setActive(null)}>Close</button>}>
        {active && (
          <div className="space-y-3 text-sm">
            <div><strong>{active.title}</strong> · {active.subject_name}</div>
            <p className="text-slate-600">{active.description || 'No description.'}</p>
            <div className="text-xs text-slate-500">Due {new Date(active.due_at).toLocaleString()} · Total marks {active.total_marks}</div>
            <hr className="border-slate-200" />
            {active.my_submission ? (
              <div>
                <div className="text-xs text-slate-500">Submitted {active.my_submission.submitted_at ? new Date(active.my_submission.submitted_at).toLocaleString() : ''}</div>
                {active.my_submission.file_url && <div className="mt-1"><a href={active.my_submission.file_url} target="_blank" rel="noreferrer" className="text-brand-700 underline">Submitted file</a></div>}
                <p className="mt-2 whitespace-pre-line">{active.my_submission.notes}</p>
                {active.my_submission.marks_obtained != null && (
                  <div className="mt-3 p-3 bg-emerald-50 rounded">
                    <div className="text-xs text-slate-500">Graded</div>
                    <div className="text-xl font-semibold">{active.my_submission.marks_obtained}/{active.total_marks}</div>
                    {active.my_submission.feedback && <p className="mt-2 text-slate-700">{active.my_submission.feedback}</p>}
                  </div>
                )}
              </div>
            ) : (
              <>
                <div>
                  <label className="label">File URL (optional)</label>
                  <input className="input" value={fileUrl} onChange={e => setFileUrl(e.target.value)} placeholder="/uploads/your-file.pdf" />
                </div>
                <div>
                  <label className="label">Notes</label>
                  <textarea rows={5} className="input" value={notes} onChange={e => setNotes(e.target.value)} />
                </div>
                {error && <div className="text-sm text-red-600">Could not submit: {error}</div>}
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
