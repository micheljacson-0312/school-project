// Document templates admin page (Phase 7) — list + count usage.
import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';

export default function DocumentTemplatesAdminPage() {
  const [items, setItems] = useState([]);
  const [generated, setGenerated] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    Promise.all([
      api('/api/operator/templates'),
      api('/api/operator/generated'),
    ]).then(([t, g]) => { setItems(t.items); setGenerated(g.items); })
      .finally(() => setLoading(false));
  }, []);
  const usage = {};
  for (const g of generated) usage[g.template_key] = (usage[g.template_key] || 0) + 1;
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">Document templates</h1>
        <p className="text-slate-500">Templates available for ID cards, certificates, fee schedules. Admin-managed via document_templates.</p>
      </header>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500 text-xs uppercase">
            <tr><th className="px-3 py-2">Template</th><th>Key</th><th>Usage</th><th>Created</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-500">Loading…</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-500">No templates.</td></tr>}
            {items.map(t => (
              <tr key={t.id} className="border-t border-slate-200">
                <td className="px-3 py-2 font-medium">{t.display_name}</td>
                <td className="px-3 py-2 font-mono text-xs">{t.key_name}</td>
                <td className="px-3 py-2">{usage[t.key_name] || 0}× generated</td>
                <td className="px-3 py-2 text-xs text-slate-500">{new Date(t.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section className="card">
        <div className="card-body">
          <h2 className="font-semibold">Recently generated</h2>
          <ul className="divide-y divide-slate-200 mt-2">
            {generated.slice(0, 10).map(g => (
              <li key={g.id} className="py-2 text-sm">
                <div className="font-medium">{g.template_name}</div>
                <div className="text-xs text-slate-500">
                  {g.student_admission_no ? `Student ${g.student_admission_no}` : '—'} ·
                  by {g.generated_by_name || '—'} ·
                  {new Date(g.created_at).toLocaleString()}
                </div>
              </li>
            ))}
            {generated.length === 0 && <li className="py-2 text-sm text-slate-500">Nothing generated yet.</li>}
          </ul>
        </div>
      </section>
    </div>
  );
}
