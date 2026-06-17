import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api.js';
import { SmartImage } from '../../components/Placeholder.jsx';

export default function GalleryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('newest');
  useEffect(() => {
    setLoading(true);
    api('/api/public/gallery').then(d => setItems(d.items)).finally(() => setLoading(false));
  }, []);
  const categories = useMemo(() => ['all', ...Array.from(new Set(items.map(i => i.category).filter(Boolean)))], [items]);
  const filtered = useMemo(() => {
    let list = items;
    if (category !== 'all') list = list.filter(i => i.category === category);
    list = [...list];
    if (sort === 'newest') list.sort((a, b) => new Date(b.taken_on || 0) - new Date(a.taken_on || 0));
    if (sort === 'oldest') list.sort((a, b) => new Date(a.taken_on || 0) - new Date(b.taken_on || 0));
    return list;
  }, [items, category, sort]);
  return (
    <div>
      <section className="bg-brand-700 text-white">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <h1 className="text-3xl md:text-4xl font-bold">Gallery</h1>
          <p className="text-brand-100 mt-2">Moments from classrooms, events, sports, and the wider school community.</p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="text-sm">
            <span className="text-slate-500 mr-2">Category:</span>
            {categories.map(c => (
              <button key={c} onClick={() => setCategory(c)}
                className={'mr-1 px-3 py-1.5 rounded text-sm ' + (category === c ? 'bg-brand-600 text-white' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50')}>
                {c === 'all' ? 'All' : c}
              </button>
            ))}
          </div>
          <div className="ml-auto text-sm">
            <label className="text-slate-500 mr-2">Sort:</label>
            <select className="input inline-block !w-auto !py-1.5" value={sort} onChange={e => setSort(e.target.value)}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>
        </div>

        {loading ? <p className="text-slate-500">Loading…</p> : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map(g => (
              <figure key={g.id}>
                <SmartImage src={g.media_url} label={g.caption || g.category} aspect="1/1" />
                <figcaption className="text-xs text-slate-500 mt-1 flex justify-between">
                  <span className="truncate">{g.caption || '—'}</span>
                  <span>{g.taken_on ? new Date(g.taken_on).toLocaleDateString() : ''}</span>
                </figcaption>
              </figure>
            ))}
            {filtered.length === 0 && <p className="text-slate-500 text-sm">No items match the filter.</p>}
          </div>
        )}
      </section>
    </div>
  );
}
