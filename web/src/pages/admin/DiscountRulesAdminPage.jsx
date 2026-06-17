// Discount rules view (Phase 6) — accountant reads; admin manages.
// For Phase 6 we render the catalog read-only; full CRUD lands when
// the client finalises the policy text per the brief.
import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';

export default function DiscountRulesAdminPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    api('/api/accountant/discount-rules').then(d => setItems(d.items)).finally(() => setLoading(false));
  }, []);
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">Discount rules</h1>
        <p className="text-slate-500">Per-school policy table. Highest-priority applicable discount wins when bills are generated.</p>
      </header>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500 text-xs uppercase">
            <tr><th className="px-3 py-2">Rule</th><th>Discount %</th><th>Requires siblings</th><th>Priority</th><th>Notes</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">Loading…</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">No rules.</td></tr>}
            {items.map(r => (
              <tr key={r.id} className="border-t border-slate-200">
                <td className="px-3 py-2">
                  <div className="font-medium">{r.display_name}</div>
                  <div className="text-xs text-slate-500"><code>{r.key_name}</code></div>
                </td>
                <td className="px-3 py-2 font-semibold">{Number(r.discount_percent)}%</td>
                <td className="px-3 py-2">{r.requires_siblings || '—'}</td>
                <td className="px-3 py-2">{r.priority}</td>
                <td className="px-3 py-2 text-xs text-slate-500">{r.notes || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
