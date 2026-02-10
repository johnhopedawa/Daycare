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
import { FireflyRedirectPage } from './pages/FireflyRedirectPage';
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
import PortalLanding from './pages/PortalLanding';
import PublicHome from './pages/public/PublicHome';
import PublicVision from './pages/public/PublicVision';
import PublicServices from './pages/public/PublicServices';
import PublicDirector from './pages/public/PublicDirector';
import PublicPolicies from './pages/public/PublicPolicies';
import PublicContact from './pages/public/PublicContact';
import PublicNotFound from './pages/public/PublicNotFound';
import { warmBrowserCache } from './utils/cacheWarmup';

const normalizeBase = (value) => (value || '').replace(/\/$/, '');

const resolvePortalBaseUrl = () => {
  const configured = normalizeBase(process.env.REACT_APP_PORTAL_BASE_URL);
  if (configured) {
    return configured;
  }
  if (typeof window === 'undefined') {
    return '';
  }
  const { protocol, hostname, port } = window.location;
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  if (isLocal) {
    return window.location.origin;
  }
  const baseHost = hostname.replace(/^www\./, '').replace(/^portal\./, '');
  const portSuffix = port ? `:${port}` : '';
  return `${protocol}//portal.${baseHost}${portSuffix}`;
};

const resolvePublicBaseUrl = () => {
  const configured = normalizeBase(process.env.REACT_APP_PUBLIC_BASE_URL);
  if (configured) {
    return configured;
  }
  if (typeof window === 'undefined') {
    return '';
  }
  const { protocol, hostname, port } = window.location;
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  if (isLocal) {
    return window.location.origin;
  }
  const baseHost = hostname.replace(/^www\./, '').replace(/^portal\./, '');
  const portSuffix = port ? `:${port}` : '';
  return `${protocol}//${baseHost}${portSuffix}`;
};

function RequireRole({ roles, children, loginPath = '/login' }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to={loginPath} replace />;
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
      return <Navigate to={loginPath} replace />;
  }
}

function ExternalRedirect({ toBase, mode }) {
  const location = useLocation();

  React.useEffect(() => {
    if (typeof window === 'undefined' || !toBase) {
      return;
    }
    const targetUrl = new URL(`${location.pathname}${location.search}${location.hash}`, `${toBase}/`);
    if (mode && targetUrl.origin === window.location.origin) {
      targetUrl.searchParams.set('mode', mode);
    }
    const target = targetUrl.toString();
    if (window.location.href !== target) {
      window.location.href = target;
    }
  }, [toBase, mode, location.pathname, location.search, location.hash]);

  return (
    <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
      Redirecting...
    </div>
  );
}

