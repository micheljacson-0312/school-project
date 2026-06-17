// Wraps the existing DashboardShell header with a role-aware sidebar.
// Used by the student / teacher / parent portals.
import { Outlet } from 'react-router-dom';
import DashboardShell from '../DashboardShell.jsx';
import Sidebar from './Sidebar.jsx';
import { useAuth } from '../../lib/auth.jsx';

export default function PortalShell() {
  const { user } = useAuth();
  return (
    <DashboardShell>
      <div className="flex gap-6">
        <Sidebar roleKey={user?.role.key} />
        <div className="flex-1 min-w-0">
          <Outlet />
        </div>
      </div>
    </DashboardShell>
  );
}
