// Certificates (Phase 7) — printable certificate preview.
import { useEffect, useState } from 'react';
import Modal from '../../components/Modal.jsx';
import { api } from '../../lib/api.js';

export default function CertificatesAdminPage() {
  const [admissionNo, setAdmissionNo] = useState('');
  const [reason, setReason] = useState('Academic excellence');
  const [cert, setCert] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [active, setActive] = useState(null);

  async function generate() {
    setLoading(true); setError(null); setCert(null);
    try {
      const list = await api('/api/admin/academic/students?q=' + encodeURIComponent(admissionNo));
      const match = list.body.items.find(s => s.admission_no === admissionNo.trim());
      if (!match) { setError('Student not found'); return; }
      const r = await api(`/api/operator/certificate/student/${match.student_id}?reason=${encodeURIComponent(reason)}`);
      setCert(r.certificate);
      setActive(r.certificate);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">Certificates</h1>
        <p className="text-slate-500">Print-ready certificate layout. Use window.print() or pipe to a PDF renderer.</p>
      </header>

      <div className="card"><div className="card-body space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Admission number *</label>
            <input className="input" value={admissionNo} onChange={e => setAdmissionNo(e.target.value)} placeholder="ADM-0001" />
          </div>
          <div>
            <label className="label">Reason</label>
            <input className="input" value={reason} onChange={e => setReason(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end">
          <button onClick={generate} disabled={loading || !admissionNo} className="btn-primary">{loading ? 'Generating…' : 'Generate'}</button>
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
      </div></div>

      {cert && (
        <div className="card"><div className="card-body">
          <div className="border-4 border-double border-brand-700 rounded-lg p-10 bg-white text-center max-w-2xl mx-auto">
            <div className="text-xs uppercase tracking-widest text-slate-500">City Public School</div>
            <h2 className="text-3xl font-bold text-brand-700 mt-4">Certificate of Achievement</h2>
            <p className="mt-6 text-slate-600">This is to certify that</p>
            <p className="text-2xl font-semibold mt-2">{cert.full_name}</p>
            <p className="text-slate-600 mt-1">Adm. {cert.admission_no} · {cert.class_name} / {cert.section_name}</p>
            <p className="mt-6 text-slate-700">has been recognised for</p>
            <p className="text-xl italic mt-2">{cert.reason}</p>
            <p className="mt-8 text-xs text-slate-500">Issued on {cert.issued_on}</p>
            <div className="mt-8 grid grid-cols-2 gap-8 text-xs">
              <div><div className="border-t border-slate-300 pt-1">Principal</div></div>
              <div><div className="border-t border-slate-300 pt-1">Coordinator</div></div>
            </div>
          </div>
        </div></div>
      )}

      <Modal open={!!active} onClose={() => setActive(null)} title="Certificate preview" size="lg"
             footer={<>
               <button className="btn-secondary no-print" onClick={() => setActive(null)}>Close</button>
               <button className="btn-primary no-print" onClick={() => window.print()}>Print</button>
             </>}>
        {active && (
          <div className="border-4 border-double border-brand-700 rounded-lg p-10 bg-white text-center max-w-2xl mx-auto">
            <div className="text-xs uppercase tracking-widest text-slate-500">City Public School</div>
            <h2 className="text-3xl font-bold text-brand-700 mt-4">Certificate of Achievement</h2>
            <p className="mt-6 text-slate-600">This is to certify that</p>
            <p className="text-2xl font-semibold mt-2">{active.full_name}</p>
            <p className="text-slate-600 mt-1">Adm. {active.admission_no} · {active.class_name} / {active.section_name}</p>
            <p className="mt-6 text-slate-700">has been recognised for</p>
            <p className="text-xl italic mt-2">{active.reason}</p>
            <p className="mt-8 text-xs text-slate-500">Issued on {active.issued_on}</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
