// Reports & Analytics exports (Phase 7) — CSV download triggers.
import { useEffect, useMemo, useState } from 'react';
import { api, getAccessToken } from '../../lib/api.js';

async function downloadCSV(path, filename) {
  const token = getAccessToken();
  const res = await fetch(path, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function FilterPicker({ label, value, setValue, options, placeholder }) {
  return (
    <div>
      <label className="label">{label}</label>
      <select className="input" value={value} onChange={e => setValue(e.target.value)}>
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

export default function ReportsExportAdminPage() {
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [terms, setTerms] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [filter, setFilter] = useState({ class_id: '', section_id: '', session_id: '', term_id: '', month: '', status: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      api('/api/admin/academic/classes'),
      api('/api/admin/academic/sections'),
      api('/api/admin/academic/terms'),
      api('/api/admin/academic/sessions'),
    ]).then(([c, sec, t, s]) => { setClasses(c.items); setSections(sec.items); setTerms(t.items); setSessions(s.items); });
  }, []);

  const sectionOpts = useMemo(() => sections.filter(s => String(s.class_id) === String(filter.class_id)), [sections, filter.class_id]);
  const termOpts = useMemo(() => filter.session_id ? terms.filter(t => String(t.session_id) === String(filter.session_id)) : terms, [terms, filter.session_id]);

  async function run(kind) {
    setBusy(true); setError(null);
    try {
      let path = '';
      let name = '';
      if (kind === 'students') {
        path = `/api/reports/csv/students?${new URLSearchParams(filter).toString()}`;
        name = `students-${Date.now()}.csv`;
      } else if (kind === 'teachers') {
        path = `/api/reports/csv/teachers`;
        name = `teachers-${Date.now()}.csv`;
      } else if (kind === 'marks') {
        if (!filter.class_id || !filter.section_id || !filter.term_id) { setError('Pick class, section, term.'); return; }
        path = `/api/reports/csv/marks-sheet?class_id=${filter.class_id}&section_id=${filter.section_id}&term_id=${filter.term_id}${filter.session_id ? `&session_id=${filter.session_id}` : ''}`;
        name = `marks-sheet-${Date.now()}.csv`;
      } else if (kind === 'attendance') {
        if (!filter.class_id || !filter.section_id || !filter.month) { setError('Pick class, section, month.'); return; }
        path = `/api/reports/csv/attendance?class_id=${filter.class_id}&section_id=${filter.section_id}&month=${filter.month}`;
        name = `attendance-${filter.month}.csv`;
      } else if (kind === 'fees') {
        path = `/api/reports/csv/fees?${new URLSearchParams(Object.fromEntries(Object.entries(filter).filter(([_, v]) => v))).toString()}`;
        name = `fees-${Date.now()}.csv`;
      }
      await downloadCSV(path, name);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">Reports &amp; exports</h1>
        <p className="text-slate-500">Generate CSV exports for students, teachers, marks sheets, attendance, and fees. The download is delivered as a text/csv attachment.</p>
      </header>

      <section className="card"><div className="card-body grid sm:grid-cols-4 gap-3">
        <FilterPicker label="Class" value={filter.class_id} setValue={v => setFilter({ ...filter, class_id: v, section_id: '' })}
                     options={classes.map(c => ({ value: c.id, label: c.name }))} placeholder="Any" />
        <FilterPicker label="Section" value={filter.section_id} setValue={v => setFilter({ ...filter, section_id: v })}
                     options={sectionOpts.map(s => ({ value: s.id, label: s.name }))} placeholder="Any" disabled={!filter.class_id} />
        <FilterPicker label="Session" value={filter.session_id} setValue={v => setFilter({ ...filter, session_id: v, term_id: '' })}
                     options={sessions.map(s => ({ value: s.id, label: s.name }))} placeholder="Any" />
        <FilterPicker label="Term" value={filter.term_id} setValue={v => setFilter({ ...filter, term_id: v })}
                     options={termOpts.map(t => ({ value: t.id, label: t.name }))} placeholder="Any" />
        <div>
          <label className="label">Month (attendance)</label>
          <input type="month" className="input" value={filter.month} onChange={e => setFilter({ ...filter, month: e.target.value })} />
        </div>
        <div>
          <label className="label">Fee status</label>
          <select className="input" value={filter.status} onChange={e => setFilter({ ...filter, status: e.target.value })}>
            <option value="">Any</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="unpaid">Unpaid</option>
            <option value="overdue">Overdue</option>
            <option value="waived">Waived</option>
          </select>
        </div>
      </div></section>

      <section className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { kind:'students', label:'Students CSV',    hint:'filtered by class/section/session' },
          { kind:'teachers', label:'Teachers CSV',    hint:'all active teachers' },
          { kind:'marks',    label:'Marks sheet CSV', hint:'per class × section × term (pivot)' },
          { kind:'attendance',label:'Attendance CSV',  hint:'per class × section × month' },
          { kind:'fees',     label:'Fees CSV',        hint:'all bills, optional status filter' },
        ].map(r => (
          <button key={r.kind} disabled={busy} onClick={() => run(r.kind)} className="card hover:shadow text-left">
            <div className="card-body">
              <div className="font-semibold">{r.label}</div>
              <div className="text-xs text-slate-500 mt-1">{r.hint}</div>
              <div className="text-xs text-brand-700 mt-2">↓ Download CSV</div>
            </div>
          </button>
        ))}
      </section>

      {error && <div className="text-sm text-red-600">{error}</div>}
    </div>
  );
}
