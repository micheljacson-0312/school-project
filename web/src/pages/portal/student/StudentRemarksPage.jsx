import { useEffect, useState } from 'react';
import { api } from '../../../lib/api.js';

const CAT_COLOR = {
  behavior:      'bg-amber-100 text-amber-700',
  performance:   'bg-brand-100 text-brand-700',
  general:       'bg-slate-100 text-slate-700',
  commendation:  'bg-emerald-100 text-emerald-700',
};

export default function StudentRemarksPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    api('/api/student/remarks').then(d => setItems(d.items)).finally(() => setLoading(false));
  }, []);
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">Remarks</h1>
        <p className="text-slate-500">Notes from your teachers about behaviour and performance.</p>
      </header>
      {loading && <p className="text-slate-500">Loading…</p>}
      {!loading && items.length === 0 && <div className="card"><div className="card-body text-slate-500 text-sm">No remarks on record.</div></div>}
      <ul className="space-y-3">
        {items.map(r => (
          <li key={r.id} className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <span className={`text-xs px-2 py-0.5 rounded ${CAT_COLOR[r.category] || 'bg-slate-100 text-slate-700'}`}>{r.category}</span>
                <span className="text-xs text-slate-500">{new Date(r.created_at).toLocaleString()} · {r.author_name}</span>
              </div>
              <p className="mt-2 text-slate-700">{r.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
