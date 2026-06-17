import { useEffect, useState } from 'react';
import Modal from '../../components/Modal.jsx';
import { api } from '../../lib/api.js';

export default function ContactMessagesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  useEffect(() => {
    setLoading(true);
    api('/api/admin/contact-messages').then(d => setItems(d.items)).finally(() => setLoading(false));
  }, []);
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">Contact messages</h1>
        <p className="text-slate-500">Inbox of messages submitted via the public Contact page.</p>
      </header>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500 text-xs uppercase">
            <tr><th className="px-3 py-2">Name</th><th>Email</th><th>Subject</th><th>Received</th><th className="text-right">Actions</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">Loading…</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">No messages.</td></tr>}
            {items.map(m => (
              <tr key={m.id} className="border-t border-slate-200 hover:bg-slate-50">
                <td className="px-3 py-2 font-medium">{m.name}</td>
                <td className="px-3 py-2">{m.email}</td>
                <td className="px-3 py-2">{m.subject || '—'}</td>
                <td className="px-3 py-2 text-xs text-slate-500">{new Date(m.created_at).toLocaleString()}</td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => setSelected(m)} className="text-xs text-brand-700 hover:underline">Open</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.subject || selected?.name || 'Message'} size="lg"
             footer={<button className="btn-secondary" onClick={() => setSelected(null)}>Close</button>}>
        {selected && (
          <div className="text-sm space-y-2">
            <div><strong>From:</strong> {selected.name} &lt;{selected.email}&gt;</div>
            {selected.phone && <div><strong>Phone:</strong> {selected.phone}</div>}
            <div><strong>Received:</strong> {new Date(selected.created_at).toLocaleString()}</div>
            {selected.ip && <div className="text-xs text-slate-500">IP: {selected.ip}</div>}
            <hr className="my-3 border-slate-200" />
            <p className="whitespace-pre-line">{selected.message}</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
