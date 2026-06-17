// Tiny SEO helper: sets document.title per page, and optionally appends
// the school name as a suffix. Use at the top of each page component.
import { useEffect } from 'react';
import { useSite } from '../lib/site.jsx';

export default function Title({ children }) {
  const { settings } = useSite();
  useEffect(() => {
    const suffix = settings?.school_name && settings.school_name !== 'School' ? settings.school_name : null;
    document.title = suffix ? `${children} · ${suffix}` : String(children || 'School Platform');
  }, [children, settings?.school_name]);
  return null;
}
