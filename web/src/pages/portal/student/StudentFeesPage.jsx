import { useEffect, useState } from 'react';
import { api } from '../../../lib/api.js';

export default function StudentFeesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    api('/api/student/fees').then(d => setItems(d.items)).finally(() => setLoading(false));
  }, []);
  const totalDue = items.filter(i => ['unpaid','partial','overdue'].includes(i.status)).reduce((s, i) => s + Number(i.net_amount - i.paid_amount), 0);
  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Fee records</h1>
          <p className="text-slate-500">All bills, payments, and outstanding balances.</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500">Outstanding</div>
          <div className="text-2xl font-semibold text-red-700">PKR {totalDue.toLocaleString()}</div>
        </div>
      </header>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500 text-xs uppercase">
            <tr>
              <th className="px-3 py-2">Structure</th><th>Session</th><th>Due date</th>
              <th>Net</th><th>Paid</th><th>Outstanding</th><th>Status</th><th>Challan</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} className="px-3 py-6 text-center text-slate-500">Loading…</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={8} className="px-3 py-6 text-center text-slate-500">No fee records.</td></tr>}
            {items.map(f => (
              <tr key={f.id} className="border-t border-slate-200">
                <td className="px-3 py-2 font-medium">{f.structure_name}</td>
                <td className="px-3 py-2 text-xs text-slate-500">{f.session_name}</td>
                <td className="px-3 py-2 text-xs">{f.due_date?.slice(0,10)}</td>
                <td className="px-3 py-2">PKR {Number(f.net_amount).toLocaleString()}</td>
                <td className="px-3 py-2">PKR {Number(f.paid_amount).toLocaleString()}</td>
                <td className="px-3 py-2 font-medium">PKR {Number(f.net_amount - f.paid_amount).toLocaleString()}</td>
                <td className="px-3 py-2">
                  <span className={'text-xs px-2 py-0.5 rounded ' + (
                    f.status === 'paid'   ? 'bg-emerald-100 text-emerald-700' :
                    f.status === 'overdue'? 'bg-red-100 text-red-700' :
                    f.status === 'partial'? 'bg-amber-100 text-amber-700' :
                    f.status === 'waived' ? 'bg-slate-100 text-slate-600' :
                                             'bg-slate-100 text-slate-700'
                  )}>{f.status}</span>
                </td>
                <td className="px-3 py-2 text-xs text-slate-500">{f.challan_no || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
