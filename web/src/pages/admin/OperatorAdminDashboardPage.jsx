// Operator admin dashboard (Phase 7) — replaces Phase 1 placeholder.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api.js';
import RoleQuickActions from '../../components/RoleQuickActions.jsx';

function Metric({ label, value }) {
  return (
    <div className="card"><div className="card-body">
      <div className="text-xs uppercase text-slate-500">{label}</div>
      <div className="text-3xl font-semibold mt-1">{value ?? '—'}</div>
    </div></div>
  );
}

export default function OperatorAdminDashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => { api('/api/operator/dashboard').then(setData).catch(e => setError(e.message)); }, []);
  if (error) return <div className="card"><div className="card-body text-red-700">{error}</div></div>;
  if (!data) return <p className="text-slate-500">Loading…</p>;
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{data.greeting}</h1>
        <p className="text-slate-500">Computer operator — ID cards, certificates, and document generation.</p>
      </header>
      <RoleQuickActions roleKey="operator" />
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label="Active students" value={data.students_active} />
        <Metric label="Active teachers" value={data.teachers_active} />
        <Metric label="Document templates" value={data.active_templates} />
        <Metric label="Documents generated" value={data.documents_generated} />
      </section>
      <section className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
        <Link to="/admin/id-cards" className="card hover:shadow"><div className="card-body"><div className="font-semibold">ID cards</div><div className="text-xs text-slate-500 mt-1">Generate student + staff ID cards</div></div></Link>
        <Link to="/admin/certificates" className="card hover:shadow"><div className="card-body"><div className="font-semibold">Certificates</div><div className="text-xs text-slate-500 mt-1">Generate achievement / transfer certificates</div></div></Link>
        <Link to="/admin/fee-structures" className="card hover:shadow"><div className="card-body"><div className="font-semibold">Fee structure PDF</div><div className="text-xs text-slate-500 mt-1">Printable schedule per session</div></div></Link>
        <Link to="/admin/documents" className="card hover:shadow"><div className="card-body"><div className="font-semibold">Document templates</div><div className="text-xs text-slate-500 mt-1">List active templates</div></div></Link>
        <Link to="/admin/reports-export" className="card hover:shadow"><div className="card-body"><div className="font-semibold">Reports &amp; exports</div><div className="text-xs text-slate-500 mt-1">CSV exports for students, teachers, marks, fees</div></div></Link>
      </section>
    </div>
  );
}
