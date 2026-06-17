// Install prompt component — handles Android/Desktop Chrome's
// beforeinstallprompt API and shows an iOS-specific hint for Safari.
// Saves user choice in localStorage so we don't nag.
import { useEffect, useState } from 'react';
import { applyRoleShell, isIOS, isInStandaloneMode } from '../lib/pwa.jsx';
import { useAuth } from '../lib/auth.jsx';

const DISMISS_KEY = 'pwa_install_dismissed_v1';

export default function InstallPrompt() {
  const { user } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIOSHint, setShowIOSHint] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Switch manifest + theme color when the user logs in/out.
    if (user?.role?.key) applyRoleShell(user.role.key);
    else applyRoleShell(null);
  }, [user?.role?.key]);

  useEffect(() => {
    if (isInStandaloneMode()) return;        // already installed
    if (localStorage.getItem(DISMISS_KEY)) return;

    const onPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    // iOS Safari: no beforeinstallprompt — show hint instead.
    if (isIOS() && !window.MSStream) setShowIOSHint(true);

    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  function install() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(() => {
      setDeferredPrompt(null);
      setShowBanner(false);
      localStorage.setItem(DISMISS_KEY, '1');
    });
  }

  function dismiss() {
    setShowBanner(false);
    setShowIOSHint(false);
    localStorage.setItem(DISMISS_KEY, '1');
  }

  if (!showBanner && !showIOSHint) return null;
  return (
    <div className="fixed bottom-4 inset-x-4 sm:left-auto sm:right-4 sm:max-w-sm z-50">
      <div className="card shadow-lg border-brand-200">
        <div className="card-body p-4 space-y-2">
          {showBanner && (
            <>
              <div className="font-semibold text-sm">Install the app</div>
              <p className="text-xs text-slate-600">
                Add this portal to your home screen for one-tap access, offline reading, and push notifications.
              </p>
              <div className="flex gap-2 pt-1">
                <button onClick={install} className="btn-primary text-xs px-3 py-1.5">Install</button>
                <button onClick={dismiss} className="btn-secondary text-xs px-3 py-1.5">Not now</button>
              </div>
            </>
          )}
          {!showBanner && showIOSHint && (
            <>
              <div className="font-semibold text-sm">Add to Home Screen</div>
              <p className="text-xs text-slate-600">
                Tap <span className="font-mono">⎙ Share</span> then choose
                <strong> &quot;Add to Home Screen&quot;</strong> to install this app.
              </p>
              <div className="flex justify-end pt-1">
                <button onClick={dismiss} className="btn-secondary text-xs px-3 py-1.5">Got it</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
