// Site context: fetches /api/public/site once and exposes settings/slides/etc.
// to all public pages. Falls back to safe defaults if the request fails.
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './api.js';

const SiteContext = createContext(null);

const DEFAULTS = {
  settings: {
    school_name: 'School',
    school_tagline: '',
    school_address: '',
    school_phone: '',
    school_email: '',
    school_whatsapp: '',
    school_facebook: '',
    school_instagram: '',
    school_youtube: '',
    map_embed_url: '',
    admissions_open: true,
    office_hours: '',
  },
  slides: [],
  achievements: [],
  principal: null,
  latest_news: [],
  gallery_preview: [],
};

export function SiteProvider({ children }) {
  const [data, setData] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api('/api/public/homepage')
      .then(d => { if (!cancelled) { setData({ ...DEFAULTS, ...d }); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const value = useMemo(() => ({ ...data, loading }), [data, loading]);
  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite() {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error('useSite must be used inside <SiteProvider>');
  return ctx;
}

// Build a WhatsApp click-to-chat URL from the configured number.
// Expected format: international digits without '+' or spaces, e.g. "923001234567".
export function whatsappUrl(number, message = '') {
  if (!number) return null;
  const digits = String(number).replace(/[^0-9]/g, '');
  if (!digits) return null;
  const text = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${digits}${text}`;
}
