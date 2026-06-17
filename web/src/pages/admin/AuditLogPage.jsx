import { useEffect, useState } from 'react';
import Modal from '../../components/Modal.jsx';
import { api } from '../../lib/api.js';

export default function AuditLogPage() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ action: '', entity_type: '', actor_id: '' });
  const [selected, setSelected] = useState(null);

  function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.action) params.set('action', filters.action);
    if (filters.entity_type) params.set('entity_type', filters.entity_type);
    if (filters.actor_id) params.set('actor_id', filters.actor_id);
    api(`/api/admin/audit-logs?${params}`).then(d => { setItems(d.items); setTotal(d.total); }).finally(() => setLoading(false));
  }
  useEffect(load, [filters]);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">Audit log</h1>
        <p className="text-slate-500">{total.toLocaleString()} entries match. Captures every sensitive action.</p>
      </header>

      <div className="card">
        <div className="card-body grid sm:grid-cols-3 gap-3">
          <div>
            <label className="label">Action prefix</label>
            <input className="input" value={filters.action} onChange={e => setFilters({ ...filters, action: e.target.value })} placeholder="auth.login, content.news, fees…" />
          </div>
          <div>
            <label className="label">Entity type</label>
            <input className="input" value={filters.entity_type} onChange={e => setFilters({ ...filters, entity_type: e.target.value })} placeholder="user, news_event, role…" />
          </div>
          <div>
            <label className="label">Actor user ID</label>
            <input type="number" className="input" value={filters.actor_id} onChange={e => setFilters({ ...filters, actor_id: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500 text-xs uppercase">
            <tr>
              <th className="px-3 py-2">When</th><th>Actor</th><th>Action</th><th>Entity</th><th>IP</th><th className="text-right">Details</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">Loading…</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">Nothing matches.</td></tr>}
            {items.map(a => (
              <tr key={a.id} className="border-t border-slate-200 hover:bg-slate-50">
                <td className="px-3 py-2 text-xs text-slate-500 whitespace-nowrap">{new Date(a.created_at).toLocaleString()}</td>
                <td className="px-3 py-2 text-xs">
                  <div>{a.actor_email || '—'}</div>
                  <div className="text-slate-400">id {a.actor_id || '—'}</div>
                </td>
                <td className="px-3 py-2"><code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">{a.action}</code></td>
                <td className="px-3 py-2 text-xs text-slate-500">
                  {a.entity_type || '—'} {a.entity_id ? `#${a.entity_id}` : ''}
                </td>
                <td className="px-3 py-2 text-xs text-slate-500">{a.ip || '—'}</td>
                <td className="px-3 py-2 text-right">
                  {a.meta && <button onClick={() => setSelected(a)} className="text-xs text-brand-700 hover:underline">View meta</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Audit entry #${selected?.id}`}
             footer={<button className="btn-secondary" onClick={() => setSelected(null)}>Close</button>}>
        {selected && (
          <div className="text-sm space-y-2">
            <div><strong>Action:</strong> <code>{selected.action}</code></div>
            <div><strong>When:</strong> {new Date(selected.created_at).toLocaleString()}</div>
            <div><strong>Actor:</strong> {selected.actor_email || '—'} (id {selected.actor_id || '—'})</div>
            {selected.entity_type && <div><strong>Entity:</strong> {selected.entity_type} #{selected.entity_id}</div>}
            {selected.ip && <div><strong>IP:</strong> {selected.ip}</div>}
            {selected.user_agent && <div><strong>User agent:</strong> <span className="text-xs text-slate-500">{selected.user_agent}</span></div>}
            <hr className="my-3 border-slate-200" />
            <div className="text-xs uppercase text-slate-500 font-semibold">Meta</div>
            <pre className="bg-slate-900 text-slate-100 text-xs rounded p-3 overflow-x-auto">{JSON.stringify(selected.meta, null, 2) || '—'}</pre>
          </div>
        )}
      </Modal>
    </div>
  );
}
