// Collections management (Phase 6) — list fee_collections + record payments.
import { useEffect, useMemo, useState } from 'react';
import Modal from '../../components/Modal.jsx';
import { api } from '../../lib/api.js';

const STATUSES = ['unpaid','partial','paid','overdue','waived'];

export default function CollectionsAdminPage() {
  const [items, setItems] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', class_id: '', section_id: '', q: '' });
  const [active, setActive] = useState(null);
  const [payForm, setPayForm] = useState({ amount: '', payment_method: 'cash', reference: '', notes: '' });
  const [submitting, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(null);
  const [error, setError] = useState(null);

  function load() {
    setLoading(true);
    const params = new URLSearchParams();
    Object.entries(filter).forEach(([k, v]) => { if (v) params.set(k, v); });
    Promise.all([
      api(`/api/accountant/collections?${params}`),
      api('/api/admin/academic/classes'),
      api('/api/admin/academic/sections'),
    ]).then(([c, cls, sec]) => { setItems(c.items); setClasses(cls.items); setSections(sec.items); }).finally(() => setLoading(false));
  }
  useEffect(load, [filter.status, filter.class_id, filter.section_id, filter.q]);

  function openPayment(c) {
    setActive(c); setPayForm({ amount: String(Number(c.net_amount) - Number(c.paid_amount)), payment_method: 'cash', reference: '', notes: '' });
    setSavedMsg(null); setError(null);
  }
  async function submitPayment() {
    setSaving(true); setError(null); setSavedMsg(null);
    try {
      const r = await api(`/api/accountant/collections/${active.id}/payment`, { method: 'POST', body: {
        amount: Number(payForm.amount),
        payment_method: payForm.payment_method,
        reference: payForm.reference || undefined,
        notes: payForm.notes || undefined,
      }});
      setSavedMsg(`Paid PKR ${r.new_paid}. Status: ${r.status}. Outstanding: PKR ${r.outstanding}`);
      load();
    } catch (e) { setError(e.data?.error || e.message); }
    finally { setSaving(false); }
  }

  const totals = useMemo(() => ({
    gross: items.reduce((s, i) => s + Number(i.net_amount), 0),
    paid:  items.reduce((s, i) => s + Number(i.paid_amount), 0),
    outstanding: items.reduce((s, i) => s + Number(i.net_amount - i.paid_amount), 0),
  }), [items]);

  const sectionOpts = sections.filter(s => String(s.class_id) === String(filter.class_id));

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">Collections</h1>
        <p className="text-slate-500">All bills, payments, and outstanding balances.</p>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <div className="card"><div className="card-body"><div className="text-xs text-slate-500">Gross</div><div className="text-2xl font-semibold">PKR {totals.gross.toLocaleString()}</div></div></div>
        <div className="card"><div className="card-body"><div className="text-xs text-slate-500">Collected</div><div className="text-2xl font-semibold text-emerald-700">PKR {totals.paid.toLocaleString()}</div></div></div>
        <div className="card"><div className="card-body"><div className="text-xs text-slate-500">Outstanding</div><div className="text-2xl font-semibold text-red-700">PKR {totals.outstanding.toLocaleString()}</div></div></div>
      </div>

      <div className="card">
        <div className="card-body grid sm:grid-cols-4 gap-3">
          <div>
            <label className="label">Status</label>
            <select className="input" value={filter.status} onChange={e => setFilter({ ...filter, status: e.target.value })}>
              <option value="">Any</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Class</label>
            <select className="input" value={filter.class_id} onChange={e => setFilter({ ...filter, class_id: e.target.value, section_id: '' })}>
              <option value="">Any</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Section</label>
            <select className="input" value={filter.section_id} onChange={e => setFilter({ ...filter, section_id: e.target.value })} disabled={!filter.class_id}>
              <option value="">Any</option>
              {sectionOpts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Search</label>
            <input className="input" value={filter.q} onChange={e => setFilter({ ...filter, q: e.target.value })} placeholder="name or adm #" />
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500 text-xs uppercase">
            <tr>
              <th className="px-3 py-2">Adm #</th><th>Name</th><th>Class</th><th>Structure</th>
              <th>Net</th><th>Paid</th><th>Outstanding</th><th>Due</th><th>Status</th><th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={10} className="px-3 py-6 text-center text-slate-500">Loading…</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={10} className="px-3 py-6 text-center text-slate-500">No bills match.</td></tr>}
            {items.map(c => (
              <tr key={c.id} className="border-t border-slate-200">
                <td className="px-3 py-2 font-mono text-xs">{c.admission_no}</td>
                <td className="px-3 py-2 font-medium">{c.student_name}</td>
                <td className="px-3 py-2 text-xs">{c.class_name}/{c.section_name}</td>
                <td className="px-3 py-2 text-xs">{c.structure_name}</td>
                <td className="px-3 py-2">PKR {Number(c.net_amount).toLocaleString()}</td>
                <td className="px-3 py-2 text-emerald-700">PKR {Number(c.paid_amount).toLocaleString()}</td>
                <td className="px-3 py-2 font-semibold">PKR {Number(c.net_amount - c.paid_amount).toLocaleString()}</td>
                <td className="px-3 py-2 text-xs">{c.due_date?.slice(0,10)}</td>
                <td className="px-3 py-2">
                  <span className={'text-xs px-2 py-0.5 rounded ' + (
                    c.status === 'paid'    ? 'bg-emerald-100 text-emerald-700' :
                    c.status === 'overdue' ? 'bg-red-100 text-red-700' :
                    c.status === 'partial' ? 'bg-amber-100 text-amber-700' :
                    c.status === 'waived'  ? 'bg-slate-100 text-slate-600' :
                                             'bg-slate-100 text-slate-700'
                  )}>{c.status}</span>
                </td>
                <td className="px-3 py-2 text-right">
                  {c.status !== 'paid' && c.status !== 'waived' && (
                    <button onClick={() => openPayment(c)} className="text-xs text-brand-700 hover:underline">Receive payment</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={!!active} onClose={() => setActive(null)} title={active ? `Receive payment · ${active.student_name}` : 'Receive payment'}
             footer={<>
               <button className="btn-secondary" onClick={() => setActive(null)}>Cancel</button>
               <button className="btn-primary" onClick={submitPayment} disabled={submitting}>{submitting ? 'Saving…' : 'Save payment'}</button>
             </>}>
        {active && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
              <div>Net: <strong>PKR {Number(active.net_amount).toLocaleString()}</strong></div>
              <div>Already paid: <strong>PKR {Number(active.paid_amount).toLocaleString()}</strong></div>
              <div>Challan: <strong>{active.challan_no}</strong></div>
              <div>Due: <strong>{active.due_date?.slice(0,10)}</strong></div>
            </div>
            <hr className="border-slate-200" />
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Amount (PKR)</label>
                <input type="number" className="input" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div>
                <label className="label">Payment method</label>
                <select className="input" value={payForm.payment_method} onChange={e => setPayForm(f => ({ ...f, payment_method: e.target.value }))}>
                  <option value="cash">Cash</option><option value="bank">Bank transfer</option>
                  <option value="cheque">Cheque</option><option value="other">Other</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label">Reference (receipt / cheque #)</label>
              <input className="input" value={payForm.reference} onChange={e => setPayForm(f => ({ ...f, reference: e.target.value }))} />
            </div>
            <div>
              <label className="label">Notes</label>
              <input className="input" value={payForm.notes} onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            {error && <div className="text-sm text-red-600">{error}</div>}
            {savedMsg && <div className="text-sm text-emerald-700">✓ {savedMsg}</div>}
          </div>
        )}
      </Modal>
    </div>
  );
}
