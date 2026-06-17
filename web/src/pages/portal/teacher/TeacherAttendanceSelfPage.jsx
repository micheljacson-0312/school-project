// Teacher check-in/out + history. Phase 5.
import { useEffect, useState } from 'react';
import { api } from '../../../lib/api.js';

function StatusPill({ s }) {
  const map = { present: 'bg-emerald-100 text-emerald-700', absent: 'bg-red-100 text-red-700', late: 'bg-amber-100 text-amber-700', leave: 'bg-brand-100 text-brand-700', holiday: 'bg-slate-100 text-slate-600' };
  return <span className={`text-xs px-2 py-0.5 rounded ${map[s] || 'bg-slate-100 text-slate-600'}`}>{s}</span>;
}

export default function TeacherAttendanceSelfPage() {
  const [today, setToday] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  function load() {
    setLoading(true);
    Promise.all([
      api('/api/teacher-attendance/today').then(d => setToday(d.item)),
      api('/api/teacher-attendance/history').then(d => setHistory(d.items)),
    ]).catch(e => setError(e.message)).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function checkin() { setBusy(true); setError(null);
    try { await api('/api/teacher-attendance/checkin', { method: 'POST', body: {} }); load(); }
    catch (e) { setError(e.data?.error || e.message); }
    finally { setBusy(false); }
  }
  async function checkout() { setBusy(true); setError(null);
    try { await api('/api/teacher-attendance/checkout', { method: 'POST', body: {} }); load(); }
    catch (e) { setError(e.data?.error || e.message); }
    finally { setBusy(false); }
  }

  const present = today?.status === 'present';
  const checkedOut = !!today?.check_out;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">My attendance</h1>
        <p className="text-slate-500">Check in at the start of the day, check out at the end.</p>
      </header>

      <div className="card"><div className="card-body">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="text-xs text-slate-500">Today</div>
            <div className="text-xl font-semibold">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
            {today && (
              <div className="mt-2 flex gap-3 text-sm">
                {present && <StatusPill s="present" />}
                <span>Check-in: <strong>{today.check_in || '—'}</strong></span>
                <span>Check-out: <strong>{today.check_out || '—'}</strong></span>
              </div>
            )}
            {!today && !loading && <div className="text-sm text-slate-500 mt-2">You haven't checked in yet today.</div>}
          </div>
          <div className="flex gap-2">
            <button onClick={checkin} disabled={busy || present}
                    className="btn-primary disabled:opacity-50">
              {present ? 'Checked in ✓' : (busy ? 'Checking in…' : 'Check in')}
            </button>
            <button onClick={checkout} disabled={busy || !present || checkedOut}
                    className="btn-secondary disabled:opacity-50">
              {checkedOut ? 'Checked out ✓' : (busy ? 'Checking out…' : 'Check out')}
            </button>
          </div>
        </div>
        {error && <div className="text-sm text-red-600 mt-3">{error}</div>}
      </div></div>

      <section className="card overflow-hidden">
        <div className="card-body">
          <h2 className="font-semibold mb-2">Recent history (last 30 days)</h2>
          {loading && <p className="text-slate-500">Loading…</p>}
          {!loading && history.length === 0 && <p className="text-sm text-slate-500">No records yet.</p>}
          {history.length > 0 && (
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500 text-xs uppercase">
                <tr><th className="py-1">Date</th><th>Status</th><th>Check-in</th><th>Check-out</th><th>Remarks</th></tr>
              </thead>
              <tbody>
                {history.slice(0, 30).map(h => (
                  <tr key={h.date} className="border-t border-slate-200">
                    <td className="py-2">{new Date(h.date).toLocaleDateString()}</td>
                    <td className="py-2"><StatusPill s={h.status} /></td>
                    <td className="py-2 text-slate-500">{h.check_in || '—'}</td>
                    <td className="py-2 text-slate-500">{h.check_out || '—'}</td>
                    <td className="py-2 text-slate-500 text-xs">{h.remarks || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
