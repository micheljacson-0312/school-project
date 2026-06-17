// ID cards (Phase 7) — student + staff card preview/print.
import { useEffect, useState } from 'react';
import Modal from '../../components/Modal.jsx';
import { api } from '../../lib/api.js';

function StudentCardFront({ card }) {
  return (
    <div className="border-2 border-brand-700 rounded-lg p-6 bg-white shadow-md max-w-sm mx-auto">
      <div className="text-center border-b border-slate-200 pb-3 mb-3">
        <div className="text-xs uppercase text-slate-500">City Public School</div>
        <div className="text-xl font-bold text-brand-700 mt-1">Student ID Card</div>
        <div className="text-xs text-slate-500">Session 2025-2026</div>
      </div>
      <div className="space-y-2 text-sm">
        <div><span className="text-slate-500 text-xs">Name</span><div className="font-semibold text-base">{card.full_name}</div></div>
        <div className="grid grid-cols-2 gap-2">
          <div><span className="text-slate-500 text-xs">Adm #</span><div className="font-mono">{card.admission_no}</div></div>
          <div><span className="text-slate-500 text-xs">Roll</span><div>{card.roll_no || '—'}</div></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><span className="text-slate-500 text-xs">Class</span><div>{card.class_name} / {card.section_name}</div></div>
          <div><span className="text-slate-500 text-xs">DOB</span><div>{card.date_of_birth?.slice(0,10) || '—'}</div></div>
        </div>
        <div><span className="text-slate-500 text-xs">Guardian</span><div>{card.guardian_name || '—'}</div></div>
        <div><span className="text-slate-500 text-xs">Phone</span><div>{card.guardian_phone || '—'}</div></div>
      </div>
      <div className="mt-4 pt-3 border-t border-slate-200 text-center text-xs text-slate-400">If found, please return to the school office.</div>
    </div>
  );
}

function StaffCardFront({ card }) {
  return (
    <div className="border-2 border-slate-700 rounded-lg p-6 bg-white shadow-md max-w-sm mx-auto">
      <div className="text-center border-b border-slate-200 pb-3 mb-3">
        <div className="text-xs uppercase text-slate-500">City Public School</div>
        <div className="text-xl font-bold text-slate-800 mt-1">Staff ID Card</div>
        <div className="text-xs text-slate-500">{card.role_name}</div>
      </div>
      <div className="space-y-2 text-sm">
        <div><span className="text-slate-500 text-xs">Name</span><div className="font-semibold text-base">{card.full_name}</div></div>
        <div><span className="text-slate-500 text-xs">Designation</span><div>{card.designation || '—'}</div></div>
        <div><span className="text-slate-500 text-xs">Employee code</span><div className="font-mono">{card.employee_code || '—'}</div></div>
        <div><span className="text-slate-500 text-xs">Email</span><div>{card.email}</div></div>
        <div><span className="text-slate-500 text-xs">Phone</span><div>{card.phone || '—'}</div></div>
      </div>
      <div className="mt-4 pt-3 border-t border-slate-200 text-center text-xs text-slate-400">Property of the school.</div>
    </div>
  );
}

export default function IdCardsAdminPage() {
  const [tab, setTab] = useState('student');
  const [active, setActive] = useState(null);

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">ID cards</h1>
          <p className="text-slate-500">Generate printable ID cards. Each generation is logged in the documents history.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTab('student')} className={'px-3 py-1.5 rounded text-sm ' + (tab === 'student' ? 'bg-brand-600 text-white' : 'bg-white border border-slate-200')}>Student</button>
          <button onClick={() => setTab('staff')} className={'px-3 py-1.5 rounded text-sm ' + (tab === 'staff' ? 'bg-brand-600 text-white' : 'bg-white border border-slate-200')}>Staff</button>
        </div>
      </header>
      {tab === 'student' ? <StudentPanel onOpen={setActive} /> : <StaffPanel onOpen={setActive} />}

      <Modal open={!!active} onClose={() => setActive(null)} title="ID card preview" size="lg"
             footer={<>
               <button className="btn-secondary no-print" onClick={() => setActive(null)}>Close</button>
               <button className="btn-primary no-print" onClick={() => window.print()}>Print</button>
             </>}>
        {active && (active.full_name && (active.admission_no || active.role_name) ? (
          active.admission_no ? <StudentCardFront card={active} /> : <StaffCardFront card={active} />
        ) : <p className="text-slate-500">Loading…</p>)}
      </Modal>
    </div>
  );
}

function StudentPanel({ onOpen }) {
  const [admissionNo, setAdmissionNo] = useState('');
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  async function load() {
    setLoading(true); setError(null); setCard(null);
    try {
      // Find student by admission_no via admin endpoint
      const list = await api('/api/admin/academic/students?q=' + encodeURIComponent(admissionNo));
      const match = list.body.items.find(s => s.admission_no === admissionNo.trim());
      if (!match) { setError('Student not found'); return; }
      const r = await api(`/api/operator/id-card/student/${match.student_id}`);
      setCard(r.card);
      onOpen(r.card);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }
  return (
    <div className="card"><div className="card-body space-y-3">
      <p className="text-sm text-slate-600">Enter a student's admission number to generate their ID card.</p>
      <div className="flex gap-2">
        <input className="input max-w-xs" placeholder="ADM-0001" value={admissionNo} onChange={e => setAdmissionNo(e.target.value)} />
        <button onClick={load} disabled={loading || !admissionNo} className="btn-primary">{loading ? 'Loading…' : 'Generate'}</button>
      </div>
      {error && <div className="text-sm text-red-600">{error}</div>}
      {card && <StudentCardFront card={card} />}
    </div></div>
  );
}

function StaffPanel({ onOpen }) {
  const [userId, setUserId] = useState('');
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  async function load() {
    setLoading(true); setError(null); setCard(null);
    try {
      const r = await api(`/api/operator/id-card/staff/${userId}`);
      setCard(r.card);
      onOpen(r.card);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }
  return (
    <div className="card"><div className="card-body space-y-3">
      <p className="text-sm text-slate-600">Enter a user ID to generate their staff ID card.</p>
      <div className="flex gap-2">
        <input type="number" className="input max-w-xs" placeholder="User ID (e.g. 3 = teacher)" value={userId} onChange={e => setUserId(e.target.value)} />
        <button onClick={load} disabled={loading || !userId} className="btn-primary">{loading ? 'Loading…' : 'Generate'}</button>
      </div>
      {error && <div className="text-sm text-red-600">{error}</div>}
      {card && <StaffCardFront card={card} />}
    </div></div>
  );
}
