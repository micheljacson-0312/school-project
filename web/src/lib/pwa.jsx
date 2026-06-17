// PWA helper: dynamic manifest + theme color + apple-mobile-web-app-title
// switching based on the logged-in user's role. Each role gets its own
// installable app (icon, splash color, name) so parents see a green
// "Parent" app, students a blue "Student" app, etc.
//
// Listens to login/logout and updates <link rel="manifest">, theme
// color, and apple-mobile-web-app-title accordingly.

const ROLE_MANIFEST = {
  student:     '/manifest.student.json',
  parent:      '/manifest.parent.json',
  teacher:     '/manifest.teacher.json',
  admin:       '/manifest.admin.json',
  coordinator: '/manifest.admin.json',  // coordinator shares admin shell
  accountant:  '/manifest.admin.json',
  operator:    '/manifest.admin.json',
  alumni:      '/manifest.json',
};

const ROLE_THEME = {
  student:     '#0ea5e9',
  parent:      '#10b981',
  teacher:     '#f59e0b',
  admin:       '#7c3aed',
  coordinator: '#7c3aed',
  accountant:  '#7c3aed',
  operator:    '#7c3aed',
  alumni:      '#1d64e8',
};

const ROLE_NAME = {
  student:     'Student',
  parent:      'Parent',
  teacher:     'Teacher',
  admin:       'Admin',
  coordinator: 'Admin',
  accountant:  'Admin',
  operator:    'Admin',
  alumni:      'Alumni',
};

function setMeta(name, content, attr = 'name') {
  let el = document.head.querySelector(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setLink(rel, href) {
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function setAppleTouchIcon(href) {
  let el = document.head.querySelector('link[rel="apple-touch-icon"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'apple-touch-icon');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export function applyRoleShell(roleKey) {
  const manifest = ROLE_MANIFEST[roleKey] || '/manifest.json';
  const theme = ROLE_THEME[roleKey] || '#1d64e8';
  const name = ROLE_NAME[roleKey] || 'School';
  setLink('manifest', manifest);
  setMeta('theme-color', theme);
  setMeta('apple-mobile-web-app-capable', 'yes');
  setMeta('apple-mobile-web-app-status-bar-style', 'default');
  setMeta('apple-mobile-web-app-title', name);
  // Use the matching apple-touch-icon for iOS Add-to-Home-Screen.
  const icon = manifest.includes('student') ? '/icons/student-192.png'
             : manifest.includes('parent')  ? '/icons/parent-192.png'
             : manifest.includes('teacher') ? '/icons/teacher-192.png'
             : manifest.includes('admin')   ? '/icons/admin-192.png'
             : '/icons/icon-192.png';
  setAppleTouchIcon(icon);
}

export function getRoleShellInfo(roleKey) {
  return {
    manifest: ROLE_MANIFEST[roleKey] || '/manifest.json',
    theme:    ROLE_THEME[roleKey] || '#1d64e8',
    name:     ROLE_NAME[roleKey] || 'School',
  };
}

// Detect platform hints (used by the install prompt + iOS fallback).
export const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
export const isInStandaloneMode = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true;