function PortalRoutes() {
  const publicBaseUrl = resolvePublicBaseUrl();

  return (
    <Routes>
      <Route path="/" element={<PortalLanding />} />
      <Route path="/staff" element={<Login />} />
      <Route path="/parents" element={<ParentLogin />} />
      <Route path="/login" element={<Login />} />
      <Route path="/parent/login" element={<ParentLogin />} />
      <Route path="/parent/reset-password" element={<ParentResetPassword />} />
      <Route
        path="/dashboard"
        element={
          <RequireRole roles={['ADMIN']} loginPath="/staff">
            <DashboardPage />
          </RequireRole>
        }
      />
      <Route
        path="/attendance"
        element={
          <RequireRole roles={['ADMIN']} loginPath="/staff">
            <AttendancePage />
          </RequireRole>
        }
      />
      <Route
        path="/events"
        element={
          <RequireRole roles={['ADMIN']} loginPath="/staff">
            <EventsPage />
          </RequireRole>
        }
      />
      <Route
        path="/families"
        element={
          <RequireRole roles={['ADMIN']} loginPath="/staff">
            <FamiliesPage />
          </RequireRole>
        }
      />
      <Route
        path="/billing"
        element={
          <RequireRole roles={['ADMIN']} loginPath="/staff">
            <BillingPage />
          </RequireRole>
        }
      />
      <Route
        path="/payments"
        element={
          <RequireRole roles={['ADMIN']} loginPath="/staff">
            <PaymentsPage />
          </RequireRole>
        }
      />
      <Route
        path="/scheduling"
        element={
          <RequireRole roles={['ADMIN']} loginPath="/staff">
            <StaffSchedulingPage />
          </RequireRole>
        }
      />
      <Route
        path="/educators"
        element={
          <RequireRole roles={['ADMIN']} loginPath="/staff">
            <EducatorsPage />
          </RequireRole>
        }
      />
      <Route
        path="/pay"
        element={
          <RequireRole roles={['ADMIN']} loginPath="/staff">
            <PayPeriodsPage />
          </RequireRole>
        }
      />
      <Route
        path="/time-entries"
        element={
          <RequireRole roles={['ADMIN']} loginPath="/staff">
            <TimeEntriesApprovalPage />
          </RequireRole>
        }
      />
      <Route
        path="/finance"
        element={
          <RequireRole roles={['ADMIN']} loginPath="/staff">
            <FinanceDashboardPage />
          </RequireRole>
        }
      />
      <Route
        path="/finance/transactions"
        element={
          <RequireRole roles={['ADMIN']} loginPath="/staff">
            <FinanceTransactionsPage />
          </RequireRole>
        }
      />
      <Route
        path="/finance/accounts"
        element={
          <RequireRole roles={['ADMIN']} loginPath="/staff">
            <FinanceAccountsPage />
          </RequireRole>
        }
      />
      <Route
        path="/finance/categories"
        element={
          <RequireRole roles={['ADMIN']} loginPath="/staff">
            <FinanceCategoriesPage />
          </RequireRole>
        }
      />
      <Route path="/banking" element={<Navigate to="/finance/accounts" replace />} />
      <Route path="/finance/reports" element={<Navigate to="/reporting" replace />} />
      <Route
        path="/paperwork"
        element={
          <RequireRole roles={['ADMIN']} loginPath="/staff">
            <PaperworkPage />
          </RequireRole>
        }
      />
      <Route
        path="/reporting"
        element={
          <RequireRole roles={['ADMIN']} loginPath="/staff">
            <ReportingPage />
          </RequireRole>
        }
      />
      <Route
        path="/settings"
        element={
          <RequireRole roles={['ADMIN']} loginPath="/staff">
            <SettingsPage />
          </RequireRole>
        }
      />
      <Route
        path="/firefly-redirect"
        element={
          <RequireRole roles={['ADMIN']} loginPath="/staff">
            <FireflyRedirectPage />
          </RequireRole>
        }
      />
      <Route
        path="/educator/dashboard"
        element={
          <RequireRole roles={['EDUCATOR', 'ADMIN']} loginPath="/staff">
            <EducatorDashboard />
          </RequireRole>
        }
      />
      <Route
        path="/educator/my-schedule"
        element={
          <RequireRole roles={['EDUCATOR', 'ADMIN']} loginPath="/staff">
            <MySchedule />
          </RequireRole>
        }
      />
      <Route
        path="/educator/my-hours"
        element={
          <RequireRole roles={['EDUCATOR', 'ADMIN']} loginPath="/staff">
            <MyHours />
          </RequireRole>
        }
      />
      <Route
        path="/educator/attendance"
        element={
          <RequireRole roles={['EDUCATOR', 'ADMIN']} loginPath="/staff">
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
          <RequireRole roles={['EDUCATOR', 'ADMIN']} loginPath="/staff">
            <EducatorMessages />
          </RequireRole>
        }
      />
      <Route
        path="/educator/my-paystubs"
        element={
          <RequireRole roles={['EDUCATOR', 'ADMIN']} loginPath="/staff">
            <MyPaystubs />
          </RequireRole>
        }
      />
      <Route
        path="/parent/dashboard"
        element={
          <RequireRole roles={['PARENT']} loginPath="/parents">
            <ParentDashboard />
          </RequireRole>
        }
      />
      <Route
        path="/parent/invoices"
        element={
          <RequireRole roles={['PARENT']} loginPath="/parents">
            <ParentInvoices />
          </RequireRole>
        }
      />
      <Route
        path="/parent/messages"
        element={
          <RequireRole roles={['PARENT']} loginPath="/parents">
            <ParentMessages />
          </RequireRole>
        }
      />
      <Route
        path="/parent/events"
        element={
          <RequireRole roles={['PARENT']} loginPath="/parents">
            <ParentEvents />
          </RequireRole>
        }
      />
      <Route
        path="/parent/children"
        element={
          <RequireRole roles={['PARENT']} loginPath="/parents">
            <ParentChildren />
          </RequireRole>
        }
      />

      <Route path="/index.html" element={<ExternalRedirect toBase={publicBaseUrl} mode="public" />} />
      <Route path="/vision" element={<ExternalRedirect toBase={publicBaseUrl} mode="public" />} />
      <Route path="/services-rates" element={<ExternalRedirect toBase={publicBaseUrl} mode="public" />} />
      <Route path="/about-the-director" element={<ExternalRedirect toBase={publicBaseUrl} mode="public" />} />
      <Route path="/policies" element={<ExternalRedirect toBase={publicBaseUrl} mode="public" />} />
      <Route path="/contact" element={<ExternalRedirect toBase={publicBaseUrl} mode="public" />} />
      <Route path="/contact-hours" element={<Navigate to="/contact" replace />} />

      <Route path="/vision.html" element={<Navigate to="/vision" replace />} />
      <Route path="/services--rates" element={<Navigate to="/services-rates" replace />} />
      <Route path="/services--rates.html" element={<Navigate to="/services-rates" replace />} />
      <Route path="/about-the-director.html" element={<Navigate to="/about-the-director" replace />} />
      <Route path="/policies.html" element={<Navigate to="/policies" replace />} />
      <Route path="/contact--hours" element={<Navigate to="/contact" replace />} />
      <Route path="/contact--hours.html" element={<Navigate to="/contact" replace />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function PublicRoutes() {
  const portalBaseUrl = resolvePortalBaseUrl();

  return (
    <Routes>
      <Route path="/" element={<PublicHome />} />
      <Route path="/index.html" element={<Navigate to="/" replace />} />
      <Route path="/vision" element={<PublicVision />} />
      <Route path="/services-rates" element={<PublicServices />} />
      <Route path="/about-the-director" element={<PublicDirector />} />
      <Route path="/policies" element={<PublicPolicies />} />
      <Route path="/contact" element={<PublicContact />} />
      <Route path="/contact-hours" element={<Navigate to="/contact" replace />} />

      <Route path="/vision.html" element={<Navigate to="/vision" replace />} />
      <Route path="/services--rates" element={<Navigate to="/services-rates" replace />} />
      <Route path="/services--rates.html" element={<Navigate to="/services-rates" replace />} />
      <Route path="/about-the-director.html" element={<Navigate to="/about-the-director" replace />} />
      <Route path="/policies.html" element={<Navigate to="/policies" replace />} />
      <Route path="/contact--hours" element={<Navigate to="/contact" replace />} />
      <Route path="/contact--hours.html" element={<Navigate to="/contact" replace />} />

      <Route path="/staff" element={<ExternalRedirect toBase={portalBaseUrl} mode="portal" />} />
      <Route path="/parents" element={<ExternalRedirect toBase={portalBaseUrl} mode="portal" />} />
      <Route path="/login" element={<ExternalRedirect toBase={portalBaseUrl} mode="portal" />} />
      <Route path="/parent/login" element={<ExternalRedirect toBase={portalBaseUrl} mode="portal" />} />
      <Route path="/dashboard" element={<ExternalRedirect toBase={portalBaseUrl} mode="portal" />} />
      <Route path="/attendance" element={<ExternalRedirect toBase={portalBaseUrl} mode="portal" />} />
      <Route path="/events" element={<ExternalRedirect toBase={portalBaseUrl} mode="portal" />} />
      <Route path="/families" element={<ExternalRedirect toBase={portalBaseUrl} mode="portal" />} />
      <Route path="/billing" element={<ExternalRedirect toBase={portalBaseUrl} mode="portal" />} />
      <Route path="/payments" element={<ExternalRedirect toBase={portalBaseUrl} mode="portal" />} />
      <Route path="/scheduling" element={<ExternalRedirect toBase={portalBaseUrl} mode="portal" />} />
      <Route path="/educators" element={<ExternalRedirect toBase={portalBaseUrl} mode="portal" />} />
      <Route path="/pay" element={<ExternalRedirect toBase={portalBaseUrl} mode="portal" />} />
      <Route path="/time-entries" element={<ExternalRedirect toBase={portalBaseUrl} mode="portal" />} />
      <Route path="/finance" element={<ExternalRedirect toBase={portalBaseUrl} mode="portal" />} />
      <Route path="/finance/transactions" element={<ExternalRedirect toBase={portalBaseUrl} mode="portal" />} />
      <Route path="/finance/accounts" element={<ExternalRedirect toBase={portalBaseUrl} mode="portal" />} />
      <Route path="/finance/categories" element={<ExternalRedirect toBase={portalBaseUrl} mode="portal" />} />
      <Route path="/banking" element={<ExternalRedirect toBase={portalBaseUrl} mode="portal" />} />
      <Route path="/finance/reports" element={<ExternalRedirect toBase={portalBaseUrl} mode="portal" />} />
      <Route path="/paperwork" element={<ExternalRedirect toBase={portalBaseUrl} mode="portal" />} />
      <Route path="/reporting" element={<ExternalRedirect toBase={portalBaseUrl} mode="portal" />} />
      <Route path="/settings" element={<ExternalRedirect toBase={portalBaseUrl} mode="portal" />} />
      <Route path="/firefly-redirect" element={<ExternalRedirect toBase={portalBaseUrl} mode="portal" />} />
      <Route path="/educator/*" element={<ExternalRedirect toBase={portalBaseUrl} mode="portal" />} />
      <Route path="/parent/*" element={<ExternalRedirect toBase={portalBaseUrl} mode="portal" />} />

      <Route path="*" element={<PublicNotFound />} />
    </Routes>
  );
}

export function App() {
  React.useEffect(() => {
    warmBrowserCache();
  }, []);

  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const search = typeof window !== 'undefined' ? window.location.search : '';
  const override = typeof window !== 'undefined' ? new URLSearchParams(search).get('mode') : null;
  const isPortalHost = override === 'portal'
    ? true
    : override === 'public'
      ? false
      : hostname.startsWith('portal.');

  return (
    <BrowserRouter>
      {isPortalHost ? <PortalRoutes /> : <PublicRoutes />}
    </BrowserRouter>
  );
}

export default App;
