// Alumni dashboard (Phase 7) — replaces Phase 1 placeholder.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../../lib/api.js';
import RoleQuickActions from '../../../components/RoleQuickActions.jsx';

export default function AlumniDashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => { api('/api/alumni/dashboard').then(setData).catch(e => setError(e.message)); }, []);
  if (error) return <div className="card"><div className="card-body text-red-700">{error}</div></div>;
  if (!data) return <p className="text-slate-500">Loading…</p>;
  const p = data.profile;
  const s = data.stats;
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{data.greeting}</h1>
        <p className="text-slate-500">Stay connected with your alma mater.</p>
      </header>

      <RoleQuickActions roleKey="alumni" />

      {p ? (
        <div className="card"><div className="card-body space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-brand-600 text-white grid place-items-center text-xl font-bold">
              {p.full_name?.[0] || 'A'}
            </div>
            <div>
              <div className="font-semibold text-lg">{p.full_name}</div>
              <div className="text-xs text-slate-500">
                Class of {p.passing_year} · {p.batch_name || '—'} · {p.is_verified ? 'Verified' : 'Pending verification'}
              </div>
            </div>
          </div>
          {p.profession && <div className="text-sm text-slate-700">{p.profession}{p.organization ? ` at ${p.organization}` : ''}{p.city ? ` · ${p.city}, ${p.country || ''}` : ''}</div>}
          {p.bio && <p className="text-sm text-slate-600 italic">{p.bio}</p>}
          <div className="pt-2 flex gap-2">
            <Link to="/alumni/profile" className="btn-secondary text-sm">Edit profile</Link>
          </div>
        </div></div>
      ) : (
        <div className="card"><div className="card-body text-slate-500">
          No alumni profile is linked to this account yet. Ask the alumni coordinator to register you.
        </div></div>
      )}

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card"><div className="card-body">
          <div className="text-xs uppercase text-slate-500">Total alumni</div>
          <div className="text-3xl font-semibold mt-1">{s?.total ?? '—'}</div>
        </div></div>
        <div className="card"><div className="card-body">
          <div className="text-xs uppercase text-slate-500">Last year</div>
          <div className="text-3xl font-semibold mt-1">{s?.last_year ?? '—'}</div>
        </div></div>
        <div className="card"><div className="card-body">
          <div className="text-xs uppercase text-slate-500">Professions</div>
          <div className="text-3xl font-semibold mt-1">{s?.distinct_professions ?? '—'}</div>
        </div></div>
        <div className="card"><div className="card-body">
          <div className="text-xs uppercase text-slate-500">Countries</div>
          <div className="text-3xl font-semibold mt-1">{s?.distinct_countries ?? '—'}</div>
        </div></div>
      </section>

      <section>
        <Link to="/alumni/search" className="btn-primary">Browse alumni directory →</Link>
      </section>
    </div>
  );
}
