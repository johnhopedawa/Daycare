import { Fragment } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function Sidebar() {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();

  // Don't show sidebar if not logged in
  if (!user) return null;

  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  // Admin Navigation
  if (isAdmin) {
    return (
      <aside className="sidebar">
        <div className="brand">MyKidReports</div>

        <Fragment>
          <div className="nav-group">
            <Link to="/" className={`nav-item ${isActive('/')}`}>
              Dashboard
            </Link>
            <Link to="/admin/attendance" className={`nav-item ${isActive('/admin/attendance')}`}>
              Attendance
            </Link>
            <Link to="/admin/families" className={`nav-item ${isActive('/admin/families')}`}>
              Families
            </Link>
            <Link to="/admin/billing" className={`nav-item ${isActive('/admin/billing')}`}>
              Billing
            </Link>
          </div>

          <div className="nav-label">OPERATIONS</div>
          <div className="nav-group">
            <Link to="/admin/schedule" className={`nav-item ${isActive('/admin/schedule')}`}>
              Staff Scheduling
            </Link>
            <Link to="/admin/educators" className={`nav-item ${isActive('/admin/educators')}`}>
              Educators
            </Link>
            <Link to="/admin/pay-periods" className={`nav-item ${isActive('/admin/pay-periods')}`}>
              Pay Periods
            </Link>
          </div>

          <div className="nav-label">ADMIN</div>
          <div className="nav-group">
            <Link to="/admin/business-expenses" className={`nav-item ${isActive('/admin/business-expenses')}`}>
              Bank Accounts
            </Link>
            <Link to="/admin/files" className={`nav-item ${isActive('/admin/files')}`}>
              Paperwork
            </Link>
            <Link to="/admin/reports" className={`nav-item ${isActive('/admin/reports')}`}>
              Reporting
            </Link>
            <Link to="/admin/settings" className={`nav-item ${isActive('/admin/settings')}`}>
              Settings
            </Link>
          </div>
        </Fragment>

        <div className="profile">
          <strong>{user.first_name} {user.last_name}</strong>
          <div className="profile-email">{user.email}</div>
          <button className="logout-button" onClick={logout}>Logout</button>
        </div>
      </aside>
    );
  }

  // Educator Navigation (Staff)
  if (user.role === 'EDUCATOR') {
    return (
      <aside className="sidebar">
        <div className="brand">MyKidReports</div>

        <div className="nav-group">
          <Link to="/" className={`nav-item ${isActive('/')}`}>
            Dashboard
          </Link>
          <Link to="/my-schedule" className={`nav-item ${isActive('/my-schedule')}`}>
            My Schedule
          </Link>
          <Link to="/my-paystubs" className={`nav-item ${isActive('/my-paystubs')}`}>
            My Paystubs
          </Link>
        </div>

        <div className="profile">
          <strong>{user.first_name} {user.last_name}</strong>
          <div className="profile-email">{user.email}</div>
          <button className="logout-button" onClick={logout}>Logout</button>
        </div>
      </aside>
    );
  }

  // Parent Navigation
  if (user.role === 'PARENT') {
    return (
      <aside className="sidebar">
        <div className="brand">MyKidReports</div>

        <div className="nav-group">
          <Link to="/parent/dashboard" className={`nav-item ${isActive('/parent/dashboard')}`}>
            Dashboard
          </Link>
          <Link to="/parent/children" className={`nav-item ${isActive('/parent/children')}`}>
            My Children
          </Link>
          <Link to="/parent/invoices" className={`nav-item ${isActive('/parent/invoices')}`}>
            Invoices
          </Link>
          <Link to="/parent/messages" className={`nav-item ${isActive('/parent/messages')}`}>
            Messages
          </Link>
        </div>

        <div className="profile">
          <strong>{user.first_name} {user.last_name}</strong>
          <div className="profile-email">{user.email}</div>
          <button className="logout-button" onClick={logout}>Logout</button>
        </div>
      </aside>
    );
  }

  return null;
}

export default Sidebar;