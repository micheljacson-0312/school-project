import { useAuth } from '../../lib/auth.jsx';

export default function CoordinatorDashboard() {
  const { user } = useAuth();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Welcome, {user?.full_name}</h1>
        <p className="text-slate-500">Coordinator portal — academic oversight.</p>
      </header>
      <div className="grid sm:grid-cols-3 gap-3">
        {['Class Performance', 'Attendance Overview', 'Remarks & Awards'].map(s => (
          <div key={s} className="card">
            <div className="card-body">
              <div className="font-medium">{s}</div>
              <p className="text-xs text-slate-500 mt-1">UI lands in Phase 5–7.</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
