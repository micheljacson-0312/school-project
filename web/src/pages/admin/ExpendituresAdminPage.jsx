// Expenditures (Phase 6) — operational expense tracking.
import { useEffect, useState } from 'react';
import Modal from '../../components/Modal.jsx';
import { api } from '../../lib/api.js';

const blank = { category: 'utilities', description: '', amount: 0, spent_on: new Date().toISOString().slice(0,10), vendor: '', payment_method: 'cash', reference: '', notes: '' };

const CATEGORIES = ['utilities','supplies','salaries','maintenance','transport','events','technology','misc'];

export default function ExpendituresAdminPage() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState({ category: '', from: '', to: '' });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(blank);
  const [submitting, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function load() {
    setLoading(true);
    const params = new URLSearchParams();
    Object.entries(filter).forEach(([k, v]) => { if (v) params.set(k, v); });
    api(`/api/accountant/expenditures?${params}`).then(d => setItems(d.items)).finally(() => setLoading(false));
  }
  useEffect(load, [filter.category, filter.from, filter.to]);

  function openCreate() { setForm(blank); setModal('create'); setError(null); }
  async function save() {
    setSaving(true); setError(null);
    try {
      await api('/api/accountant/expenditures', { method: 'POST', body: { ...form, amount: Number(form.amount) } });
      setModal(null); load();
    } catch (e) { setError(e.data?.error || e.message); }
    finally { setSaving(false); }
  }
  async function remove(s) {
    if (!confirm(`Delete expenditure "${s.description}"?`)) return;
    await api(`/api/accountant/expenditures/${s.id}`, { method: 'DELETE' });
    load();
  }

  const total = items.reduce((s, i) => s + Number(i.amount), 0);

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Expenditures</h1>
          <p className="text-slate-500">Operational expenses — utilities, supplies, salaries, etc.</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500">Total (filtered)</div>
          <div className="text-2xl font-semibold">PKR {total.toLocaleString()}</div>
        </div>
      </header>

      <div className="card">
        <div className="card-body grid sm:grid-cols-4 gap-3">
          <div>
            <label className="label">Category</label>
            <select className="input" value={filter.category} onChange={e => setFilter({ ...filter, category: e.target.value })}>
              <option value="">All</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">From</label>
            <input type="date" className="input" value={filter.from} onChange={e => setFilter({ ...filter, from: e.target.value })} />
          </div>
          <div>
            <label className="label">To</label>
            <input type="date" className="input" value={filter.to} onChange={e => setFilter({ ...filter, to: e.target.value })} />
          </div>
          <div className="flex items-end">
            <button onClick={openCreate} className="btn-primary w-full text-sm">+ New expenditure</button>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500 text-xs uppercase">
            <tr><th className="px-3 py-2">Date</th><th>Category</th><th>Description</th><th>Vendor</th><th>Method</th><th>Amount</th><th>By</th><th className="text-right">Actions</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} className="px-3 py-6 text-center text-slate-500">Loading…</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={8} className="px-3 py-6 text-center text-slate-500">No expenditures.</td></tr>}
            {items.map(s => (
              <tr key={s.id} className="border-t border-slate-200">
                <td className="px-3 py-2 text-xs">{s.spent_on?.slice(0,10)}</td>
                <td className="px-3 py-2"><span className="text-xs px-2 py-0.5 rounded bg-slate-100">{s.category}</span></td>
                <td className="px-3 py-2 font-medium">{s.description}</td>
                <td className="px-3 py-2 text-xs">{s.vendor || '—'}</td>
                <td className="px-3 py-2 text-xs">{s.payment_method}</td>
                <td className="px-3 py-2 font-semibold">PKR {Number(s.amount).toLocaleString()}</td>
                <td className="px-3 py-2 text-xs text-slate-500">{s.incurred_by_name || '—'}</td>
                <td className="px-3 py-2 text-right"><button onClick={() => remove(s)} className="text-xs text-red-600 hover:underline">Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title="New expenditure"
             footer={<>
               <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
               <button className="btn-primary" onClick={save} disabled={submitting}>{submitting ? 'Saving…' : 'Save'}</button>
             </>}>
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Category *</label>
              <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Spent on *</label>
              <input type="date" className="input" value={form.spent_on} onChange={e => setForm(f => ({ ...f, spent_on: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Description *</label>
            <input className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Amount (PKR) *</label>
              <input type="number" className="input" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div>
              <label className="label">Vendor</label>
              <input className="input" value={form.vendor} onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Payment method</label>
              <select className="input" value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}>
                <option value="cash">Cash</option><option value="bank">Bank</option>
                <option value="cheque">Cheque</option><option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="label">Reference (cheque # / receipt)</label>
              <input className="input" value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea rows={2} className="input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
        </div>
      </Modal>
    </div>
  );
}
