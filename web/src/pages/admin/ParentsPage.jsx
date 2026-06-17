import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';

export default function ParentsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    api('/api/admin/academic/parents').then(d => setItems(d.items)).finally(() => setLoading(false));
  }, []);
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">Parents</h1>
        <p className="text-slate-500">Parent/guardian accounts and the children linked to them.</p>
      </header>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500 text-xs uppercase">
            <tr><th className="px-3 py-2">Name</th><th>Occupation</th><th>Phone</th><th>Email</th><th>Children</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">Loading…</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">No parents.</td></tr>}
            {items.map(p => (
              <tr key={p.parent_id} className="border-t border-slate-200 hover:bg-slate-50">
                <td className="px-3 py-2 font-medium">{p.full_name}</td>
                <td className="px-3 py-2">{p.occupation || '—'}</td>
                <td className="px-3 py-2">{p.phone || '—'}</td>
                <td className="px-3 py-2">{p.email}</td>
                <td className="px-3 py-2 text-xs text-slate-500">{p.children_summary || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
