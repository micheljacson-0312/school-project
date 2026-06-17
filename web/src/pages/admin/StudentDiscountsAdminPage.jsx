// Per-student discount assignment (Phase 6) — assign rules to students.
import { useEffect, useMemo, useState } from 'react';
import Modal from '../../components/Modal.jsx';
import { api } from '../../lib/api.js';

const blank = { student_id: '', fee_structure_id: '', discount_rule_id: '', valid_from: new Date().toISOString().slice(0,10), valid_to: '' };

export default function StudentDiscountsAdminPage() {
  const [items, setItems] = useState([]);
  const [rules, setRules] = useState([]);
  const [structures, setStructures] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(blank);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  function load() {
    setLoading(true);
    Promise.all([
      api('/api/accountant/student-discounts'),
      api('/api/accountant/discount-rules'),
      api('/api/accountant/fee-structures'),
      api('/api/admin/academic/students'),
    ]).then(([sd, r, fs, st]) => {
      setItems(sd.items); setRules(r.items); setStructures(fs.items); setStudents(st.items);
    }).finally(() => setLoading(false));
  }
  useEffect(load, []);

  function openCreate() { setForm(blank); setModal('create'); setError(null); }
  async function save() {
    setSubmitting(true); setError(null);
    try {
      const body = {
        student_id: Number(form.student_id),
        fee_structure_id: form.fee_structure_id ? Number(form.fee_structure_id) : null,
        discount_rule_id: Number(form.discount_rule_id),
        valid_from: form.valid_from,
        valid_to: form.valid_to || undefined,
      };
      await api('/api/accountant/student-discounts', { method: 'POST', body });
      setModal(null); load();
    } catch (e) { setError(e.data?.error || e.message); }
    finally { setSubmitting(false); }
  }
  async function remove(sd) {
    if (!confirm(`Remove this discount assignment?`)) return;
    await api(`/api/accountant/student-discounts/${sd.id}`, { method: 'DELETE' });
    load();
  }

  const studentMap = useMemo(() => Object.fromEntries(students.map(s => [String(s.user_id || s.student_id), s])), [students]);

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Student discounts</h1>
          <p className="text-slate-500">Apply a discount rule to a student (optionally scoped to a specific fee structure).</p>
        </div>
        <button onClick={openCreate} className="btn-primary text-sm">+ Assign discount</button>
      </header>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500 text-xs uppercase">
            <tr><th className="px-3 py-2">Student</th><th>Rule</th><th>Structure</th><th>Discount %</th><th>Valid from → to</th><th className="text-right">Actions</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">Loading…</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">No assignments yet.</td></tr>}
            {items.map(sd => (
              <tr key={sd.id} className="border-t border-slate-200">
                <td className="px-3 py-2 font-medium">{sd.student_name} <span className="text-xs text-slate-500">({sd.admission_no})</span></td>
                <td className="px-3 py-2">{sd.rule_name}</td>
                <td className="px-3 py-2 text-xs">{sd.structure_name || 'all structures'}</td>
                <td className="px-3 py-2 font-semibold">{Number(sd.discount_percent)}%</td>
                <td className="px-3 py-2 text-xs">{sd.valid_from?.slice(0,10)} → {sd.valid_to?.slice(0,10) || 'open-ended'}</td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => remove(sd)} className="text-xs text-red-600 hover:underline">Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title="Assign discount"
             footer={<>
               <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
               <button className="btn-primary" onClick={save} disabled={submitting}>{submitting ? 'Saving…' : 'Save'}</button>
             </>}>
        <div className="space-y-3">
          <div>
            <label className="label">Student *</label>
            <select className="input" value={form.student_id} onChange={e => setForm(f => ({ ...f, student_id: e.target.value }))}>
              <option value="">Select…</option>
              {students.map(s => <option key={s.student_id} value={s.student_id}>{s.full_name} ({s.admission_no})</option>)}
            </select>
          </div>
          <div>
            <label className="label">Discount rule *</label>
            <select className="input" value={form.discount_rule_id} onChange={e => setForm(f => ({ ...f, discount_rule_id: e.target.value }))}>
              <option value="">Select…</option>
              {rules.map(r => <option key={r.id} value={r.id}>{r.display_name} ({Number(r.discount_percent)}%)</option>)}
            </select>
          </div>
          <div>
            <label className="label">Apply to structure (optional — leave blank for all)</label>
            <select className="input" value={form.fee_structure_id} onChange={e => setForm(f => ({ ...f, fee_structure_id: e.target.value }))}>
              <option value="">All structures</option>
              {structures.map(s => <option key={s.id} value={s.id}>{s.class_name} · {s.name}</option>)}
            </select>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Valid from *</label>
              <input type="date" className="input" value={form.valid_from} onChange={e => setForm(f => ({ ...f, valid_from: e.target.value }))} />
            </div>
            <div>
              <label className="label">Valid to (optional)</label>
              <input type="date" className="input" value={form.valid_to} onChange={e => setForm(f => ({ ...f, valid_to: e.target.value }))} />
            </div>
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
        </div>
      </Modal>
    </div>
  );
}
