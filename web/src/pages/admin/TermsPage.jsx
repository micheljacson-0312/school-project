import { useEffect, useState } from 'react';
import Modal from '../../components/Modal.jsx';
import { api } from '../../lib/api.js';

const FIELDS = [
  { name: 'session_id', label: 'Session',     type: 'select', required: true, options: [] },
  { name: 'name',       label: 'Term name',   type: 'string', required: true },
  { name: 'start_date', label: 'Start date',  type: 'date',   required: true },
  { name: 'end_date',   label: 'End date',    type: 'date',   required: true },
  { name: 'is_current', label: 'Current',     type: 'bool' },
];

export default function TermsPage() {
  const [items, setItems] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  function load() {
    setLoading(true);
    Promise.all([
      api('/api/admin/academic/terms'),
      api('/api/admin/academic/sessions'),
    ]).then(([t, s]) => {
      setItems(t.items);
      setSessions(s.items);
    }).finally(() => setLoading(false));
  }
  useEffect(load, []);

  const fields = FIELDS.map(f => f.name === 'session_id' ? { ...f, options: sessions.map(s => ({ value: s.id, label: s.name })) } : f);

  function openCreate() {
    const f = {}; for (const fld of fields) f[fld.name] = fld.type === 'bool' ? false : '';
    setForm(f); setModal('create'); setError(null);
  }
  function openEdit(it) {
    const f = {};
    for (const fld of fields) f[fld.name] = it[fld.name] ?? (fld.type === 'bool' ? false : '');
    setForm(f); setModal({ id: it.id }); setError(null);
  }
  async function save() {
    setSubmitting(true); setError(null);
    try {
      const body = {};
      for (const fld of fields) {
        if (form[fld.name] === '' || form[fld.name] == null) continue;
        if (fld.coerce === 'int' || fld.name === 'session_id') body[fld.name] = Number(form[fld.name]);
        else if (fld.type === 'bool') body[fld.name] = Boolean(form[fld.name]);
        else body[fld.name] = form[fld.name];
      }
      if (modal === 'create') await api('/api/admin/academic/terms', { method: 'POST', body });
      else await api(`/api/admin/academic/terms/${modal.id}`, { method: 'PUT', body });
      setModal(null); load();
    } catch (e) { setError(e.data?.error || e.message); }
    finally { setSubmitting(false); }
  }
  async function remove(it) {
    if (!confirm(`Delete term "${it.name}"?`)) return;
    await api(`/api/admin/academic/terms/${it.id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Terms</h1>
          <p className="text-slate-500">Exam periods within a session.</p>
        </div>
        <button onClick={openCreate} className="btn-primary text-sm">+ New term</button>
      </header>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500 text-xs uppercase">
            <tr><th className="px-3 py-2">Session</th><th>Name</th><th>Start</th><th>End</th><th>Current</th><th className="text-right">Actions</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">Loading…</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">No terms yet.</td></tr>}
            {items.map(t => (
              <tr key={t.id} className="border-t border-slate-200 hover:bg-slate-50">
                <td className="px-3 py-2">{t.session_name}</td>
                <td className="px-3 py-2 font-medium">{t.name}</td>
                <td className="px-3 py-2">{t.start_date?.slice(0,10)}</td>
                <td className="px-3 py-2">{t.end_date?.slice(0,10)}</td>
                <td className="px-3 py-2">{t.is_current ? <span className="text-emerald-700">Yes</span> : '—'}</td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <button onClick={() => openEdit(t)} className="text-xs text-brand-700 hover:underline mr-3">Edit</button>
                  <button onClick={() => remove(t)} className="text-xs text-red-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)}
             title={modal === 'create' ? 'New term' : 'Edit term'}
             footer={<>
               <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
               <button className="btn-primary" onClick={save} disabled={submitting}>{submitting ? 'Saving…' : 'Save'}</button>
             </>}>
        <div className="space-y-3">
          {fields.map(f => (
            <div key={f.name}>
              <label className="label">{f.label}{f.required ? ' *' : ''}</label>
              {f.type === 'select' ? (
                <select className="input" value={form[f.name] || ''} onChange={e => setForm(s => ({ ...s, [f.name]: e.target.value }))}>
                  <option value="">Select…</option>
                  {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : f.type === 'bool' ? (
                <input type="checkbox" checked={!!form[f.name]} onChange={e => setForm(s => ({ ...s, [f.name]: e.target.checked }))} />
              ) : f.type === 'date' ? (
                <input type="date" className="input" value={form[f.name] || ''} onChange={e => setForm(s => ({ ...s, [f.name]: e.target.value }))} />
              ) : (
                <input className="input" value={form[f.name] || ''} onChange={e => setForm(s => ({ ...s, [f.name]: e.target.value }))} />
              )}
            </div>
          ))}
          {error && <div className="text-sm text-red-600">Could not save: {error}</div>}
        </div>
      </Modal>
    </div>
  );
}
