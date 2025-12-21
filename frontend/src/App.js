import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import EducatorDashboard from './pages/EducatorDashboard';
import MyPaystubs from './pages/MyPaystubs';
import MySchedule from './pages/MySchedule';
import AdminDashboard from './pages/AdminDashboard';
import AdminEducators from './pages/AdminEducators';
import AdminPayPeriods from './pages/AdminPayPeriods';
import AdminBilling from './pages/AdminBilling';
import AdminSchedule from './pages/AdminSchedule';
import AdminFiles from './pages/AdminFiles';
import AdminFamilies from './pages/AdminFamilies';
import AdminReports from './pages/AdminReports';
import AdminAttendance from './pages/AdminAttendance';
import AdminBusinessExpenses from './pages/AdminBusinessExpenses';
import Settings from './pages/Settings';
import ParentDashboard from './pages/ParentDashboard';
import ParentChildren from './pages/ParentChildren';
import ParentInvoices from './pages/ParentInvoices';
import ParentMessages from './pages/ParentMessages';

function PrivateRoute({ children, adminOnly = false, staffOnly = false, parentOnly = false }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" />;
  }

  // Check role-based access
  if (adminOnly && user.role !== 'ADMIN') {
    return <Navigate to="/" />;
  }

  if (staffOnly && user.role === 'PARENT') {
    return <Navigate to="/parent/dashboard" />;
  }

  if (parentOnly && user.role !== 'PARENT') {
    return <Navigate to="/" />;
  }

  return children;
}

function DashboardRoute() {
  const { user, isAdmin } = useAuth();

  // Route based on role
  if (user.role === 'PARENT') {
    return <Navigate to="/parent/dashboard" />;
  }

  return isAdmin ? <AdminDashboard /> : <EducatorDashboard />;
}

function AppLayout() {
  const { user } = useAuth();

  return (
    <div className={`app-container ${!user ? 'no-sidebar' : ''}`}>
      {user && <Sidebar />}
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/"
          element={
            <PrivateRoute>
              <DashboardRoute />
            </PrivateRoute>
          }
        />

        {/* Educator routes - staff only */}
        <Route
          path="/my-paystubs"
          element={
            <PrivateRoute staffOnly>
              <MyPaystubs />
            </PrivateRoute>
          }
        />
        <Route
          path="/my-schedule"
          element={
            <PrivateRoute staffOnly>
              <MySchedule />
            </PrivateRoute>
          }
        />

        {/* Admin routes */}
        <Route
          path="/admin/educators"
          element={
            <PrivateRoute adminOnly>
              <AdminEducators />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/pay-periods"
          element={
            <PrivateRoute adminOnly>
              <AdminPayPeriods />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/families"
          element={
            <PrivateRoute adminOnly>
              <AdminFamilies />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/billing"
          element={
            <PrivateRoute adminOnly>
              <AdminBilling />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/schedule"
          element={
            <PrivateRoute adminOnly>
              <AdminSchedule />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/files"
          element={
            <PrivateRoute adminOnly>
              <AdminFiles />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <PrivateRoute adminOnly>
              <AdminReports />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/attendance"
          element={
            <PrivateRoute adminOnly>
              <AdminAttendance />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/business-expenses"
          element={
            <PrivateRoute adminOnly>
              <AdminBusinessExpenses />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <PrivateRoute adminOnly>
              <Settings />
            </PrivateRoute>
          }
        />

        {/* Parent portal routes - parents only */}
        <Route path="/parent/login" element={<Navigate to="/login" />} />
        <Route path="/parent" element={<Navigate to="/parent/dashboard" replace />} />
        <Route
          path="/parent/dashboard"
          element={
            <PrivateRoute parentOnly>
              <ParentDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/parent/children"
          element={
            <PrivateRoute parentOnly>
              <ParentChildren />
            </PrivateRoute>
          }
        />
        <Route
          path="/parent/invoices"
          element={
            <PrivateRoute parentOnly>
              <ParentInvoices />
            </PrivateRoute>
          }
        />
        <Route
          path="/parent/messages"
          element={
            <PrivateRoute parentOnly>
              <ParentMessages />
            </PrivateRoute>
          }
        />

        {/* Catch-all: redirect to appropriate dashboard based on auth */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
