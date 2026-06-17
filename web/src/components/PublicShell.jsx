import { Link, NavLink, Outlet } from 'react-router-dom';
import { useState } from 'react';
import { useSite } from '../lib/site.jsx';
import { useAuth } from '../lib/auth.jsx';

const NAV = [
  { to: '/',            label: 'Home' },
  { to: '/about',       label: 'About' },
  { to: '/academics',   label: 'Academics' },
  { to: '/admissions',  label: 'Admissions' },
  { to: '/news',        label: 'News & Events' },
  { to: '/gallery',     label: 'Gallery' },
  { to: '/careers',     label: 'Careers' },
  { to: '/contact',     label: 'Contact' },
];

export default function PublicShell() {
  const { settings } = useSite();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-md bg-brand-600 text-white grid place-items-center font-bold shrink-0">
              {settings.school_name?.[0] || 'S'}
            </div>
            <div className="min-w-0">
              <div className="font-semibold truncate">{settings.school_name}</div>
              {settings.school_tagline && (
                <div className="text-xs text-slate-500 truncate">{settings.school_tagline}</div>
              )}
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 text-sm">
            {NAV.map(n => (
              <NavLink key={n.to} to={n.to} end={n.to === '/'}
                className={({ isActive }) =>
                  'px-3 py-2 rounded ' +
                  (isActive ? 'bg-brand-50 text-brand-700 font-medium' : 'text-slate-600 hover:bg-slate-100')
                }>
                {n.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <Link to={`/${user.role.key}`} className="btn-secondary text-sm">
                {user.role.name}
              </Link>
            ) : (
              <Link to="/login" className="btn-primary text-sm">Sign in</Link>
            )}
          </div>

          {/* Mobile burger */}
          <button onClick={() => setMenuOpen(v => !v)}
            className="md:hidden btn-secondary !p-2" aria-label="Toggle menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {menuOpen
                ? <path d="M6 6l12 12M6 18L18 6" />
                : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>

        {/* Mobile drawer */}
        {menuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white">
            <div className="max-w-6xl mx-auto px-4 py-2 grid gap-1">
              {NAV.map(n => (
                <NavLink key={n.to} to={n.to} end={n.to === '/'} onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    'px-3 py-2 rounded ' +
                    (isActive ? 'bg-brand-50 text-brand-700 font-medium' : 'text-slate-700 hover:bg-slate-100')
                  }>
                  {n.label}
                </NavLink>
              ))}
              <div className="border-t border-slate-100 my-1" />
              {user ? (
                <Link to={`/${user.role.key}`} onClick={() => setMenuOpen(false)} className="btn-secondary text-sm justify-start">
                  My portal ({user.role.name})
                </Link>
              ) : (
                <Link to="/login" onClick={() => setMenuOpen(false)} className="btn-primary text-sm justify-start">
                  Sign in
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-slate-900 text-slate-200 mt-12">
        <div className="max-w-6xl mx-auto px-4 py-10 grid sm:grid-cols-2 md:grid-cols-4 gap-6 text-sm">
          <div>
            <div className="font-semibold text-white text-base">{settings.school_name}</div>
            {settings.school_tagline && <p className="text-slate-400 mt-1">{settings.school_tagline}</p>}
          </div>
          <div>
            <div className="font-semibold text-white">Contact</div>
            <p className="mt-1">{settings.school_address}</p>
            <p>{settings.school_phone}</p>
            <p>{settings.school_email}</p>
            {settings.office_hours && <p className="text-slate-400 mt-1">{settings.office_hours}</p>}
          </div>
          <div>
            <div className="font-semibold text-white">Explore</div>
            <ul className="mt-1 space-y-1">
              {NAV.slice(1).map(n => (
                <li key={n.to}><Link to={n.to} className="hover:text-white">{n.label}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <div className="font-semibold text-white">Follow us</div>
            <div className="mt-1 flex gap-3">
              {settings.school_facebook  && <a href={settings.school_facebook}  target="_blank" rel="noreferrer" className="hover:text-white">Facebook</a>}
              {settings.school_instagram && <a href={settings.school_instagram} target="_blank" rel="noreferrer" className="hover:text-white">Instagram</a>}
              {settings.school_youtube   && <a href={settings.school_youtube}   target="_blank" rel="noreferrer" className="hover:text-white">YouTube</a>}
            </div>
          </div>
        </div>
        <div className="border-t border-slate-800 text-center text-xs text-slate-500 py-4">
          © {new Date().getFullYear()} {settings.school_name}. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
