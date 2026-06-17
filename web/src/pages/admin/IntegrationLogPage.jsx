// Admin: integration send log — recent outbound activity across all
// channels (mail, SMS, WhatsApp, social). Useful for diagnosing failed
// deliveries without scrolling server logs.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api.js';

const STATUS_COLOR = {
  sent:    'bg-emerald-100 text-emerald-800',
  queued:  'bg-sky-100 text-sky-800',
  dry_run: 'bg-slate-100 text-slate-700',
  failed:  'bg-red-100 text-red-800',
};

export default function IntegrationLogPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [channel, setChannel] = useState('');

  useEffect(() => {
    setLoading(true);
    const qs = channel ? `?channel=${channel}` : '';
    api(`/api/integrations/log${qs}`).then(d => setItems(d.items)).finally(() => setLoading(false));
  }, [channel]);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">Integration send log</h1>
        <p className="text-slate-500 text-sm">Last 200 sends across all providers. Filter by channel to narrow down.</p>
      </header>

      <div className="flex items-center gap-2 text-sm">
        {['','email','sms','whatsapp','social'].map(c => (
          <button key={c || 'all'} onClick={() => setChannel(c)}
                  className={'px-3 py-1.5 rounded ' + (channel === c ? 'bg-brand-600 text-white' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50')}>
            {c || 'All'}
          </button>
        ))}
        <Link to="/admin/integrations" className="ml-auto text-brand-700 underline text-sm">← Back to overview</Link>
      </div>

      {loading ? <p className="text-slate-500">Loading…</p> : items.length === 0 ? (
        <div className="card"><div className="card-body text-slate-600">No recent activity.</div></div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="p-3">When</th>
                <th className="p-3">Channel</th>
                <th className="p-3">Provider</th>
                <th className="p-3">Recipient</th>
                <th className="p-3">Subject / message</th>
                <th className="p-3">Status</th>
                <th className="p-3">Response</th>
              </tr>
            </thead>
            <tbody>
              {items.map(it => (
                <tr key={it.id} className="border-t border-slate-100">
                  <td className="p-3 text-xs text-slate-500 whitespace-nowrap">{new Date(it.created_at).toLocaleString()}</td>
                  <td className="p-3"><code className="text-xs">{it.channel}</code></td>
                  <td className="p-3"><code className="text-xs">{it.provider}</code></td>
                  <td className="p-3 text-xs break-all">{it.recipient || '—'}</td>
                  <td className="p-3 text-xs max-w-md truncate">{it.subject || '—'}</td>
                  <td className="p-3">
                    <span className={'text-xs px-2 py-1 rounded ' + (STATUS_COLOR[it.status] || STATUS_COLOR.dry_run)}>{it.status}</span>
                  </td>
                  <td className="p-3 text-xs">
                    {it.response_code || ''}
                    {it.error_message && <div className="text-red-600">{it.error_message}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
