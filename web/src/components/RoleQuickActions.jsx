// Role-aware quick actions grid for the portal dashboards.
// Each role gets 4-6 shortcuts to its most-used pages, with icons + colors.
import { Link } from 'react-router-dom';

const ACTIONS = {
  student: [
    { to: '/student/attendance',          label: 'Attendance',  icon: '📅', accent: 'bg-sky-100 text-sky-800' },
    { to: '/student/results',             label: 'Results',     icon: '📊', accent: 'bg-emerald-100 text-emerald-800' },
    { to: '/student/assignments',         label: 'Assignments', icon: '📝', accent: 'bg-amber-100 text-amber-800' },
    { to: '/student/quizzes',             label: 'Quizzes',     icon: '✅', accent: 'bg-purple-100 text-purple-800' },
    { to: '/student/live-classes',        label: 'Live classes',icon: '🎥', accent: 'bg-red-100 text-red-800' },
    { to: '/student/fees',                label: 'Fees',        icon: '💳', accent: 'bg-slate-100 text-slate-800' },
  ],
  parent: [
    { to: '/parent/children',             label: 'My children', icon: '👨‍👩‍👧', accent: 'bg-emerald-100 text-emerald-800' },
    { to: '/parent/children/.../attendance', label: 'Attendance', icon: '📅', accent: 'bg-sky-100 text-sky-800' },
    { to: '/parent/children/.../results',     label: 'Results',    icon: '📊', accent: 'bg-emerald-100 text-emerald-800' },
    { to: '/parent/children/.../fees',        label: 'Fees',       icon: '💳', accent: 'bg-amber-100 text-amber-800' },
    { to: '/parent/evaluations',          label: 'Feedback',    icon: '💬', accent: 'bg-purple-100 text-purple-800' },
  ],
  teacher: [
    { to: '/teacher/attendance',          label: 'Mark attendance', icon: '📅', accent: 'bg-amber-100 text-amber-800' },
    { to: '/teacher/lectures',            label: 'Lectures',        icon: '📚', accent: 'bg-sky-100 text-sky-800' },
    { to: '/teacher/assignments',         label: 'Assignments',     icon: '📝', accent: 'bg-emerald-100 text-emerald-800' },
    { to: '/teacher/quizzes',             label: 'Quizzes',         icon: '✅', accent: 'bg-purple-100 text-purple-800' },
    { to: '/teacher/results',             label: 'Upload results',  icon: '📊', accent: 'bg-red-100 text-red-800' },
    { to: '/teacher/remarks',             label: 'Remarks',         icon: '💬', accent: 'bg-slate-100 text-slate-800' },
  ],
  coordinator: [
    { to: '/coordinator/attendance',      label: 'Attendance report', icon: '📊', accent: 'bg-sky-100 text-sky-800' },
    { to: '/coordinator/teachers',        label: 'Teacher attendance', icon: '👨‍🏫', accent: 'bg-amber-100 text-amber-800' },
    { to: '/coordinator/evaluations',     label: 'Evaluations',     icon: '💬', accent: 'bg-emerald-100 text-emerald-800' },
  ],
  accountant: [
    { to: '/admin/fee-structures',        label: 'Fee structures',   icon: '💼', accent: 'bg-emerald-100 text-emerald-800' },
    { to: '/admin/discount-rules',        label: 'Discount rules',   icon: '🏷️', accent: 'bg-amber-100 text-amber-800' },
    { to: '/admin/collections',           label: 'Collections',      icon: '💳', accent: 'bg-sky-100 text-sky-800' },
    { to: '/admin/defaulters',            label: 'Defaulters',       icon: '⚠️', accent: 'bg-red-100 text-red-800' },
  ],
  operator: [
    { to: '/operator/id-cards',           label: 'ID cards',         icon: '🪪', accent: 'bg-sky-100 text-sky-800' },
    { to: '/operator/certificates',       label: 'Certificates',     icon: '🏆', accent: 'bg-amber-100 text-amber-800' },
    { to: '/operator/documents',          label: 'Templates',        icon: '📄', accent: 'bg-emerald-100 text-emerald-800' },
  ],
  alumni: [
    { to: '/alumni/search',               label: 'Find alumni',      icon: '🔍', accent: 'bg-sky-100 text-sky-800' },
    { to: '/alumni/profile',              label: 'Update profile',   icon: '👤', accent: 'bg-emerald-100 text-emerald-800' },
  ],
  admin: [
    { to: '/admin/users',                 label: 'Users',            icon: '👥', accent: 'bg-sky-100 text-sky-800' },
    { to: '/admin/news',                  label: 'News & events',    icon: '📰', accent: 'bg-emerald-100 text-emerald-800' },
    { to: '/admin/announcements',         label: 'Announcements',    icon: '📣', accent: 'bg-amber-100 text-amber-800' },
    { to: '/admin/integrations',          label: 'Integrations',     icon: '🔌', accent: 'bg-purple-100 text-purple-800' },
    { to: '/admin/reports-export',        label: 'Reports',          icon: '📊', accent: 'bg-red-100 text-red-800' },
    { to: '/admin/audit',                 label: 'Audit log',        icon: '🔒', accent: 'bg-slate-100 text-slate-800' },
  ],
};

export default function RoleQuickActions({ roleKey }) {
  const actions = ACTIONS[roleKey] || [];
  if (actions.length === 0) return null;
  return (
    <section>
      <h2 className="text-sm uppercase tracking-wide text-slate-500 font-semibold mb-3">Quick actions</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {actions.map(a => (
          <Link key={a.label} to={a.to}
                className="card hover:shadow-md transition-shadow">
            <div className="card-body flex flex-col items-center text-center gap-2 p-4">
              <span className={'text-2xl rounded-full w-12 h-12 grid place-items-center ' + a.accent}>{a.icon}</span>
              <div className="text-xs font-medium">{a.label}</div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
