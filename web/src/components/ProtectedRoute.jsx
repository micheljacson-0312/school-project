import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';

export default function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Loading session…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role.key)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="card max-w-md w-full text-center">
          <div className="card-body">
            <h2 className="text-lg font-semibold">Forbidden</h2>
            <p className="text-sm text-slate-600 mt-1">
              Your role <code>{user.role.key}</code> is not permitted to view this page.
            </p>
          </div>
        </div>
      </div>
    );
  }
  return <Outlet />;
}
