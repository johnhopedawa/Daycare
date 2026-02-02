import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import { DashboardPage } from './pages/DashboardPage';
import { AttendancePage } from './pages/AttendancePage';
import { FamiliesPage } from './pages/FamiliesPage';
import { BillingPage } from './pages/BillingPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { EducatorsPage } from './pages/EducatorsPage';
import { PayPeriodsPage } from './pages/PayPeriodsPage';
import { TimeEntriesApprovalPage } from './pages/TimeEntriesApprovalPage';
import { StaffSchedulingPage } from './pages/StaffSchedulingPage';
import { ReportingPage } from './pages/ReportingPage';
import { FinanceDashboardPage } from './pages/FinanceDashboardPage';
import { FinanceTransactionsPage } from './pages/FinanceTransactionsPage';
import { FinanceAccountsPage } from './pages/FinanceAccountsPage';
import { FinanceCategoriesPage } from './pages/FinanceCategoriesPage';
import { PaperworkPage } from './pages/PaperworkPage';
import { SettingsPage } from './pages/SettingsPage';
import { useAuth } from './contexts/AuthContext';
import ParentLogin from './pages/ParentLogin';
import ParentDashboard from './pages/ParentDashboard';
import ParentInvoices from './pages/ParentInvoices';
import ParentMessages from './pages/ParentMessages';
import ParentChildren from './pages/ParentChildren';
import ParentResetPassword from './pages/ParentResetPassword';
import EducatorDashboard from './pages/EducatorDashboard';
import MySchedule from './pages/MySchedule';
import MyHours from './pages/MyHours';
import MyPaystubs from './pages/MyPaystubs';
import EventsPage from './pages/EventsPage';
import ParentEvents from './pages/ParentEvents';
import EducatorMessages from './pages/EducatorMessages';
import { EducatorLayout } from './components/EducatorLayout';

function RequireRole({ roles, children }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'PARENT' && user.must_reset_password && location.pathname !== '/parent/reset-password') {
    return <Navigate to="/parent/reset-password" replace />;
  }

  if (!roles || roles.includes(user.role)) {
    return children;
  }

  switch (user.role) {
    case 'PARENT':
      return <Navigate to="/parent/dashboard" replace />;
    case 'EDUCATOR':
      return <Navigate to="/educator/dashboard" replace />;
    case 'ADMIN':
      return <Navigate to="/dashboard" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/parent/login" element={<ParentLogin />} />
          <Route path="/parent/reset-password" element={<ParentResetPassword />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/dashboard"
            element={
              <RequireRole roles={['ADMIN']}>
                <DashboardPage />
              </RequireRole>
            }
          />
          <Route
            path="/attendance"
            element={
              <RequireRole roles={['ADMIN']}>
                <AttendancePage />
              </RequireRole>
            }
          />
          <Route
            path="/events"
            element={
              <RequireRole roles={['ADMIN']}>
                <EventsPage />
              </RequireRole>
            }
          />
          <Route
            path="/families"
            element={
              <RequireRole roles={['ADMIN']}>
                <FamiliesPage />
              </RequireRole>
            }
          />
          <Route
            path="/billing"
            element={
              <RequireRole roles={['ADMIN']}>
                <BillingPage />
              </RequireRole>
            }
          />
          <Route
            path="/payments"
            element={
              <RequireRole roles={['ADMIN']}>
                <PaymentsPage />
              </RequireRole>
            }
          />
          <Route
            path="/scheduling"
            element={
              <RequireRole roles={['ADMIN']}>
                <StaffSchedulingPage />
              </RequireRole>
            }
          />
          <Route
            path="/educators"
            element={
              <RequireRole roles={['ADMIN']}>
                <EducatorsPage />
              </RequireRole>
            }
          />
          <Route
            path="/pay"
            element={
              <RequireRole roles={['ADMIN']}>
                <PayPeriodsPage />
              </RequireRole>
            }
          />
          <Route
            path="/time-entries"
            element={
              <RequireRole roles={['ADMIN']}>
                <TimeEntriesApprovalPage />
              </RequireRole>
            }
          />
          <Route
            path="/finance"
            element={
              <RequireRole roles={['ADMIN']}>
                <FinanceDashboardPage />
              </RequireRole>
            }
          />
          <Route
            path="/finance/transactions"
            element={
              <RequireRole roles={['ADMIN']}>
                <FinanceTransactionsPage />
              </RequireRole>
            }
          />
          <Route
            path="/finance/accounts"
            element={
              <RequireRole roles={['ADMIN']}>
                <FinanceAccountsPage />
              </RequireRole>
            }
          />
          <Route
            path="/finance/categories"
            element={
              <RequireRole roles={['ADMIN']}>
                <FinanceCategoriesPage />
              </RequireRole>
            }
          />
          <Route path="/banking" element={<Navigate to="/finance/accounts" replace />} />
          <Route path="/finance/reports" element={<Navigate to="/reporting" replace />} />
          <Route
            path="/paperwork"
            element={
              <RequireRole roles={['ADMIN']}>
                <PaperworkPage />
              </RequireRole>
            }
          />
          <Route
            path="/reporting"
            element={
              <RequireRole roles={['ADMIN']}>
                <ReportingPage />
              </RequireRole>
            }
          />
          <Route
            path="/settings"
            element={
              <RequireRole roles={['ADMIN']}>
                <SettingsPage />
              </RequireRole>
            }
          />
          <Route
            path="/educator/dashboard"
            element={
              <RequireRole roles={['EDUCATOR', 'ADMIN']}>
                <EducatorDashboard />
              </RequireRole>
            }
          />
          <Route
            path="/educator/my-schedule"
            element={
              <RequireRole roles={['EDUCATOR', 'ADMIN']}>
                <MySchedule />
              </RequireRole>
            }
          />
          <Route
            path="/educator/my-hours"
            element={
              <RequireRole roles={['EDUCATOR', 'ADMIN']}>
                <MyHours />
              </RequireRole>
            }
          />
          <Route
            path="/educator/attendance"
            element={
              <RequireRole roles={['EDUCATOR', 'ADMIN']}>
                <AttendancePage
                  layout={EducatorLayout}
                  title="Attendance"
                  subtitle="Manage today's check-ins"
                />
              </RequireRole>
            }
          />
          <Route
            path="/educator/messages"
            element={
              <RequireRole roles={['EDUCATOR', 'ADMIN']}>
                <EducatorMessages />
              </RequireRole>
            }
          />
          <Route
            path="/educator/my-paystubs"
            element={
              <RequireRole roles={['EDUCATOR', 'ADMIN']}>
                <MyPaystubs />
              </RequireRole>
            }
          />
          <Route
            path="/parent/dashboard"
            element={
              <RequireRole roles={['PARENT']}>
                <ParentDashboard />
              </RequireRole>
            }
          />
          <Route
            path="/parent/invoices"
            element={
              <RequireRole roles={['PARENT']}>
                <ParentInvoices />
              </RequireRole>
            }
          />
          <Route
            path="/parent/messages"
            element={
              <RequireRole roles={['PARENT']}>
                <ParentMessages />
              </RequireRole>
            }
          />
          <Route
            path="/parent/events"
            element={
              <RequireRole roles={['PARENT']}>
                <ParentEvents />
              </RequireRole>
            }
          />
          <Route
            path="/parent/children"
            element={
              <RequireRole roles={['PARENT']}>
                <ParentChildren />
              </RequireRole>
            }
          />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
