import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { SmartImage } from '../../components/Placeholder.jsx';

export default function NewsDetailPage() {
  const { slug } = useParams();
  const [item, setItem] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    api(`/api/public/news/${slug}`).then(d => setItem(d.item)).catch(e => setError(e.data?.error || e.message));
  }, [slug]);
  if (error) return (
    <div className="max-w-3xl mx-auto px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">Article not found</h1>
      <p className="text-slate-500 mt-2">We couldn't find what you were looking for.</p>
      <Link to="/news" className="btn-primary mt-4 inline-flex">Back to News & Events</Link>
    </div>
  );
  if (!item) return <div className="max-w-3xl mx-auto px-4 py-16 text-slate-500">Loading…</div>;

  return (
    <article className="max-w-3xl mx-auto px-4 py-10">
      <Link to="/news" className="text-sm text-brand-700">← All news & events</Link>
      <span className={'ml-3 text-xs uppercase font-semibold ' + (item.type === 'event' ? 'text-purple-700' : 'text-brand-700')}>
        {item.type}
      </span>
      <h1 className="text-3xl md:text-4xl font-bold mt-2">{item.title}</h1>
      <p className="text-sm text-slate-500 mt-1">
        {item.published_at && 'Published ' + new Date(item.published_at).toLocaleDateString()}
        {item.event_date && ' · Event date ' + new Date(item.event_date).toLocaleDateString()}
      </p>
      {item.cover_image && (
        <div className="my-6"><SmartImage src={item.cover_image} label={item.title} aspect="16/9" /></div>
      )}
      <div className="prose max-w-none text-slate-800 leading-relaxed"
           dangerouslySetInnerHTML={{ __html: item.body || item.excerpt || '' }} />
    </article>
  );
}
