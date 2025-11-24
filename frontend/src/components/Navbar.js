import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function Navbar() {
  const { user, logout, isAdmin } = useAuth();

  // Don't show navbar if not logged in or if user is a parent (parent portal has its own navigation)
  if (!user || user.role === 'PARENT') return null;

  return (
    <nav>
      <div className="nav-content">
        <h1>Daycare Management</h1>
        <div className="nav-links">
          <Link to="/">Dashboard</Link>

          {isAdmin ? (
            <>
              <Link to="/admin/schedule">Schedule</Link>
              <Link to="/admin/educators">Educators</Link>
              <Link to="/admin/families">Families</Link>
              <Link to="/admin/attendance">Attendance</Link>
              <Link to="/admin/billing">Billing</Link>
              <Link to="/admin/pay-periods">Pay Periods</Link>
              <Link to="/admin/reports">Reports</Link>
              <Link to="/admin/files">Files</Link>
              <Link to="/admin/settings">Settings</Link>
            </>
          ) : (
            <>
              <Link to="/my-schedule">My Schedule</Link>
              <Link to="/my-paystubs">My Paystubs</Link>
            </>
          )}

          <span>
            {user.first_name} {user.last_name}
          </span>
          <button onClick={logout}>Logout</button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
