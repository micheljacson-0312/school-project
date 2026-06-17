import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSite } from '../../lib/site.jsx';
import { SmartImage } from '../../components/Placeholder.jsx';
import AnnouncementsBanner from '../../components/AnnouncementsBanner.jsx';
import Title from '../../components/Title.jsx';

// Simple auto-rotating carousel (no deps). Pauses on hover.
function HeroCarousel({ slides, schoolName }) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || slides.length < 2) return;
    const t = setInterval(() => setIdx(i => (i + 1) % slides.length), 6000);
    return () => clearInterval(t);
  }, [paused, slides.length]);
  if (!slides.length) return null;
  const s = slides[idx];
  return (
    <div className="relative bg-brand-700 text-white overflow-hidden"
         onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="max-w-6xl mx-auto px-4 py-16 md:py-24 grid md:grid-cols-2 gap-8 items-center min-h-[360px]">
        <div className="space-y-4">
          <p className="uppercase tracking-wider text-brand-100 text-xs">{schoolName}</p>
          <h1 className="text-3xl md:text-5xl font-bold leading-tight">{s.title}</h1>
          {s.subtitle && <p className="text-brand-100 max-w-lg">{s.subtitle}</p>}
          {s.cta_label && s.cta_href && (
            <Link to={s.cta_href} className="inline-block bg-white text-brand-700 px-5 py-2.5 rounded-md font-medium hover:bg-brand-50">
              {s.cta_label} →
            </Link>
          )}
        </div>
        <div>
          <SmartImage src={s.image_url} label={s.title} aspect="4/3" rounded="rounded-xl" />
        </div>
      </div>
      {slides.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {slides.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)} aria-label={`Slide ${i+1}`}
              className={'w-2.5 h-2.5 rounded-full transition ' + (i === idx ? 'bg-white' : 'bg-white/40')} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  const { settings, slides, achievements, principal, latest_news, gallery_preview, announcements, stats, loading } = useSite();
  const foundedYear = stats?.founded_year;
  const yearsOfService = foundedYear ? new Date().getFullYear() - foundedYear : null;
  return (
    <div>
      <Title>Home</Title>
      <AnnouncementsBanner announcements={announcements} />
      <HeroCarousel slides={slides} schoolName={settings.school_name} />

      {/* Quick-info strip */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-6 grid sm:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="font-semibold text-slate-700">Admissions {settings.admissions_open ? 'open' : 'closed'}</div>
            <p className="text-slate-500 mt-1">Apply online for the next academic session.</p>
            <Link to="/admissions" className="text-brand-700 font-medium mt-2 inline-block">Apply now →</Link>
          </div>
          <div>
            <div className="font-semibold text-slate-700">Contact us</div>
            <p className="text-slate-500 mt-1">{settings.school_phone || '—'}<br />{settings.school_email || '—'}</p>
            <Link to="/contact" className="text-brand-700 font-medium mt-2 inline-block">Get directions →</Link>
          </div>
          <div>
            <div className="font-semibold text-slate-700">Visit the school</div>
            <p className="text-slate-500 mt-1">{settings.school_address || '—'}</p>
            <p className="text-slate-400 text-xs mt-2">{settings.office_hours}</p>
          </div>
        </div>
      </section>

      {/* Achievements */}
      {achievements.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-semibold mb-6">Recent achievements</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {achievements.map(a => (
              <div key={a.id} className="card">
                <div className="card-body">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wide text-brand-700 font-semibold">{a.year}</span>
                    <span className="text-2xl" aria-hidden>
                      {a.icon === 'trophy' && '🏆'}
                      {a.icon === 'medal'  && '🥇'}
                      {a.icon === 'star'   && '⭐'}
                      {a.icon === 'flask'  && '🧪'}
                      {a.icon === 'book'   && '📚'}
                    </span>
                  </div>
                  <h3 className="font-semibold mt-1">{a.title}</h3>
                  {a.description && <p className="text-sm text-slate-600 mt-1">{a.description}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Principal's message */}
      {principal && (
        <section className="bg-white border-y border-slate-200">
          <div className="max-w-6xl mx-auto px-4 py-12 grid md:grid-cols-3 gap-8">
            <div className="md:col-span-1">
              <div className="text-xs uppercase tracking-wide text-brand-700 font-semibold">Principal's message</div>
              <h2 className="text-2xl font-semibold mt-2">{principal.principal_name}</h2>
              <p className="text-slate-500">{principal.designation}</p>
            </div>
            <div className="md:col-span-2">
              {principal.message_body.split('\n\n').map((p, i) => (
                <p key={i} className="text-slate-700 leading-relaxed mt-3 first:mt-0">{p}</p>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Latest news + gallery preview */}
      <section className="max-w-6xl mx-auto px-4 py-12 grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">Latest news & events</h2>
            <Link to="/news" className="text-brand-700 font-medium">All news →</Link>
          </div>
          {loading && <p className="text-slate-500">Loading…</p>}
          <div className="grid sm:grid-cols-2 gap-4">
            {latest_news.map(n => (
              <Link to={`/news/${n.slug}`} key={n.id} className="card hover:shadow-md transition-shadow">
                <SmartImage src={n.cover_image} label={n.title} aspect="16/9" />
                <div className="card-body">
                  <span className={'text-xs uppercase font-semibold ' + (n.type === 'event' ? 'text-purple-700' : 'text-brand-700')}>
                    {n.type}
                  </span>
                  <h3 className="font-semibold mt-1">{n.title}</h3>
                  {n.excerpt && <p className="text-sm text-slate-600 mt-1 line-clamp-2">{n.excerpt}</p>}
                </div>
              </Link>
            ))}
            {latest_news.length === 0 && !loading && <p className="text-slate-500 text-sm">No news yet.</p>}
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">From the gallery</h2>
            <Link to="/gallery" className="text-brand-700 text-sm font-medium">All →</Link>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {gallery_preview.slice(0, 6).map(g => (
              <SmartImage key={g.id} src={g.media_url} label={g.caption} aspect="1/1" rounded="rounded-md" />
            ))}
          </div>
        </div>
      </section>

      {/* Live stats strip */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <div className="text-3xl md:text-4xl font-bold text-brand-700">{stats?.students?.toLocaleString() ?? '—'}</div>
            <div className="text-xs uppercase tracking-wide text-slate-500 mt-1">Students enrolled</div>
          </div>
          <div>
            <div className="text-3xl md:text-4xl font-bold text-brand-700">{stats?.teachers?.toLocaleString() ?? '—'}</div>
            <div className="text-xs uppercase tracking-wide text-slate-500 mt-1">Teaching staff</div>
          </div>
          <div>
            <div className="text-3xl md:text-4xl font-bold text-brand-700">{stats?.grades ?? '—'}</div>
            <div className="text-xs uppercase tracking-wide text-slate-500 mt-1">Grade levels</div>
          </div>
          <div>
            <div className="text-3xl md:text-4xl font-bold text-brand-700">{yearsOfService ?? '—'}+</div>
            <div className="text-xs uppercase tracking-wide text-slate-500 mt-1">Years of service</div>
          </div>
        </div>
      </section>

      {/* CTA strip */}
      <section className="bg-brand-700 text-white">
        <div className="max-w-6xl mx-auto px-4 py-10 grid sm:grid-cols-2 gap-6 items-center">
          <div>
            <h2 className="text-2xl font-semibold">Ready to join us?</h2>
            <p className="text-brand-100 mt-1">Admissions for the next session are open. Submit your application online in a few minutes.</p>
          </div>
          <div className="flex flex-wrap gap-3 sm:justify-end">
            <Link to="/admissions" className="bg-white text-brand-700 px-5 py-2.5 rounded-md font-medium hover:bg-brand-50">
              Apply for admission
            </Link>
            <Link to="/contact" className="border border-white/40 px-5 py-2.5 rounded-md font-medium hover:bg-white/10">
              Contact us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
