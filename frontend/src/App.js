import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/families" element={<FamiliesPage />} />
        <Route path="/billing" element={<BillingPage />} />
        <Route path="/payments" element={<PaymentsPage />} />
        <Route path="/scheduling" element={<StaffSchedulingPage />} />
        <Route path="/educators" element={<EducatorsPage />} />
        <Route path="/pay" element={<PayPeriodsPage />} />
        <Route path="/time-entries" element={<TimeEntriesApprovalPage />} />
        <Route path="/banking" element={<BankAccountsPage />} />
        <Route path="/paperwork" element={<PaperworkPage />} />
        <Route path="/reporting" element={<ReportingPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
