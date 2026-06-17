// Alumni search (Phase 7) — directory browsing with filters.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../../lib/api.js';

export default function AlumniSearchPage() {
  const [results, setResults] = useState([]);
  const [batches, setBatches] = useState([]);
  const [q, setQ] = useState('');
  const [year, setYear] = useState('');
  const [profession, setProfession] = useState('');
  const [batch, setBatch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api('/api/alumni/batches').then(d => setBatches(d.items)).catch(() => {});
  }, []);

  function search() {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (year) params.set('year', year);
    if (profession) params.set('profession', profession);
    if (batch) params.set('batch', batch);
    api(`/api/alumni/search?${params}`).then(d => setResults(d.results)).finally(() => setLoading(false));
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">Alumni directory</h1>
        <p className="text-slate-500">Search verified alumni by name, profession, organization, batch, or graduation year.</p>
      </header>

      <div className="card">
        <div className="card-body grid sm:grid-cols-4 gap-3">
          <div>
            <label className="label">Search</label>
            <input className="input" placeholder="Name, profession…" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()} />
          </div>
          <div>
            <label className="label">Year</label>
            <input type="number" className="input" placeholder="e.g. 2020" value={year} onChange={e => setYear(e.target.value)} />
          </div>
          <div>
            <label className="label">Profession</label>
            <input className="input" placeholder="Engineer, Doctor…" value={profession} onChange={e => setProfession(e.target.value)} />
          </div>
          <div>
            <label className="label">Batch</label>
            <select className="input" value={batch} onChange={e => setBatch(e.target.value)}>
              <option value="">Any</option>
              {batches.map(b => <option key={b.batch_name} value={b.batch_name}>{b.batch_name} ({b.first_year}–{b.last_year})</option>)}
            </select>
          </div>
        </div>
        <div className="px-5 pb-4">
          <button onClick={search} disabled={loading} className="btn-primary">{loading ? 'Searching…' : 'Search'}</button>
        </div>
      </div>

      <div className="card">
        <ul className="divide-y divide-slate-200">
          {results.map(r => (
            <li key={r.id} className="px-4 py-3 flex items-center justify-between">
              <div>
                <div className="font-medium">{r.full_name}</div>
                <div className="text-xs text-slate-500">
                  {r.passing_year} · {r.batch_name || '—'} · {r.profession || '—'}
                  {r.organization ? ` at ${r.organization}` : ''}
                </div>
                <div className="text-xs text-slate-400">{r.city || ''}{r.country ? `, ${r.country}` : ''}</div>
              </div>
            </li>
          ))}
          {!loading && results.length === 0 && (
            <li className="px-4 py-6 text-center text-slate-500 text-sm">No matches.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
