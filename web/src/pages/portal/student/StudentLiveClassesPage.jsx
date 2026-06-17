import { useEffect, useState } from 'react';
import { api } from '../../../lib/api.js';
import Modal from '../../../components/Modal.jsx';

function StatusPill({ s }) {
  const map = { scheduled: 'bg-brand-100 text-brand-700', live: 'bg-emerald-100 text-emerald-700', ended: 'bg-slate-100 text-slate-600', cancelled: 'bg-red-100 text-red-700' };
  return <span className={`text-xs px-2 py-0.5 rounded ${map[s]}`}>{s}</span>;
}

export default function StudentLiveClassesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);
  const [jitsiUrl, setJitsiUrl] = useState(null);

  function load() {
    setLoading(true);
    api('/api/lms/live-classes?upcoming=1').then(d => setItems(d.items)).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function join(lc) {
    setActive(lc);
    try {
      const r = await api(`/api/lms/live-classes/${lc.id}`);
      setJitsiUrl(r.jitsi_url);
    } catch (e) { setJitsiUrl(null); }
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">Live classes</h1>
        <p className="text-slate-500">Scheduled Jitsi sessions for your class. Click <strong>Join</strong> at the start time.</p>
      </header>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500 text-xs uppercase">
            <tr><th className="px-3 py-2">Title</th><th>Subject</th><th>Teacher</th><th>Starts</th><th>Status</th><th className="text-right">Action</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">Loading…</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">No upcoming live classes.</td></tr>}
            {items.map(l => (
              <tr key={l.id} className="border-t border-slate-200">
                <td className="px-3 py-2 font-medium">{l.title}</td>
                <td className="px-3 py-2">{l.subject_name}</td>
                <td className="px-3 py-2">{l.teacher_name}</td>
                <td className="px-3 py-2 text-xs">{new Date(l.starts_at).toLocaleString()}</td>
                <td className="px-3 py-2"><StatusPill s={l.status} /></td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => join(l)} className="btn-primary text-xs">Join</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={!!active} onClose={() => { setActive(null); setJitsiUrl(null); }} size="full"
             title={active ? `${active.title} · ${active.subject_name}` : ''}>
        {jitsiUrl ? (
          <div className="space-y-2">
            <div className="text-xs text-slate-500">If the embed doesn't load, <a className="text-brand-700 underline" href={jitsiUrl} target="_blank" rel="noreferrer">open Jitsi in a new tab</a>.</div>
            <iframe title="Jitsi Meet" src={jitsiUrl} allow="camera; microphone; fullscreen; display-capture; autoplay"
                    className="w-full h-[70vh] rounded border border-slate-200 bg-slate-100" />
          </div>
        ) : <p className="text-slate-500">Loading room…</p>}
      </Modal>
    </div>
  );
}
