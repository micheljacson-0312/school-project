// Admin dashboard — quick overview + shortcut tiles to all sub-pages.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api.js';

function Tile({ to, label, hint, color = 'brand' }) {
  const palette = {
    brand:   'bg-brand-50 text-brand-700 border-brand-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    purple:  'bg-purple-50 text-purple-700 border-purple-100',
    amber:   'bg-amber-50 text-amber-700 border-amber-100',
    slate:   'bg-slate-50 text-slate-700 border-slate-200',
  }[color];
  return (
    <Link to={to} className={`block rounded-lg border ${palette} p-4 hover:shadow-sm transition`}>
      <div className="font-semibold">{label}</div>
      <div className="text-xs opacity-70 mt-1">{hint}</div>
    </Link>
  );
}

export default function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [auditSummary, setAuditSummary] = useState([]);
  useEffect(() => {
    api('/api/admin/dashboard').then(setData).catch(() => {});
    api('/api/admin/audit-logs/summary').then(d => setAuditSummary(d.items || [])).catch(() => {});
  }, []);
  const m = data?.metrics || {};

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{data?.greeting || 'Admin dashboard'}</h1>
        <p className="text-slate-500">System overview and shortcuts to management screens.</p>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Metric label="Active users"    value={m.users_active} />
        <Metric label="Active students" value={m.students_active} />
        <Metric label="Active teachers" value={m.teachers_active} />
        <Metric label="Published news"  value={m.news_published} />
        <Metric label="New admissions"  value={m.new_admissions} />
      </section>

      <section className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
        <Tile to="/admin/users"                    label="Users"              hint="Create accounts, reset passwords, change roles" color="brand" />
        <Tile to="/admin/roles"                    label="Roles & permissions" hint="Tune what each role can do"                  color="purple" />
        <Tile to="/admin/academic/classes"         label="Classes & sections" hint="Academic structure for the session"           color="emerald" />
        <Tile to="/admin/academic/teacher-assignments" label="Teacher assignments" hint="Who teaches what"                          color="emerald" />
        <Tile to="/admin/news"                     label="News & events"      hint="Publish announcements and event notices"     color="brand" />
        <Tile to="/admin/slides"                   label="Homepage carousel"  hint="Hero images on the public homepage"          color="amber" />
        <Tile to="/admin/admissions"               label="Admission applications" hint="Review new applications"                   color="purple" />
        <Tile to="/admin/job-applications"         label="Job applications"   hint="Review candidates"                           color="purple" />
        <Tile to="/admin/mail"                     label="Mail setup"         hint="SMTP credentials for transactional email"    color="slate" />
        <Tile to="/admin/audit"                    label="Audit log"          hint="Sensitive actions, searchable"               color="slate" />
      </section>

      <section className="card">
        <div className="card-body">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Recent activity (last 7 days)</h2>
            <Link to="/admin/audit" className="text-sm text-brand-700 font-medium">View full log →</Link>
          </div>
          {auditSummary.length === 0 ? (
            <p className="text-sm text-slate-500">No audit entries yet.</p>
          ) : (
            <ul className="divide-y divide-slate-200 text-sm">
              {auditSummary.map(row => (
                <li key={row.action} className="py-2 flex items-center justify-between">
                  <code className="bg-slate-100 px-2 py-0.5 rounded text-xs">{row.action}</code>
                  <span className="text-slate-500">{row.n}×</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="card"><div className="card-body">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value ?? '—'}</div>
    </div></div>
  );
}
