// Defaulters list (Phase 6) — students with overdue bills, ranked by amount.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api.js';

export default function DefaultersAdminPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    api('/api/accountant/defaulters').then(d => setItems(d.items)).finally(() => setLoading(false));
  }, []);
  const total = items.reduce((s, i) => s + Number(i.overdue_amount), 0);
  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Defaulters</h1>
          <p className="text-slate-500">Students with overdue (past-due, unpaid) bills.</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500">Total overdue</div>
          <div className="text-2xl font-semibold text-red-700">PKR {total.toLocaleString()}</div>
        </div>
      </header>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500 text-xs uppercase">
            <tr><th className="px-3 py-2">Adm #</th><th>Name</th><th>Class</th><th>Overdue bills</th><th>Oldest due</th><th>Outstanding</th><th className="text-right">Actions</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-500">Loading…</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-500">No defaulters — every bill is paid or not yet due. 🎉</td></tr>}
            {items.map(d => (
              <tr key={d.admission_no} className="border-t border-slate-200">
                <td className="px-3 py-2 font-mono text-xs">{d.admission_no}</td>
                <td className="px-3 py-2 font-medium">{d.student_name}</td>
                <td className="px-3 py-2 text-xs">{d.class_name}/{d.section_name}</td>
                <td className="px-3 py-2">{d.overdue_count}</td>
                <td className="px-3 py-2 text-xs">{d.oldest_due?.slice(0,10)}</td>
                <td className="px-3 py-2 font-semibold text-red-700">PKR {Number(d.overdue_amount).toLocaleString()}</td>
                <td className="px-3 py-2 text-right">
                  <Link to="/admin/contact-messages" className="text-xs text-brand-700 hover:underline">Send reminder</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
