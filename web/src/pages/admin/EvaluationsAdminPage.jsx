// Admin evaluation form builder + responses viewer (Phase 5).
import { useEffect, useState } from 'react';
import Modal from '../../components/Modal.jsx';
import { api } from '../../lib/api.js';

const AUDIENCES = [
  { value: 'all', label: 'Everyone' },
  { value: 'students', label: 'Students' },
  { value: 'teachers', label: 'Teachers' },
  { value: 'parents', label: 'Parents' },
  { value: 'staff', label: 'Staff (coordinator/accountant/operator)' },
];

const blank = { title: '', audience: 'all', schema_json: [{ id: 'q1', type: 'rating', prompt: 'Overall, how satisfied are you?', scale: 5 }], is_active: true };

export default function EvaluationsAdminPage() {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(blank);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [responses, setResponses] = useState(null);
  const [summary, setSummary] = useState(null);

  function load() {
    setLoading(true);
    api('/api/evaluation/forms').then(d => setForms(d.items || [])).finally(() => setLoading(false));
  }
  useEffect(load, []);

  function openCreate() { setForm(blank); setModal('create'); setError(null); setResponses(null); setSummary(null); }
  function openEdit(f) {
    let schema = f.schema_json;
    if (typeof schema === 'string') try { schema = JSON.parse(schema); } catch {}
    setForm({ title: f.title, audience: f.audience, schema_json: Array.isArray(schema) ? schema : [], is_active: !!f.is_active });
    setModal({ id: f.id });
    setError(null); setResponses(null); setSummary(null);
  }
  async function save() {
    setSubmitting(true); setError(null);
    try {
      if (modal === 'create') await api('/api/evaluation/forms', { method: 'POST', body: form });
      else await api(`/api/evaluation/forms/${modal.id}`, { method: 'PUT', body: form });
      setModal(null); load();
    } catch (e) { setError(e.data?.error || e.message); }
    finally { setSubmitting(false); }
  }
  async function deactivate(f) {
    if (!confirm(`Deactivate "${f.title}"?`)) return;
    await api(`/api/evaluation/forms/${f.id}`, { method: 'DELETE' });
    load();
  }
  async function viewResponses(f) {
    setResponses({ form: f, loading: true });
    setSummary(null);
    try {
      const [r, s] = await Promise.all([
        api(`/api/evaluation/forms/${f.id}/responses`),
        api(`/api/evaluation/forms/${f.id}/summary`),
      ]);
      setResponses({ form: f, items: r.items });
      setSummary(s);
    } catch (e) { setResponses({ form: f, error: e.message }); }
  }

  function addQuestion() {
    const next = (form.schema_json.length + 1);
    setForm(f => ({ ...f, schema_json: [...f.schema_json, { id: `q${next}`, type: 'rating', prompt: '', scale: 5 }] }));
  }
  function updateQ(i, patch) {
    setForm(f => ({ ...f, schema_json: f.schema_json.map((q, j) => j === i ? { ...q, ...patch } : q) }));
  }
  function removeQ(i) {
    setForm(f => ({ ...f, schema_json: f.schema_json.filter((_, j) => j !== i) }));
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Evaluation forms</h1>
          <p className="text-slate-500">Build feedback forms. Active forms appear on user dashboards.</p>
        </div>
        <button onClick={openCreate} className="btn-primary text-sm">+ New form</button>
      </header>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500 text-xs uppercase">
            <tr><th className="px-3 py-2">Title</th><th>Audience</th><th>Status</th><th>Created</th><th className="text-right">Actions</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">Loading…</td></tr>}
            {!loading && forms.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">No forms.</td></tr>}
            {forms.map(f => (
              <tr key={f.id} className="border-t border-slate-200">
                <td className="px-3 py-2 font-medium">{f.title}</td>
                <td className="px-3 py-2 text-xs">{f.audience}</td>
                <td className="px-3 py-2">
                  <span className={'text-xs px-2 py-0.5 rounded ' + (f.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600')}>
                    {f.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs text-slate-500">{f.created_at ? new Date(f.created_at).toLocaleDateString() : '—'}</td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <button onClick={() => viewResponses(f)} className="text-xs text-brand-700 hover:underline mr-3">Responses</button>
                  <button onClick={() => openEdit(f)} className="text-xs text-brand-700 hover:underline mr-3">Edit</button>
                  {f.is_active && <button onClick={() => deactivate(f)} className="text-xs text-red-600 hover:underline">Deactivate</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {summary && (
        <div className="card"><div className="card-body">
          <h2 className="font-semibold">Summary — {summary.form_id ? '' : ''}{summary.respondents} respondents</h2>
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

      {responses?.items && (
        <div className="card"><div className="card-body">
          <h2 className="font-semibold mb-2">Individual responses ({responses.items.length})</h2>
          <ul className="space-y-2 text-sm">
            {responses.items.slice(0, 20).map(r => (
              <li key={r.id} className="border-t border-slate-200 pt-2">
                <div className="text-xs text-slate-500">{r.respondent_name} · {new Date(r.created_at).toLocaleString()}</div>
                <pre className="bg-slate-50 rounded p-2 text-xs overflow-x-auto">{JSON.stringify(r.answers_json, null, 2)}</pre>
              </li>
            ))}
          </ul>
        </div></div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} size="xl"
             title={modal === 'create' ? 'New evaluation form' : 'Edit evaluation form'}
             footer={<>
               <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
               <button className="btn-primary" onClick={save} disabled={submitting}>{submitting ? 'Saving…' : 'Save'}</button>
             </>}>
        <div className="space-y-3">
          <div>
            <label className="label">Title *</label>
            <input className="input" value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <label className="label">Audience</label>
            <select className="input" value={form.audience} onChange={e => setForm(f => ({ ...f, audience: e.target.value }))}>
              {AUDIENCES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Active</label>
            <div><input type="checkbox" checked={!!form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} /> Published</div>
          </div>
          <hr className="border-slate-200" />
          <h3 className="font-semibold">Questions</h3>
          {form.schema_json?.map((q, i) => (
            <div key={i} className="border border-slate-200 rounded p-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-600">Q{i+1}</span>
                <button type="button" onClick={() => removeQ(i)} className="text-xs text-red-600">Remove</button>
              </div>
              <div>
                <label className="label">Prompt *</label>
                <input className="input" value={q.prompt || ''} onChange={e => updateQ(i, { prompt: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Type</label>
                  <select className="input" value={q.type} onChange={e => updateQ(i, { type: e.target.value })}>
                    <option value="rating">Rating (1-N)</option>
                    <option value="text">Text</option>
                    <option value="yesno">Yes / No</option>
                  </select>
                </div>
                {q.type === 'rating' && (
                  <div>
                    <label className="label">Scale (max)</label>
                    <input type="number" min={2} max={10} className="input" value={q.scale || 5} onChange={e => updateQ(i, { scale: Number(e.target.value) })} />
                  </div>
                )}
              </div>
            </div>
          ))}
          <button type="button" onClick={addQuestion} className="text-sm text-brand-700 hover:underline">+ Add question</button>
          {error && <div className="text-sm text-red-600">{error}</div>}
        </div>
      </Modal>
    </div>
  );
}
