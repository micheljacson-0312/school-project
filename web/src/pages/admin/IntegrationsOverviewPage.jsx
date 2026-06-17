// Admin: integration status dashboard. Shows each provider's enabled
// state and links to its settings page. Open endpoint (no auth) for
// diagnostic — settings pages themselves require auth.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api.js';

const CARDS = [
  { key: 'mail',      title: 'Mail (SMTP)',           path: '/admin/mail',           accent: 'bg-sky-100 text-sky-800' },
  { key: 'sms',       title: 'SMS gateway',           path: '/admin/integrations/sms',    accent: 'bg-amber-100 text-amber-800' },
  { key: 'whatsapp',  title: 'WhatsApp',              path: '/admin/integrations/whatsapp', accent: 'bg-emerald-100 text-emerald-800' },
  { key: 'social',    title: 'Social media',          path: '/admin/integrations/social',   accent: 'bg-purple-100 text-purple-800' },
  { key: 'fingerprint', title: 'Fingerprint devices', path: '/admin/fingerprint',     accent: 'bg-slate-200 text-slate-800' },
];

export default function IntegrationsOverviewPage() {
  const [statuses, setStatuses] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api('/api/integrations/mail/status').catch(() => ({})),
      api('/api/integrations/sms/status').catch(() => ({})),
      api('/api/integrations/whatsapp/status').catch(() => ({})),
      api('/api/integrations/social/status').catch(() => ({ platforms: [] })),
      api('/api/integrations/fingerprint/status').catch(() => ({})),
    ]).then(([mail, sms, wa, social, fp]) => {
      setStatuses({ mail, sms, whatsapp: wa, social, fingerprint: fp });
    }).finally(() => setLoading(false));
  }, []);

  function summaryFor(key) {
    const s = statuses[key] || {};
    if (key === 'mail')      return { enabled: !!s.enabled, detail: s.driver || 'log' };
    if (key === 'sms')       return { enabled: !!s.enabled, detail: s.driver || 'log' };
    if (key === 'whatsapp')  return { enabled: !!s.enabled, detail: s.provider || 'click_to_chat' };
    if (key === 'social')    return { enabled: (s.platforms || []).some(p => p.is_enabled), detail: `${(s.platforms || []).filter(p => p.is_enabled).length} platform(s) on` };
    if (key === 'fingerprint')return { enabled: !!s.enabled, detail: s.driver || 'stub' };
    return { enabled: false, detail: '—' };
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">Integrations</h1>
        <p className="text-slate-500 text-sm">External service providers — all pluggable, all with feature flags. New providers can be added without refactoring core code.</p>
      </header>

      {loading ? <p className="text-slate-500">Loading…</p> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CARDS.map(c => {
            const s = summaryFor(c.key);
            return (
              <Link key={c.key} to={c.path} className="card hover:shadow-md transition-shadow">
                <div className="card-body space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold">{c.title}</div>
                    <span className={'text-xs px-2 py-1 rounded ' + c.accent}>{s.detail}</span>
                  </div>
                  <div className="text-sm">
                    {s.enabled
                      ? <span className="text-emerald-700">● active</span>
                      : <span className="text-slate-500">○ inactive</span>}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <div className="card">
        <div className="card-body">
          <h2 className="font-semibold mb-2">Recent integration activity</h2>
          <p className="text-sm text-slate-500">
            View the <Link to="/admin/integrations/log" className="text-brand-700 underline">integration log</Link> for
            recent sends across all channels (mail, SMS, WhatsApp, social).
          </p>
        </div>
      </div>
    </div>
  );
}
