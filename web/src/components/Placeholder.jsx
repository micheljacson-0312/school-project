// Inline SVG placeholder. Renders a colored gradient with the optional
// caption as label text. Used when an image URL is missing or fails to
// load — keeps the layout intact in the sandboxed preview where
// external images don't load.
import React from 'react';

// Deterministic color from a string (so each caption gets a consistent hue).
function hashColor(s) {
  let h = 0;
  for (let i = 0; i < (s || '').length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const hue1 = h % 360;
  const hue2 = (hue1 + 35) % 360;
  return [`hsl(${hue1},70%,55%)`, `hsl(${hue2},65%,40%)`];
}

export default function Placeholder({ label = '', aspect = '16/9', className = '', rounded = 'rounded-lg' }) {
  const [c1, c2] = hashColor(label);
  const id = `g-${label.replace(/\W/g, '').slice(0, 12) || Math.random().toString(36).slice(2, 8)}`;
  return (
    <div className={`relative overflow-hidden ${rounded} ${className}`} style={{ aspectRatio: aspect }}>
      <svg viewBox="0 0 100 56" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"  stopColor={c1} />
            <stop offset="100%" stopColor={c2} />
          </linearGradient>
        </defs>
        <rect width="100" height="56" fill={`url(#${id})`} />
        {/* decorative shapes */}
        <circle cx="80" cy="14" r="10" fill="rgba(255,255,255,0.18)" />
        <circle cx="20" cy="46" r="14" fill="rgba(255,255,255,0.10)" />
      </svg>
      {label && (
        <div className="absolute inset-0 grid place-items-center text-white/95 font-semibold text-sm sm:text-base text-center px-3 drop-shadow">
          {label}
        </div>
      )}
    </div>
  );
}

// Smart image: tries the URL, falls back to a placeholder on error.
export function SmartImage({ src, label = '', alt = '', className = '', aspect = '16/9', rounded = 'rounded-lg' }) {
  const [errored, setErrored] = React.useState(!src);
  React.useEffect(() => { setErrored(!src); }, [src]);
  if (!src || errored) return <Placeholder label={label || alt} aspect={aspect} className={className} rounded={rounded} />;
  return (
    <div className={`relative overflow-hidden ${rounded} ${className}`} style={{ aspectRatio: aspect }}>
      <img
        src={src}
        alt={alt || label}
        loading="lazy"
        onError={() => setErrored(true)}
        className="absolute inset-0 w-full h-full object-cover"
      />
    </div>
  );
}
