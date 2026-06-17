// Bill generation (Phase 6) — picks a structure × class/section and generates
// fee_collections for every active student in that section.
import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';

export default function GenerateBillsAdminPage() {
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [structures, setStructures] = useState([]);
  const [filter, setFilter] = useState({ structure_id: '', class_id: '', section_id: '', session_id: '', due_date: '', amount_override: '' });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      api('/api/admin/academic/classes'),
      api('/api/admin/academic/sections'),
      api('/api/admin/academic/sessions'),
      api('/api/accountant/fee-structures'),
    ]).then(([c, sec, s, fs]) => { setClasses(c.items); setSections(sec.items); setSessions(s.items); setStructures(fs.items); });
  }, []);

  async function generate() {
    if (!filter.structure_id || !filter.class_id || !filter.section_id) { setError('Pick structure, class, and section.'); return; }
    setBusy(true); setResult(null); setError(null);
    try {
      const body = {
        fee_structure_id: Number(filter.structure_id),
        class_id: Number(filter.class_id),
        section_id: Number(filter.section_id),
        session_id: Number(filter.session_id),
      };
      if (filter.due_date) body.due_date = filter.due_date;
      if (filter.amount_override) body.amount_override = Number(filter.amount_override);
      const r = await api('/api/accountant/generate-bills', { method: 'POST', body });
      setResult(r);
    } catch (e) { setError(e.data?.error || e.message); }
    finally { setBusy(false); }
  }

  const sectionOpts = sections.filter(s => String(s.class_id) === String(filter.class_id));
  const structOpts = structures.filter(s => String(s.class_id) === String(filter.class_id));

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">Generate bills</h1>
        <p className="text-slate-500">Pick a fee structure, class, and section. Bills are created for every active student (skipped if they already have an unpaid one for the same structure). Per-student discounts are auto-applied based on the highest-priority applicable rule.</p>
      </header>

      <div className="card"><div className="card-body grid sm:grid-cols-3 gap-3">
        <div>
          <label className="label">Fee structure</label>
          <select className="input" value={filter.structure_id} onChange={e => setFilter({ ...filter, structure_id: e.target.value, class_id: '', section_id: '' })}>
            <option value="">Select…</option>
            {structures.map(s => <option key={s.id} value={s.id}>{s.class_name} · {s.name} · PKR {Number(s.amount).toLocaleString()}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Class</label>
          <select className="input" value={filter.class_id} onChange={e => setFilter({ ...filter, class_id: e.target.value, section_id: '' })}>
            <option value="">Select…</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Section</label>
          <select className="input" value={filter.section_id} onChange={e => setFilter({ ...filter, section_id: e.target.value })} disabled={!filter.class_id}>
            <option value="">Select…</option>
            {sectionOpts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Session</label>
          <select className="input" value={filter.session_id} onChange={e => setFilter({ ...filter, session_id: e.target.value })}>
            <option value="">Current</option>
            {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Override due date</label>
          <input type="date" className="input" value={filter.due_date} onChange={e => setFilter({ ...filter, due_date: e.target.value })} />
        </div>
        <div>
          <label className="label">Amount override (PKR)</label>
          <input type="number" className="input" value={filter.amount_override} onChange={e => setFilter({ ...filter, amount_override: e.target.value })} placeholder="leave blank for structure default" />
        </div>
      </div></div>

      <div className="flex justify-end gap-2">
        <button onClick={generate} disabled={busy} className="btn-primary">{busy ? 'Generating…' : 'Generate bills'}</button>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}
      {result && (
        <div className="card"><div className="card-body">
          <h2 className="font-semibold">Result</h2>
          <p className="text-sm text-slate-700">
            Generated <strong>{result.generated}</strong> bill(s) out of <strong>{result.roster_count}</strong> students in this section.
            Skipped <strong>{result.skipped_existing}</strong> that already had an unpaid bill for this structure.
          </p>
        </div></div>
      )}
    </div>
  );
}
