import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import { BankAccountsPage } from './pages/BankAccountsPage';
import { PaperworkPage } from './pages/PaperworkPage';
import { SettingsPage } from './pages/SettingsPage';
import { useAuth } from './contexts/AuthContext';
import ParentLogin from './pages/ParentLogin';
import ParentDashboard from './pages/ParentDashboard';
import ParentInvoices from './pages/ParentInvoices';
import ParentMessages from './pages/ParentMessages';
import ParentChildren from './pages/ParentChildren';
import EducatorDashboard from './pages/EducatorDashboard';
import MySchedule from './pages/MySchedule';
import MyHours from './pages/MyHours';
import LogHours from './pages/LogHours';
import MyPaystubs from './pages/MyPaystubs';

function RequireRole({ roles, children }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
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
          path="/banking"
          element={
            <RequireRole roles={['ADMIN']}>
              <BankAccountsPage />
            </RequireRole>
          }
        />
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
          path="/educator/log-hours"
          element={
            <RequireRole roles={['EDUCATOR', 'ADMIN']}>
              <LogHours />
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
