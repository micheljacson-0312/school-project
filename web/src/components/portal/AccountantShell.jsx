import { Outlet } from 'react-router-dom';
import DashboardShell from '../DashboardShell.jsx';
import AccountantSidebar from './AccountantSidebar.jsx';

export default function AccountantShell() {
  return (
    <DashboardShell>
      <div className="flex gap-6">
        <AccountantSidebar />
        <div className="flex-1 min-w-0">
          <Outlet />
        </div>
      </div>
    </DashboardShell>
  );
}
