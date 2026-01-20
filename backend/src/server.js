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

// Parent portal routes
const parentDashboardRoutes = require('./routes/parentDashboard');
const parentInvoicesRoutes = require('./routes/parentInvoices');
const parentDocumentsRoutes = require('./routes/parentDocuments');
const parentMessagesRoutes = require('./routes/parentMessages');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
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

// Parent portal routes (unified auth via /api/auth/login)
app.use('/api/parent', parentDashboardRoutes);
app.use('/api/parent/invoices', parentInvoicesRoutes);
app.use('/api/parent/documents', parentDocumentsRoutes);
app.use('/api/parent/messages', parentMessagesRoutes);

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
