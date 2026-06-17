import { useEffect, useState } from 'react';
import Modal from '../../components/Modal.jsx';
import { api } from '../../lib/api.js';

const STATUSES = ['new','under_review','shortlisted','rejected','hired'];

export default function JobApplicationsReviewPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [modal, setModal] = useState(null);
  const [error, setError] = useState(null);

  function load() {
    setLoading(true);
    const url = filter ? `/api/admin/job-applications?status=${filter}` : '/api/admin/job-applications';
    api(url).then(d => setItems(d.items)).finally(() => setLoading(false));
  }
  useEffect(load, [filter]);

  async function setStatus(item, status) {
    try {
      await api(`/api/admin/job-applications/${item.id}`, { method: 'PATCH', body: { status } });
      load();
    } catch (e) { setError(e.data?.error || e.message); }
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">Job applications</h1>
        <p className="text-slate-500">Candidates who applied through the public site.</p>
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
              <th className="px-3 py-2">Name</th><th>Position</th><th>Email / Phone</th><th>Experience</th><th>Status</th><th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">Loading…</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">No applications match.</td></tr>}
            {items.map(a => (
              <tr key={a.id} className="border-t border-slate-200 hover:bg-slate-50">
                <td className="px-3 py-2 font-medium">{a.full_name}</td>
                <td className="px-3 py-2">{a.position}</td>
                <td className="px-3 py-2 text-xs text-slate-500">{a.email}<br />{a.phone}</td>
                <td className="px-3 py-2 text-xs">{a.experience || '—'}</td>
                <td className="px-3 py-2">
                  <span className={'text-xs px-2 py-0.5 rounded ' + (
                    a.status === 'hired' ? 'bg-emerald-100 text-emerald-700' :
                    a.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    a.status === 'shortlisted' ? 'bg-amber-100 text-amber-700' :
                    a.status === 'under_review' ? 'bg-brand-100 text-brand-700' :
                                                  'bg-slate-100 text-slate-600'
                  )}>{a.status.replace('_',' ')}</span>
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <button onClick={() => setModal(a)} className="text-xs text-brand-700 hover:underline mr-3">View</button>
                  {a.status !== 'shortlisted' && <button onClick={() => setStatus(a, 'shortlisted')} className="text-xs text-amber-700 hover:underline mr-3">Shortlist</button>}
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
            <dt className="text-slate-500">Name</dt><dd className="font-medium">{modal.full_name}</dd>
            <dt className="text-slate-500">Position</dt><dd>{modal.position}</dd>
            <dt className="text-slate-500">Email</dt><dd>{modal.email}</dd>
            <dt className="text-slate-500">Phone</dt><dd>{modal.phone}</dd>
            <dt className="text-slate-500">CNIC</dt><dd>{modal.cnic || '—'}</dd>
            <dt className="text-slate-500">Experience</dt><dd>{modal.experience || '—'}</dd>
            <dt className="text-slate-500 sm:col-span-2">Cover letter</dt>
            <dd className="sm:col-span-2 whitespace-pre-line">{modal.cover_letter || '—'}</dd>
            <dt className="text-slate-500">Submitted</dt><dd>{new Date(modal.created_at).toLocaleString()}</dd>
            <dt className="text-slate-500">Status</dt><dd>{modal.status}</dd>
          </dl>
        )}
        {error && <div className="text-sm text-red-600 mt-3">{error}</div>}
      </Modal>
    </div>
  );
}
