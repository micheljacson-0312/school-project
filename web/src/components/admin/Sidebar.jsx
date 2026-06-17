// Sidebar nav for the admin shell. Section groups keep the long list scannable.
import { NavLink } from 'react-router-dom';

const SECTIONS = [
  {
    title: 'Overview',
    items: [
      { to: '/admin',             label: 'Dashboard',  end: true },
    ],
  },
  {
    title: 'People',
    items: [
      { to: '/admin/users',         label: 'Users' },
      { to: '/admin/roles',         label: 'Roles & permissions' },
      { to: '/admin/academic/teachers', label: 'Teachers' },
      { to: '/admin/academic/students', label: 'Students' },
      { to: '/admin/academic/parents',  label: 'Parents' },
    ],
  },
  {
    title: 'Academic',
    items: [
      { to: '/admin/academic/sessions',          label: 'Sessions' },
      { to: '/admin/academic/terms',             label: 'Terms' },
      { to: '/admin/academic/classes',           label: 'Classes' },
      { to: '/admin/academic/sections',          label: 'Sections' },
      { to: '/admin/academic/subjects',          label: 'Subjects' },
      { to: '/admin/academic/teacher-assignments', label: 'Teacher assignments' },
    ],
  },
  {
    title: 'Website content',
    items: [
      { to: '/admin/news',         label: 'News & events' },
      { to: '/admin/gallery',      label: 'Gallery' },
      { to: '/admin/jobs',         label: 'Job postings' },
      { to: '/admin/slides',       label: 'Homepage carousel' },
      { to: '/admin/achievements', label: 'Achievements' },
      { to: '/admin/principal',    label: 'Principal message' },
      { to: '/admin/settings',     label: 'Site settings' },
    ],
  },
  {
    title: 'Inbox',
    items: [
      { to: '/admin/admissions',         label: 'Admission applications' },
      { to: '/admin/job-applications',   label: 'Job applications' },
      { to: '/admin/contact-messages',   label: 'Contact messages' },
    ],
  },
  {
    title: 'Finance',
    items: [
      { to: '/admin/fee-structures',     label: 'Fee structures' },
      { to: '/admin/discount-rules',    label: 'Discount rules' },
      { to: '/admin/student-discounts', label: 'Student discounts' },
      { to: '/admin/generate-bills',     label: 'Generate bills' },
      { to: '/admin/collections',        label: 'Collections' },
      { to: '/admin/defaulters',         label: 'Defaulters' },
      { to: '/admin/reports',            label: 'Fee reports' },
      { to: '/admin/expenditures',       label: 'Expenditures' },
    ],
  },
  {
    title: 'Communications',
    items: [
      { to: '/admin/notifications', label: 'Notifications' },
      { to: '/admin/announcements',  label: 'Public announcements' },
    ],
  },
  {
    title: 'Reports',
    items: [
      { to: '/admin/reports-export', label: 'CSV exports' },
    ],
  },
  {
    title: 'Integrations',
    items: [
      { to: '/admin/integrations',           label: 'Overview' },
      { to: '/admin/mail',                   label: 'Mail (SMTP)' },
      { to: '/admin/integrations/sms',       label: 'SMS gateway' },
      { to: '/admin/integrations/whatsapp',  label: 'WhatsApp' },
      { to: '/admin/integrations/social',    label: 'Social media' },
      { to: '/admin/push',                   label: 'Push notifications' },
      { to: '/admin/integrations/log',       label: 'Send log' },
      { to: '/admin/fingerprint',            label: 'Fingerprint devices' },
    ],
  },
  {
    title: 'Operator (admin view)',
    items: [
      { to: '/admin/id-cards',     label: 'ID cards' },
      { to: '/admin/certificates', label: 'Certificates' },
      { to: '/admin/documents',    label: 'Document templates' },
    ],
  },
  {
    title: 'System',
    items: [
      { to: '/admin/mail',     label: 'Mail setup' },
      { to: '/admin/audit',    label: 'Audit log' },
    ],
  },
];

export default function Sidebar() {
  return (
    <aside className="w-60 shrink-0 bg-white border-r border-slate-200 hidden lg:block">
      <nav className="p-4 space-y-5 text-sm sticky top-16">
        {SECTIONS.map(s => (
          <div key={s.title}>
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1 px-2">
              {s.title}
            </div>
            <ul className="space-y-1">
              {s.items.map(it => (
                <li key={it.to}>
                  <NavLink to={it.to} end={it.end}
                    className={({ isActive }) =>
                      'block px-2 py-1.5 rounded ' +
                      (isActive ? 'bg-brand-50 text-brand-700 font-medium' : 'text-slate-700 hover:bg-slate-100')
                    }>
                    {it.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
