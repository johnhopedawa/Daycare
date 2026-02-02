const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const timeEntriesRoutes = require('./routes/timeEntries');
const adminRoutes = require('./routes/admin');
const payPeriodsRoutes = require('./routes/payPeriods');
const parentsRoutes = require('./routes/parents');
const documentsRoutes = require('./routes/documents');
const filesRoutes = require('./routes/files');
const schedulesRoutes = require('./routes/schedules');
const childrenRoutes = require('./routes/children');
const invoicesRoutes = require('./routes/invoices');
const reportsRoutes = require('./routes/reports');
const attendanceRoutes = require('./routes/attendance');
const billingRoutes = require('./routes/billing');
const familiesRoutes = require('./routes/families');
const emergencyContactsRoutes = require('./routes/emergencyContacts');
const businessExpensesRoutes = require('./routes/businessExpenses');
const settingsRoutes = require('./routes/settings');
const themesRoutes = require('./routes/themes');
const messagesRoutes = require('./routes/messages');
const eventsRoutes = require('./routes/events');
const notificationsRoutes = require('./routes/notifications');
const timeOffRequestsRoutes = require('./routes/timeOffRequests');

// Parent portal routes
const parentDashboardRoutes = require('./routes/parentDashboard');
const parentInvoicesRoutes = require('./routes/parentInvoices');
const parentDocumentsRoutes = require('./routes/parentDocuments');
const parentMessagesRoutes = require('./routes/parentMessages');
const parentEventsRoutes = require('./routes/parentEvents');

const app = express();
const SYNC_TIMEZONE = process.env.SYNC_TIMEZONE || 'UTC';

// Middleware
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

app.set('trust proxy', 1);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || !isProduction) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  }
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Server time (authoritative)
app.get('/api/time', (req, res) => {
  const now = new Date();
  let localized = null;
  try {
    localized = new Intl.DateTimeFormat('en-US', {
      timeZone: SYNC_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(now);
  } catch (error) {
    localized = null;
  }

  res.json({
    iso: now.toISOString(),
    epochMs: now.getTime(),
    timezone: SYNC_TIMEZONE,
    localTime: localized
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/time-entries', timeEntriesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/pay-periods', payPeriodsRoutes);
app.use('/api/families', familiesRoutes);
app.use('/api/parents', parentsRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/schedules', schedulesRoutes);
app.use('/api', emergencyContactsRoutes);
app.use('/api/children', childrenRoutes);
app.use('/api/invoices', invoicesRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/business-expenses', businessExpensesRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/themes', themesRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/time-off-requests', timeOffRequestsRoutes);

// Parent portal routes (unified auth via /api/auth/login)
app.use('/api/parent', parentDashboardRoutes);
app.use('/api/parent/invoices', parentInvoicesRoutes);
app.use('/api/parent/documents', parentDocumentsRoutes);
app.use('/api/parent/messages', parentMessagesRoutes);
app.use('/api/parent/events', parentEventsRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  // Initialize scheduler in production only
  if (process.env.NODE_ENV === 'production') {
    const { initScheduler } = require('./services/scheduler');
    initScheduler();
  } else {
    console.log('[Scheduler] Skipped in development mode');
  }
});
