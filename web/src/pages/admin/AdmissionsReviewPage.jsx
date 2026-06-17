import { useEffect, useState } from 'react';
import Modal from '../../components/Modal.jsx';
import { api } from '../../lib/api.js';

const STATUSES = ['new','under_review','accepted','rejected','waitlisted'];

export default function AdmissionsReviewPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [modal, setModal] = useState(null);
  const [error, setError] = useState(null);

  function load() {
    setLoading(true);
    const url = filter ? `/api/admin/admissions?status=${filter}` : '/api/admin/admissions';
    api(url).then(d => setItems(d.items)).finally(() => setLoading(false));
  }
  useEffect(load, [filter]);

  async function setStatus(item, status) {
    try {
      await api(`/api/admin/admissions/${item.id}`, { method: 'PATCH', body: { status } });
      load();
    } catch (e) { setError(e.data?.error || e.message); }
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">Admission applications</h1>
        <p className="text-slate-500">Review and decide on incoming applications.</p>
      </header>

      <div className="card">
        <div className="card-body flex gap-2 flex-wrap text-sm">
          <span className="text-slate-500 self-center mr-1">Filter:</span>
          <button onClick={() => setFilter('')} className={'px-3 py-1.5 rounded ' + (!filter ? 'bg-brand-600 text-white' : 'bg-white border border-slate-200')}>All</button>
          {STATUSES.map(s => (
            <button key={s} onClick={() => setFilter(s)} className={'px-3 py-1.5 rounded ' + (filter === s ? 'bg-brand-600 text-white' : 'bg-white border border-slate-200')}>
              {s.replace('_',' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500 text-xs uppercase">
            <tr>
              <th className="px-3 py-2">Applicant</th><th>Parent</th><th>Email / Phone</th><th>Class</th><th>Status</th><th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">Loading…</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">No applications match.</td></tr>}
            {items.map(a => (
              <tr key={a.id} className="border-t border-slate-200 hover:bg-slate-50">
                <td className="px-3 py-2 font-medium">{a.applicant_name}</td>
                <td className="px-3 py-2">{a.parent_name}</td>
                <td className="px-3 py-2 text-xs text-slate-500">{a.email}<br />{a.phone}</td>
                <td className="px-3 py-2">{a.applying_class_name}</td>
                <td className="px-3 py-2">
                  <span className={'text-xs px-2 py-0.5 rounded ' + (
                    a.status === 'accepted'  ? 'bg-emerald-100 text-emerald-700' :
                    a.status === 'rejected'  ? 'bg-red-100 text-red-700' :
                    a.status === 'waitlisted'? 'bg-amber-100 text-amber-700' :
                    a.status === 'under_review' ? 'bg-brand-100 text-brand-700' :
                                                 'bg-slate-100 text-slate-600'
                  )}>{a.status.replace('_',' ')}</span>
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <button onClick={() => setModal(a)} className="text-xs text-brand-700 hover:underline mr-3">View</button>
                  {a.status !== 'accepted' && <button onClick={() => setStatus(a, 'accepted')} className="text-xs text-emerald-700 hover:underline mr-3">Accept</button>}
                  {a.status !== 'rejected' && <button onClick={() => setStatus(a, 'rejected')} className="text-xs text-red-600 hover:underline">Reject</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={`Application #${modal?.id}`} size="lg"
             footer={<>
               <button className="btn-secondary" onClick={() => setModal(null)}>Close</button>
               <button className="btn-primary" onClick={() => { setStatus(modal, 'under_review'); setModal(null); }}>Mark under review</button>
             </>}>
        {modal && (
          <dl className="grid sm:grid-cols-2 gap-y-2 text-sm">
            <dt className="text-slate-500">Applicant</dt><dd className="font-medium">{modal.applicant_name}</dd>
            <dt className="text-slate-500">Parent / guardian</dt><dd>{modal.parent_name}</dd>
            <dt className="text-slate-500">Email</dt><dd>{modal.email}</dd>
            <dt className="text-slate-500">Phone</dt><dd>{modal.phone}</dd>
            <dt className="text-slate-500">Applying for</dt><dd>{modal.applying_class_name}</dd>
            <dt className="text-slate-500">DOB</dt><dd>{modal.date_of_birth || '—'}</dd>
            <dt className="text-slate-500">Previous school</dt><dd>{modal.previous_school || '—'}</dd>
            <dt className="text-slate-500">Address</dt><dd>{modal.address || '—'}</dd>
            <dt className="text-slate-500">Notes</dt><dd className="whitespace-pre-line">{modal.notes || '—'}</dd>
            <dt className="text-slate-500">Submitted</dt><dd>{new Date(modal.created_at).toLocaleString()}</dd>
            <dt className="text-slate-500">Status</dt><dd>{modal.status}</dd>
          </dl>
        )}
        {error && <div className="text-sm text-red-600 mt-3">{error}</div>}
      </Modal>
    </div>
  );
}
