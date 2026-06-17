// Role-aware sidebar for the student/teacher/parent/coordinator portals.
import { NavLink } from 'react-router-dom';

const NAV = {
  student: [
    { section: 'Overview', items: [
      { to: '/student', label: 'Dashboard', end: true },
    ]},
    { section: 'Academic', items: [
      { to: '/student/attendance',         label: 'Attendance calendar' },
      { to: '/student/report-card',        label: 'Report card' },
      { to: '/student/results',            label: 'Results (table)' },
      { to: '/student/fees',               label: 'Fee records' },
      { to: '/student/remarks',            label: 'Remarks' },
    ]},
    { section: 'Learning', items: [
      { to: '/student/live-classes', label: 'Live classes' },
      { to: '/student/assignments',  label: 'Assignments' },
      { to: '/student/quizzes',      label: 'Quizzes' },
    ]},
    { section: 'Feedback', items: [
      { to: '/student/evaluations', label: 'Evaluation forms' },
    ]},
  ],
  teacher: [
    { section: 'Overview', items: [
      { to: '/teacher', label: 'Dashboard', end: true },
    ]},
    { section: 'Teaching', items: [
      { to: '/teacher/attendance',   label: 'Mark student attendance' },
      { to: '/teacher/my-attendance', label: 'My attendance (check-in)' },
      { to: '/teacher/lectures',      label: 'Lectures' },
      { to: '/teacher/assignments',   label: 'Assignments' },
      { to: '/teacher/quizzes',       label: 'Quizzes' },
    ]},
    { section: 'Assessment', items: [
      { to: '/teacher/results',     label: 'Upload single result' },
      { to: '/teacher/bulk-results', label: 'Bulk results upload' },
      { to: '/teacher/remarks',      label: 'Remarks' },
    ]},
    { section: 'Feedback', items: [
      { to: '/teacher/evaluations', label: 'Evaluation forms' },
    ]},
  ],
  parent: [
    { section: 'Overview', items: [
      { to: '/parent', label: 'Dashboard', end: true },
    ]},
    { section: 'Children', items: [
      { to: '/parent/children/:studentId/attendance-calendar', label: 'Attendance calendar' },
      { to: '/parent/children/:studentId/report-card',        label: 'Report card' },
      { to: '/parent/children/:studentId/results',            label: 'Results (table)' },
      { to: '/parent/children/:studentId/fees',               label: 'Fees' },
    ]},
    { section: 'Feedback', items: [
      { to: '/parent/evaluations', label: 'Evaluation forms' },
    ]},
  ],
  coordinator: [
    { section: 'Overview', items: [
      { to: '/coordinator', label: 'Dashboard', end: true },
    ]},
    { section: 'Monitoring', items: [
      { to: '/coordinator/attendance',  label: 'Attendance reports' },
      { to: '/coordinator/teachers',    label: 'Teacher attendance' },
      { to: '/coordinator/evaluations', label: 'Evaluations' },
    ]},
  ],
  operator: [
    { section: 'Overview', items: [
      { to: '/operator', label: 'Dashboard', end: true },
    ]},
    { section: 'Documents', items: [
      { to: '/operator/id-cards',     label: 'ID cards' },
      { to: '/operator/certificates', label: 'Certificates' },
      { to: '/operator/documents',    label: 'Templates' },
    ]},
  ],
  alumni: [
    { section: 'Overview', items: [
      { to: '/alumni', label: 'Dashboard', end: true },
    ]},
    { section: 'Community', items: [
      { to: '/alumni/search',  label: 'Alumni directory' },
      { to: '/alumni/profile', label: 'My profile' },
    ]},
  ],
};

export default function Sidebar({ roleKey }) {
  const sections = NAV[roleKey] || [];
  return (
    <aside className="w-56 shrink-0 bg-white border-r border-slate-200 hidden lg:block">
      <nav className="p-4 space-y-5 text-sm sticky top-16">
        {sections.map(s => (
          <div key={s.section}>
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1 px-2">
              {s.section}
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
