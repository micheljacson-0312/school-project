import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api.js';

const TYPE_LABEL = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  contract: 'Contract',
  visiting: 'Visiting',
  internship: 'Internship',
};

export default function JobsListPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api('/api/public/jobs').then(d => setItems(d.items)).finally(() => setLoading(false));
  }, []);
  return (
    <div>
      <section className="bg-brand-700 text-white">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <h1 className="text-3xl md:text-4xl font-bold">Careers</h1>
          <p className="text-brand-100 mt-2 max-w-2xl">Join our team. We hire teachers, administrators, and support staff who care about young people and want to grow in their craft.</p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-10">
        {loading ? <p className="text-slate-500">Loading…</p> : items.length === 0 ? (
          <div className="card"><div className="card-body text-slate-600">No open positions at the moment. Please check back later.</div></div>
        ) : (
          <ul className="grid md:grid-cols-2 gap-4">
            {items.map(j => (
              <li key={j.id} className="card">
                <div className="card-body">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold">{j.title}</h3>
                    <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">{TYPE_LABEL[j.employment_type]}</span>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">{j.department || ''}{j.department && j.location && ' · '}{j.location || ''}</p>
                  <p className="text-sm text-slate-700 mt-3 line-clamp-3">{j.description}</p>
                  <div className="text-xs text-slate-500 mt-3">
                    {j.salary_range && <span>{j.salary_range}</span>}
                    {j.apply_deadline && <span className="ml-3">Apply by {new Date(j.apply_deadline).toLocaleDateString()}</span>}
                  </div>
                  <Link to={`/careers/${j.id}`} className="btn-primary inline-flex mt-4 text-sm">View & apply →</Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
