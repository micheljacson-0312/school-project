import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { SmartImage } from '../../components/Placeholder.jsx';
import Title from '../../components/Title.jsx';

export default function NewsListPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  useEffect(() => {
    setLoading(true);
    api('/api/public/news').then(d => setItems(d.items)).finally(() => setLoading(false));
  }, []);
  const filtered = filter === 'all' ? items : items.filter(i => i.type === filter);
  return (
    <div>
      <Title>News & Events</Title>
      <section className="bg-brand-700 text-white">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <h1 className="text-3xl md:text-4xl font-bold">News & Events</h1>
          <p className="text-brand-100 mt-2">Announcements, achievements, and upcoming events.</p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex items-center gap-2 mb-6 text-sm">
          {['all','news','event'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={'px-3 py-1.5 rounded ' + (filter === f ? 'bg-brand-600 text-white' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50')}>
              {f === 'all' ? 'All' : f === 'news' ? 'News' : 'Events'}
            </button>
          ))}
        </div>

        {loading ? <p className="text-slate-500">Loading…</p> : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(n => (
              <Link key={n.id} to={`/news/${n.slug}`} className="card hover:shadow-md transition-shadow overflow-hidden">
                <SmartImage src={n.cover_image} label={n.title} aspect="16/9" rounded="rounded-none" />
                <div className="card-body">
                  <span className={'text-xs uppercase font-semibold ' + (n.type === 'event' ? 'text-purple-700' : 'text-brand-700')}>
                    {n.type}
                  </span>
                  <h3 className="font-semibold mt-1">{n.title}</h3>
                  {n.excerpt && <p className="text-sm text-slate-600 mt-1 line-clamp-3">{n.excerpt}</p>}
                  <p className="text-xs text-slate-400 mt-3">
                    {n.published_at ? new Date(n.published_at).toLocaleDateString() : ''}
                    {n.event_date && ' · ' + new Date(n.event_date).toLocaleDateString()}
                  </p>
                </div>
              </Link>
            ))}
            {filtered.length === 0 && <p className="text-slate-500 text-sm">Nothing in this category yet.</p>}
          </div>
        )}
      </section>
    </div>
  );
}
