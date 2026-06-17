// Slim dismissible banner that renders active announcements stacked
// (top-to-bottom by id desc). Shown on top of the homepage.
import { useState } from 'react';
import { Link } from 'react-router-dom';

const SEVERITY_STYLES = {
  info:    'bg-sky-50 text-sky-900 border-sky-200',
  success: 'bg-emerald-50 text-emerald-900 border-emerald-200',
  warning: 'bg-amber-50 text-amber-900 border-amber-200',
  danger:  'bg-red-50 text-red-900 border-red-200',
};

const SEVERITY_ICON = {
  info: 'ℹ️',
  success: '✅',
  warning: '⚠️',
  danger: '⛔',
};

export default function AnnouncementsBanner({ announcements }) {
  const [dismissed, setDismissed] = useState(() => new Set());
  if (!announcements || announcements.length === 0) return null;
  const visible = announcements.filter(a => !dismissed.has(a.id));
  if (visible.length === 0) return null;
  return (
    <div className="space-y-1">
      {visible.map(a => (
        <div key={a.id}
             role="status"
             className={`border-y px-4 py-2 text-sm ${SEVERITY_STYLES[a.severity] || SEVERITY_STYLES.info}`}>
          <div className="max-w-6xl mx-auto flex items-start gap-3">
            <span aria-hidden className="shrink-0">{SEVERITY_ICON[a.severity] || SEVERITY_ICON.info}</span>
            <div className="flex-1 min-w-0">
              <span className="font-semibold">{a.title}</span>
              {a.body && <span className="hidden sm:inline"> — {a.body}</span>}
              {a.link_label && a.link_href && (
                <Link to={a.link_href} className="ml-2 underline font-medium hover:opacity-80">
                  {a.link_label} →
                </Link>
              )}
            </div>
            <button onClick={() => setDismissed(s => new Set([...s, a.id]))}
                    aria-label="Dismiss announcement"
                    className="shrink-0 opacity-60 hover:opacity-100">✕</button>
          </div>
        </div>
      ))}
    </div>
  );
}
