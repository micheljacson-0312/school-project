import { useState } from 'react';
import { useSite, whatsappUrl } from '../../lib/site.jsx';
import { api } from '../../lib/api.js';

const initial = { name: '', email: '', phone: '', subject: '', message: '' };

export default function ContactPage() {
  const { settings } = useSite();
  const [form, setForm] = useState(initial);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const wa = whatsappUrl(settings.school_whatsapp, 'Hello! I am reaching out from the school website.');

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api('/api/public/contact', { method: 'POST', body: form });
      setSubmitted(true);
      setForm(initial);
    } catch (err) {
      setError(err.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <section className="bg-brand-700 text-white">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <h1 className="text-3xl md:text-4xl font-bold">Contact us</h1>
          <p className="text-brand-100 mt-2">Reach out by phone, WhatsApp, or the form below. We typically reply within one working day.</p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-10 grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {settings.map_embed_url ? (
            <div className="card overflow-hidden">
              <iframe
                title="School location"
                src={settings.map_embed_url}
                className="w-full h-72 border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          ) : (
            <div className="card"><div className="card-body text-sm text-slate-500">Map not configured. Set <code>map_embed_url</code> in admin settings.</div></div>
          )}

          <form onSubmit={onSubmit} className="card">
            <div className="card-body space-y-3">
              <h2 className="text-xl font-semibold">Send a message</h2>
              {submitted ? (
                <div className="text-emerald-700">✓ Your message has been received. We'll be in touch.</div>
              ) : (
                <>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="label" htmlFor="cn">Your name *</label>
                      <input id="cn" required className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                    </div>
                    <div>
                      <label className="label" htmlFor="ce">Email *</label>
                      <input id="ce" type="email" required className="input" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                    </div>
                    <div>
                      <label className="label" htmlFor="cp">Phone</label>
                      <input id="cp" type="tel" className="input" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                    </div>
                    <div>
                      <label className="label" htmlFor="cs">Subject</label>
                      <input id="cs" className="input" value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} />
                    </div>
                  </div>
                  <div>
                    <label className="label" htmlFor="cm">Message *</label>
                    <textarea id="cm" required rows={5} className="input" value={form.message} onChange={e => setForm({...form, message: e.target.value})} />
                  </div>
                  {error && <div className="text-sm text-red-600">Could not send: {error}</div>}
                  <button className="btn-primary" disabled={submitting}>{submitting ? 'Sending…' : 'Send message'}</button>
                </>
              )}
            </div>
          </form>
        </div>

        <aside className="space-y-4">
          <div className="card">
            <div className="card-body text-sm space-y-2">
              <h3 className="font-semibold text-base">Address</h3>
              <p className="text-slate-700">{settings.school_address || '—'}</p>
              <p className="text-xs text-slate-500">{settings.office_hours}</p>
            </div>
          </div>
          <div className="card">
            <div className="card-body text-sm space-y-1">
              <h3 className="font-semibold text-base">Phone & email</h3>
              <p>{settings.school_phone || '—'}</p>
              <p>{settings.school_email || '—'}</p>
            </div>
          </div>
          {wa && (
            <a href={wa} target="_blank" rel="noreferrer"
               className="btn w-full bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-400">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.595 5.39l-.999 3.648 3.893-1.737z"/>
              </svg>
              Chat on WhatsApp
            </a>
          )}
        </aside>
      </section>
    </div>
  );
}
