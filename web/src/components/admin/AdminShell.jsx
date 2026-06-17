import { Outlet } from 'react-router-dom';
import DashboardShell from '../DashboardShell.jsx';
import Sidebar from './Sidebar.jsx';

// Admin shell wraps the existing DashboardShell header with an
// admin sidebar + content area. Mounted for every /admin/* route.
export default function AdminShell() {
  return (
    <DashboardShell>
      <div className="flex gap-6">
        <Sidebar />
        <div className="flex-1 min-w-0">
          <Outlet />
        </div>
      </div>
    </DashboardShell>
  );
}
