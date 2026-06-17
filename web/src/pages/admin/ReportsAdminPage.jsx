// Collection reports (Phase 6) — class-wise summary + 12-month collection trend.
import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';

export default function ReportsAdminPage() {
  const [summary, setSummary] = useState([]);
  const [trend, setTrend] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [filter, setFilter] = useState({ session_id: '', term: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/api/admin/academic/sessions').then(d => setSessions(d.items)).catch(() => {});
  }, []);

  function load() {
    setLoading(true);
    const params = new URLSearchParams();
    Object.entries(filter).forEach(([k, v]) => { if (v) params.set(k, v); });
    Promise.all([
      api(`/api/accountant/reports/summary?${params}`),
      api('/api/accountant/reports/collection-trend'),
    ]).then(([s, t]) => { setSummary(s.items); setTrend(t.items); }).finally(() => setLoading(false));
  }
  useEffect(load, [filter.session_id, filter.term]);

  const totals = summary.reduce((acc, r) => {
    acc.gross += Number(r.gross_total);
    acc.net   += Number(r.net_total);
    acc.paid  += Number(r.collected_total);
    acc.out   += Number(r.outstanding_total);
    return acc;
  }, { gross: 0, net: 0, paid: 0, out: 0 });

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Collection reports</h1>
          <p className="text-slate-500">Class-wise summary and 12-month collection trend.</p>
        </div>
        <div className="flex gap-2">
          <select className="input max-w-xs" value={filter.session_id} onChange={e => setFilter({ ...filter, session_id: e.target.value })}>
            <option value="">All sessions</option>
            {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input type="month" className="input" value={filter.term} onChange={e => setFilter({ ...filter, term: e.target.value })} />
        </div>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card"><div className="card-body"><div className="text-xs text-slate-500">Gross</div><div className="text-2xl font-semibold">PKR {totals.gross.toLocaleString()}</div></div></div>
        <div className="card"><div className="card-body"><div className="text-xs text-slate-500">Net (after discounts)</div><div className="text-2xl font-semibold">PKR {totals.net.toLocaleString()}</div></div></div>
        <div className="card"><div className="card-body"><div className="text-xs text-slate-500">Collected</div><div className="text-2xl font-semibold text-emerald-700">PKR {totals.paid.toLocaleString()}</div></div></div>
        <div className="card"><div className="card-body"><div className="text-xs text-slate-500">Outstanding</div><div className="text-2xl font-semibold text-red-700">PKR {totals.out.toLocaleString()}</div></div></div>
      </section>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500 text-xs uppercase">
            <tr><th className="px-3 py-2">Class</th><th>Bills</th><th>Paid</th><th>Unpaid</th><th>Overdue</th><th>Gross</th><th>Net</th><th>Collected</th><th>Outstanding</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={9} className="px-3 py-6 text-center text-slate-500">Loading…</td></tr>}
            {!loading && summary.length === 0 && <tr><td colSpan={9} className="px-3 py-6 text-center text-slate-500">No data.</td></tr>}
            {summary.map(r => (
              <tr key={r.class_name} className="border-t border-slate-200">
                <td className="px-3 py-2 font-medium">{r.class_name}</td>
                <td className="px-3 py-2">{r.bills_count}</td>
                <td className="px-3 py-2 text-emerald-700">{r.paid_count}</td>
                <td className="px-3 py-2">{r.unpaid_count}</td>
                <td className="px-3 py-2 text-red-700">{r.overdue_count}</td>
                <td className="px-3 py-2">PKR {Number(r.gross_total).toLocaleString()}</td>
                <td className="px-3 py-2">PKR {Number(r.net_total).toLocaleString()}</td>
                <td className="px-3 py-2 text-emerald-700">PKR {Number(r.collected_total).toLocaleString()}</td>
                <td className="px-3 py-2 font-semibold text-red-700">PKR {Number(r.outstanding_total).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <div className="card-body">
          <h2 className="font-semibold">12-month collection trend</h2>
          <table className="w-full text-sm mt-3">
            <thead className="text-left text-slate-500 text-xs uppercase">
              <tr><th className="py-1">Month</th><th>Payments</th><th>Amount</th></tr>
            </thead>
            <tbody>
              {trend.length === 0 && <tr><td colSpan={3} className="py-3 text-slate-500 text-sm">No payments in the last 12 months.</td></tr>}
              {trend.map(t => (
                <tr key={t.month} className="border-t border-slate-200">
                  <td className="py-2">{t.month}</td>
                  <td className="py-2">{t.payments}</td>
                  <td className="py-2">PKR {Number(t.amount).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
