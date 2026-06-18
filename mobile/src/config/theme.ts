// Theme tokens — match the web app's Tailwind classes so the two
// products feel like the same product. Keep names short + use the
// same hex values as `tailwind.config.js` on the web side.
export const theme = {
  colors: {
    // Brand (web: brand-600)
    brand:        '#1d64e8',
    brandDark:    '#1a56c4',
    brandLight:   '#eaf1fd',
    // Accents
    emerald:      '#10b981',
    emeraldLight: '#d1fae5',
    sky:          '#0ea5e9',
    skyLight:     '#e0f2fe',
    amber:        '#f59e0b',
    amberLight:   '#fef3c7',
    red:          '#dc2626',
    redLight:     '#fee2e2',
    purple:       '#7c3aed',
    purpleLight:  '#ede9fe',
    // Neutrals (web: slate-*)
    white:        '#ffffff',
    bg:           '#f8fafc',
    border:       '#e2e8f0',
    text:         '#0f172a',
    textMuted:    '#64748b',
    textSubtle:   '#94a3b8',
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  radius: { sm: 6, md: 8, lg: 12, xl: 16, full: 999 },
  font: {
    h1: { fontSize: 26, fontWeight: '700' as const },
    h2: { fontSize: 20, fontWeight: '600' as const },
    body: { fontSize: 15, fontWeight: '400' as const },
    label: { fontSize: 13, fontWeight: '500' as const },
    small: { fontSize: 12, fontWeight: '400' as const },
  },
};
