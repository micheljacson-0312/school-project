import { useEffect, useState } from 'react';
import Modal from '../../components/Modal.jsx';
import { api } from '../../lib/api.js';

// Settings key type. Drives the input field.
const TYPE_FIELD = {
  string:  { type: 'text' },
  text:    { type: 'textarea' },
  url:     { type: 'text', placeholder: 'https://…' },
  integer: { type: 'number' },
  boolean: { type: 'checkbox' },
  json:    { type: 'textarea', placeholder: '{ "key": "value" }' },
};

export default function SettingsAdminPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function load() {
    setLoading(true);
    api('/api/admin/settings').then(d => setItems(d.items)).finally(() => setLoading(false));
  }
  useEffect(load, []);

  function openEdit(it) {
    let value = it.value;
    if (it.type === 'boolean') value = it.value === 'true' || it.value === '1';
    else if (it.type === 'integer') value = it.value ?? '';
    else if (it.type === 'json') { try { value = JSON.stringify(JSON.parse(it.value), null, 2); } catch { value = it.value || ''; } }
    setForm({ key_name: it.key_name, type: it.type, value, description: it.description || '' });
    setModal(it.key_name);
    setError(null);
  }
  async function save() {
    setSaving(true); setError(null);
    try {
      let v = form.value;
      if (form.type === 'boolean') v = String(!!form.value);
      else if (form.type === 'integer') v = String(Number(form.value || 0));
      // string/text/url/json pass through
      await api(`/api/admin/settings/${form.key_name}`, { method: 'PUT', body: { value: v, description: form.description } });
      setModal(null); load();
    } catch (e) { setError(e.data?.error || e.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">Site settings</h1>
        <p className="text-slate-500">School name, contact info, social links, and feature flags used across the public site.</p>
      </header>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500 text-xs uppercase">
            <tr><th className="px-3 py-2">Key</th><th>Type</th><th>Value</th><th>Description</th><th className="text-right">Actions</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">Loading…</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">No settings.</td></tr>}
            {items.map(s => (
              <tr key={s.id} className="border-t border-slate-200 hover:bg-slate-50">
                <td className="px-3 py-2 font-mono text-xs">{s.key_name}</td>
                <td className="px-3 py-2 text-xs text-slate-500">{s.type}</td>
                <td className="px-3 py-2 max-w-md truncate">
                  {s.type === 'boolean'
                    ? <span className={s.value === 'true' ? 'text-emerald-700' : 'text-slate-400'}>{s.value === 'true' ? 'Yes' : 'No'}</span>
                    : s.value || <span className="text-slate-400">—</span>}
                </td>
                <td className="px-3 py-2 text-xs text-slate-500">{s.description || '—'}</td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => openEdit(s)} className="text-xs text-brand-700 hover:underline">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)}
             title={`Edit ${form.key_name}`}
             footer={<>
               <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
               <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
             </>}>
        <div className="space-y-3">
          <div>
            <label className="label">Value ({form.type})</label>
            {(() => {
              const f = TYPE_FIELD[form.type] || TYPE_FIELD.string;
              if (f.type === 'checkbox') return <input type="checkbox" checked={!!form.value} onChange={e => setForm(s => ({ ...s, value: e.target.checked }))} />;
              if (f.type === 'textarea') return <textarea rows={5} className="input" placeholder={f.placeholder} value={form.value || ''} onChange={e => setForm(s => ({ ...s, value: e.target.value }))} />;
              return <input type={f.type} className="input" placeholder={f.placeholder} value={form.value ?? ''} onChange={e => setForm(s => ({ ...s, value: e.target.value }))} />;
            })()}
          </div>
          <div>
            <label className="label">Description</label>
            <input className="input" value={form.description || ''} onChange={e => setForm(s => ({ ...s, description: e.target.value }))} />
          </div>
          {error && <div className="text-sm text-red-600">Could not save: {error}</div>}
        </div>
      </Modal>
    </div>
  );
}
