// Sidebar for the accountant portal.
import { NavLink } from 'react-router-dom';

const NAV = [
  { section: 'Overview', items: [
    { to: '/accountant', label: 'Dashboard', end: true },
  ]},
  { section: 'Fee setup', items: [
    { to: '/accountant/fee-structures',     label: 'Fee structures' },
    { to: '/accountant/discount-rules',    label: 'Discount rules' },
    { to: '/accountant/student-discounts', label: 'Student discounts' },
  ]},
  { section: 'Billing', items: [
    { to: '/accountant/generate-bills', label: 'Generate bills' },
    { to: '/accountant/collections',    label: 'Collections' },
    { to: '/accountant/defaulters',     label: 'Defaulters' },
    { to: '/accountant/challans',       label: 'Challan preview' },
  ]},
  { section: 'Reports', items: [
    { to: '/accountant/reports',         label: 'Collection summary' },
    { to: '/accountant/expenditures',    label: 'Expenditures' },
  ]},
];

export default function AccountantSidebar() {
  return (
    <aside className="w-60 shrink-0 bg-white border-r border-slate-200 hidden lg:block">
      <nav className="p-4 space-y-5 text-sm sticky top-16">
        {NAV.map(s => (
          <div key={s.section}>
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1 px-2">{s.section}</div>
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
