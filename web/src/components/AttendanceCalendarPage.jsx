// Monthly attendance calendar (Phase 5) — for student/parent child view.
import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api.js';

const DAY_MS = 86400000;
const STATUS_COLOR = {
  present: 'bg-emerald-100 text-emerald-700',
  absent:  'bg-red-100 text-red-700',
  late:    'bg-amber-100 text-amber-700',
  leave:   'bg-brand-100 text-brand-700',
  holiday: 'bg-slate-100 text-slate-500',
};

function buildMonthGrid(year, month) {
  // month is 1-indexed
  const first = new Date(Date.UTC(year, month - 1, 1));
  const last  = new Date(Date.UTC(year, month, 0));
  const startOffset = first.getUTCDay();           // 0 = Sun
  const daysInMonth = last.getUTCDate();
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(Date.UTC(year, month - 1, d)));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function AttendanceCalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [childId, setChildId] = useState(null);

  // Determine child id from URL or dashboard
  useEffect(() => {
    const path = window.location.pathname;
    const m = path.match(/\/children\/(\d+)\//);
    if (m) setChildId(Number(m[1]));
  }, []);

  useEffect(() => {
    setLoading(true);
    const monthStr = `${year}-${String(month).padStart(2,'0')}`;
    const params = new URLSearchParams();
    params.set('month', monthStr);
    if (childId) params.set('student_id', childId);
    // Use the calendar endpoint
    api(`/api/attendance-reports/calendar?${params}`).then(d => setItems(d.items || [])).catch(() => setItems([])).finally(() => setLoading(false));
    // Also fetch summary
    const summaryUrl = childId
      ? `/api/attendance-reports/student/${childId}?month=${monthStr}`
      : `/api/student/attendance`;
    if (childId) api(summaryUrl).then(d => setSummary(d.summary)).catch(() => {});
  }, [year, month, childId]);

  const cells = useMemo(() => buildMonthGrid(year, month), [year, month]);
  const byDate = useMemo(() => {
    const m = {};
    for (const it of items) m[it.date?.slice(0,10)] = it;
    return m;
  }, [items]);

  function prev() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  }
  function next() {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  }

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Attendance calendar</h1>
          <p className="text-slate-500 text-sm">Day-by-day attendance status for the month.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prev} className="btn-secondary text-sm">‹</button>
          <div className="font-semibold w-32 text-center">{new Date(year, month-1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</div>
          <button onClick={next} className="btn-secondary text-sm">›</button>
        </div>
      </header>

      {summary && (
        <section className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-sm">
          <Stat label="Present" value={summary.present} color="text-emerald-700" />
          <Stat label="Late"    value={summary.late}    color="text-amber-700" />
          <Stat label="Absent"  value={summary.absent}  color="text-red-700" />
          <Stat label="Leave"   value={summary.leave}   color="text-brand-700" />
          <Stat label="Attendance" value={summary.attendance_pct != null ? `${summary.attendance_pct}%` : '—'} color="font-bold" />
        </section>
      )}

      <div className="card overflow-hidden">
        <div className="grid grid-cols-7 text-xs uppercase tracking-wide text-slate-500 bg-slate-50">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} className="px-2 py-1 text-center">{d}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((d, i) => {
            if (!d) return <div key={i} className="aspect-square border-t border-l border-slate-100 bg-slate-50" />;
            const iso = d.toISOString().slice(0,10);
            const rec = byDate[iso];
            const status = rec?.status;
            const today = new Date().toISOString().slice(0,10) === iso;
            return (
              <div key={i} className={'aspect-square border-t border-l border-slate-100 p-1 text-xs flex flex-col ' + (today ? 'bg-brand-50/40' : '')}>
                <div className="text-slate-500 font-medium">{d.getUTCDate()}</div>
                {status && <div className={'mt-auto px-1.5 py-0.5 rounded text-center ' + (STATUS_COLOR[status] || 'bg-slate-100')}>{status}</div>}
              </div>
            );
          })}
        </div>
      </div>
      {loading && <p className="text-slate-500 text-sm">Loading…</p>}
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div className="card"><div className="card-body py-3">
      <div className="text-xs uppercase text-slate-500">{label}</div>
      <div className={'text-xl font-semibold ' + (color || '')}>{value}</div>
    </div></div>
  );
}
