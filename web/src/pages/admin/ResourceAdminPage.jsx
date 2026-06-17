// Generic resource admin page — list/create/edit/delete for any table.
// Self-contained (no circular imports). Used by SessionsPage and
// ClassesPage stubs and any other simple CRUD page.
//
// Props:
//   title        – display name in the page header
//   endpoint     – API base, e.g. "/api/admin/academic/classes"
//   fields       – array of column definitions:
//                  { name, label, type, required, options?, coerce?, render? }
//                  type ? "string" | "text" | "number" | "date" | "bool" | "select"
//   primaryKey   – default "id"
//   emptyMessage – shown when list is empty
import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';

function FieldInput({ field, value, onChange }) {
  const base = 'input';
  const v = value ?? '';
  switch (field.type) {
    case 'text':
      return <textarea className={base} rows={3} value={v}
                      onChange={e => onChange(e.target.value)} />;
    case 'number':
      return <input className={base} type="number" value={v}
                    onChange={e => onChange(field.coerce === 'int' ? parseInt(e.target.value, 10) || '' : Number(e.target.value))} />;
    case 'date':
      return <input className={base} type="date" value={String(v).slice(0, 10)}
                    onChange={e => onChange(e.target.value)} />;
    case 'bool':
      return <input type="checkbox" checked={!!v}
                    onChange={e => onChange(e.target.checked ? 1 : 0)} />;
    case 'select':
      return (
        <select className={base} value={v} onChange={e => onChange(e.target.value)}>
          <option value="">—</option>
          {(field.options || []).map(o =>
            <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    default:
      return <input className={base} type="text" value={v}
                    onChange={e => onChange(e.target.value)} />;
  }
}

export default function ResourceAdminPage({
  title, endpoint, fields, primaryKey = 'id', emptyMessage = 'No records yet.',
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | 'new' | row
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const d = await api(endpoint);
      setItems(d.items || d || []);
    } catch (e) {
      setError(e.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [endpoint]);

  function openNew() {
    setEditing('new');
    setForm(Object.fromEntries(fields.map(f => [f.name, f.type === 'bool' ? 0 : ''])));
    setError(null);
  }
  function openEdit(row) {
    setEditing(row);
    setForm({ ...row });
    setError(null);
  }
  function cancel() { setEditing(null); setError(null); }
  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function save(e) {
    e?.preventDefault?.();
    setSaving(true);
    setError(null);
    try {
      if (editing === 'new') {
        await api(endpoint, { method: 'POST', body: form });
      } else {
        await api(`${endpoint}/${editing[primaryKey]}`, { method: 'PUT', body: form });
      }
      setEditing(null);
      await load();
    } catch (err) {
      setError(err.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(row) {
    if (!confirm(`Delete this ${title.replace(/s$/, '')}?`)) return;
    await api(`${endpoint}/${row[primaryKey]}`, { method: 'DELETE' });
    await load();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="text-sm text-slate-500">{items.length} record{items.length === 1 ? '' : 's'}</p>
        </div>
        <button onClick={openNew} className="btn-primary">+ Add new</button>
      </div>

      {error && <div className="text-sm text-red-700 bg-red-50 p-2 rounded">{error}</div>}

      {editing && (
        <form onSubmit={save} className="card">
          <div className="card-body space-y-3">
            <h2 className="text-lg font-semibold">
              {editing === 'new' ? 'Create' : `Edit #${editing[primaryKey]}`}
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {fields.map(f => (
                <div key={f.name} className={f.type === 'text' ? 'sm:col-span-2' : ''}>
                  <label className="label">
                    {f.label}{f.required && <span className="text-red-600"> *</span>}
                  </label>
                  <FieldInput field={f} value={form[f.name]} onChange={v => set(f.name, v)} />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button type="button" onClick={cancel} className="btn-secondary">Cancel</button>
              <button className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </form>
      )}

      {loading ? <p className="text-slate-500">Loading…</p> :
        items.length === 0 ? (
          <div className="card"><div className="card-body text-slate-500">{emptyMessage}</div></div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left">
                <tr>
                  {fields.map(f => <th key={f.name} className="p-3">{f.label}</th>)}
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map(row => (
                  <tr key={row[primaryKey]} className="border-t border-slate-100">
                    {fields.map(f => (
                      <td key={f.name} className="p-3">
                        {f.render ? f.render(row[f.name], row) :
                         f.type === 'bool' ? (row[f.name] ? '?' : '—') :
                         String(row[f.name] ?? '—')}
                      </td>
                    ))}
                    <td className="p-3 text-right space-x-2">
                      <button onClick={() => openEdit(row)} className="text-brand-700 hover:underline">Edit</button>
                      <button onClick={() => remove(row)} className="text-red-600 hover:underline">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
    </div>
  );
}