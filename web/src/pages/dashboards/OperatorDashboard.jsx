import { useAuth } from '../../lib/auth.jsx';

const ACTIONS = [
  'Generate Student ID Cards',
  'Generate Certificates',
  'Generate Fee Structures (PDF)',
  'Manage Templates',
];

export default function OperatorDashboard() {
  const { user } = useAuth();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Welcome, {user?.full_name}</h1>
        <p className="text-slate-500">Computer operator portal — document generation.</p>
      </header>
      <ul className="grid sm:grid-cols-2 gap-3">
        {ACTIONS.map(a => (
          <li key={a} className="card">
            <div className="card-body flex items-center justify-between">
              <span className="font-medium">{a}</span>
              <span className="text-xs text-slate-500">Phase 7</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
