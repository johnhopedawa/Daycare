# Daycare Management System - Technical Context

## Architecture
Docker Compose: PostgreSQL + Node.js/Express backend + React frontend (nginx). JWT auth with bcrypt. CORS enabled. Multer for file uploads (20MB max).

## Database Schema (PostgreSQL)

**users** - ADMIN/EDUCATOR/PARENT roles. Fields: email (unique), password_hash, first_name, last_name, role, hourly_rate, is_active, created_by, annual_sick_days, annual_vacation_days, sick_days_remaining, vacation_days_remaining, carryover_enabled, date_employed, ytd_gross, ytd_cpp, ytd_ei, ytd_tax, ytd_hours, sin.

**parents** - Separate from users table but links via user_id (DEPRECATED PATTERN - newer code uses users table for parent auth). Fields: id, first_name, last_name, email, phone, address_line1/2, city, province, postal_code, child_names, notes, is_active, password_hash, role, user_id.

**children** - id, first_name, last_name, date_of_birth, enrollment_start_date, enrollment_end_date, status (ACTIVE/ENROLLED/INACTIVE/WAITLIST), monthly_rate, billing_cycle (WEEKLY/BI_WEEKLY/MONTHLY), allergies (JSONB), medical_notes (TEXT), emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, waitlist_priority, notes, created_by (references users).

**parent_children** - Junction table. Fields: parent_id, child_id, relationship, is_primary_contact, can_pickup, has_billing_responsibility. UNIQUE(parent_id, child_id).

**schedules** - Educator shifts created by admin. Fields: user_id, created_by, shift_date, start_time, end_time, hours, notes, status (PENDING/ACCEPTED/DECLINED), decline_reason, decline_type (SICK_DAY/VACATION_DAY/UNPAID), responded_at, recurrence_id.

**schedule_recurrence** - Recurring shift patterns. Fields: user_id, created_by, day_of_week (0-6), start_time, end_time, hours, start_date, end_date, notes, is_active.

**time_entries** - DEPRECATED - removed from UI. Fields: user_id, entry_date, start_time, end_time, total_hours, notes, status (PENDING/APPROVED/REJECTED), rejection_reason, reviewed_by, reviewed_at.

**pay_periods** - id, name, start_date, end_date, status (OPEN/CLOSED), closed_at, closed_by.

**payouts** - pay_period_id, user_id, total_hours, hourly_rate, gross_amount, deductions, net_amount, status (PENDING/PAID).

**paystubs** - payout_id, user_id, pay_period_id, stub_number (unique).

**parent_invoices** - parent_id, child_id, invoice_number (unique), invoice_date, due_date, line_items (JSONB), subtotal, tax_rate, tax_amount, total_amount, amount_paid, balance_due, status (DRAFT/SENT/PARTIAL/PAID/OVERDUE), notes, payment_terms, created_by.

**parent_payments** - parent_id, invoice_id, amount, payment_date, status (PENDING/PAID), payment_method, notes, receipt_number (unique).

**documents** - File storage. Fields: original_filename, stored_filename (unique), file_path, file_size, mime_type, category_id, tags (TEXT[]), description, linked_child_id, linked_parent_id, can_view_roles (JSONB default ["ADMIN"]), uploaded_by, created_by.

**document_categories** - DEPRECATED - hardcoded categories used instead. Fields: name, created_by.

**messages** - from_user_id XOR from_parent_id, to_user_id XOR to_parent_id, subject, message, is_read, parent_read.

**parent_sessions** - parent_id, token (unique), expires_at.

**parent_password_resets** - parent_id, reset_token (unique), expires_at, used.

**invoices** - DEPRECATED - educator invoices (not used). pay_period_id, user_id, invoice_number, total_hours, total_amount.

**Migrations**: Located in backend/migrations/. Applied via backend/src/db/migrate.js. Schema baseline: backend/src/db/schema.sql.

## Authentication

**Admin/Educator**: JWT via /api/auth/login. Token in localStorage. Middleware: requireAuth, requireAdmin. Users table role field (ADMIN/EDUCATOR).

**Parent**: Dual system exists but USER AUTH PREFERRED. Old: parents table with password_hash, parent_sessions table, /api/parent-auth routes. New: users table with role='PARENT', JWT auth same as admin/educator. Family creation uses users table + JWT.

**Current Password Generation**: Child DOB in MMYYYY format (e.g., 082025 for Aug 2025 birth).

**Middleware**: backend/src/middleware/auth.js - `requireAuth` checks JWT, `requireAdmin` checks role=ADMIN.

**JWT**: backend/src/utils/jwt.js - generateToken(payload, expiresIn), verifyToken(token). Secret: process.env.JWT_SECRET.

## Environment Variables

**Backend (.env)**:
- DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
- JWT_SECRET
- PORT (default 5000)

**Frontend**: REACT_APP_API_URL (points to backend, default http://localhost:5000/api)

**Docker**: Uses docker-compose.yml with postgres service (volumes for persistence), backend, frontend services.

## API Routes (backend/src/server.js registers these)

**/api/auth** - Admin/educator login. POST /login {email, password} → {token, user}.

**/api/admin** - Admin-only CRUD for users. GET /, POST /, PATCH /:id, DELETE /:id.

**/api/families** - NEW FAMILY-CENTRIC ENDPOINT. Replaces parent/children separate management.
- GET / → Aggregates children with parents into family groups. Groups by parent IDs (family_id = "parentId1-parentId2"). Returns full child details (allergies, medical_notes, emergency contacts).
- POST / → Create family (parent1, optional parent2, child). Creates user accounts for parents with role=PARENT. Auto-generates password from child DOB.
- PATCH /:familyId/toggle-status → Activate/deactivate all parent user accounts in family.
- DELETE /:familyId → Delete family's children, optionally delete parent accounts.

**/api/parents** - LEGACY - still exists but NOT used in UI (removed from navbar). CRUD for parents table. GET /, POST /, PATCH /:id, DELETE /:id, GET /:id/children, POST /:id/children.

**/api/children** - CRUD for children. GET /, POST /, PATCH /:id, DELETE /:id. Returns allergies (JSONB), medical_notes, emergency contacts.

**/api/schedules** - Educator schedules. GET / (for user), GET /all (admin), POST / (create shift), POST /recurring, PATCH /:id (respond to shift), DELETE /:id.

**/api/time-entries** - DEPRECATED - no UI access. GET /, POST /, PATCH /:id/approve, PATCH /:id/reject, DELETE /:id.

**/api/pay-periods** - GET /, POST /, POST /:id/close, GET /:id/summary.

**/api/invoices** - Parent invoices. GET / (for parent), GET /all (admin), POST / (create), PATCH /:id, DELETE /:id.

**/api/billing** - POST /record-payment (parent payment), GET /parent/:parentId/balance.

**/api/reports** - GET /educator-hours, GET /child-enrollment, GET /revenue.

**/api/files** - GET /?linked_child_id=X, POST /upload (multipart/form-data with file, category, description, tags, linked_child_id), GET /:id/download, DELETE /:id, GET /categories. Categories: MEDICAL, ENROLLMENT, EMERGENCY, PHOTO_CONSENT, INSURANCE, OTHER. Max 20MB, types: .pdf/.jpg/.jpeg/.png/.doc/.docx.

**/api/attendance** - GET /?date=YYYY-MM-DD&child_id=X, POST / (mark attendance).

**/api/parent-dashboard** - Parent portal endpoints. GET /children, GET /invoices, GET /messages.

**/api/parent-invoices** - GET / (parent's invoices).

**/api/parent-messages** - GET /, POST /, PATCH /:id/read.

**/api/parent-documents** - GET / (parent's child documents).

**/api/documents** - DEPRECATED - replaced by /api/files.

## Frontend Structure

**src/App.js** - React Router v6. Routes:
- / → Login
- /educator-dashboard → EducatorDashboard
- /admin-dashboard → AdminDashboard
- /my-schedule → MySchedule (educator)
- /my-paystubs → MyPaystubs (educator)
- /admin/schedule → AdminSchedule
- /admin/educators → AdminEducators
- /admin/families → AdminFamilies (NEW - replaces /admin/parents and /admin/children)
- /admin/attendance → AdminAttendance
- /admin/invoices → AdminInvoices
- /admin/payments → AdminPayments
- /admin/pay-periods → AdminPayPeriods
- /admin/reports → AdminReports
- /admin/files → AdminFiles
- /parent-login → ParentLogin
- /parent-dashboard → ParentDashboard
- /parent/children → ParentChildren
- /parent/invoices → ParentInvoices
- /parent/messages → ParentMessages

**REMOVED ROUTES** (no UI access):
- /log-hours, /my-hours, /admin/time-entries (time entry system removed - schedule is source of truth)
- /admin/parents, /admin/children (replaced by /admin/families)

**src/components/Navbar.js** - Role-based navigation.
- Admin: Schedule, Educators, Families, Attendance, Invoices, Payments, Pay Periods, Reports, Files
- Educator: My Schedule, My Paystubs
- Parent: Children, Invoices, Messages

**src/utils/api.js** - Axios instance with JWT interceptor. Reads token from localStorage. Base URL: REACT_APP_API_URL or http://localhost:5000/api.

**src/contexts/AuthContext.js** - AuthProvider wraps app. Provides: user, login(email, password), logout(), loading. Stores token in localStorage.

**PrivateRoute** component in App.js - Checks user from AuthContext. adminOnly prop checks user.role === 'ADMIN'.

## Key Frontend Pages

**AdminFamilies.js** - NEW FAMILY MANAGEMENT. State: families, showForm, generatedPasswords, expandedChildren, showFilesModal, selectedChild, childDocuments. Functions: loadFamilies(), handleSubmit() (create family), handleToggleStatus() (activate/deactivate accounts), handleDeleteFamily(), toggleChildDetails(), handleViewFiles(), loadChildDocuments(), handleFileUpload(), handleDownloadFile(), handleDeleteFile(), formatAllergies(), calculateAge() (shows weeks if <12mo, months if 12-24mo, years+months if >24mo). Displays family cards with parents + children. File modal for child document management.

**AdminChildren.js** - LEGACY - still exists but NOT in navbar. CRUD children with allergies (JSONB), medical notes, emergency contacts. File management per child.

**AdminParents.js** - LEGACY - still exists but NOT in navbar. CRUD parents.

**AdminSchedule.js** - Create/manage educator schedules. Recurring patterns. Date picker. Shift creation form.

**MySchedule.js** - Educator view of assigned shifts. Can decline with reason (sick/vacation/unpaid).

**AdminEducators.js** - CRUD educators (users table). Hourly rate, leave balances. Create account generates random password.

**AdminPayPeriods.js** - Create pay periods, close to generate payouts. Summary shows total hours/amount per educator.

**MyPaystubs.js** - Educator downloads paystubs (PDF).

**AdminInvoices.js** - Create parent invoices with line items (JSONB). Status tracking. Link to payments.

**AdminPayments.js** - Record payments against invoices. Receipt numbers. Payment methods.

**AdminFiles.js** - Document management. Upload/download/delete. Categories, tags, descriptions. Link to children/parents.

**AdminAttendance.js** - Track child attendance. Daily check-in/out. Status: PRESENT/ABSENT/LATE/SICK.

**AdminReports.js** - Educator hours report, child enrollment report, revenue report. Date range filters. Export options.

**ParentDashboard.js** - Parent portal home. Shows children, invoices, messages.

**ParentChildren.js** - View own children info. Documents access.

**ParentInvoices.js** - View invoices, balances. Payment history.

**LogHours.js, MyHours.js, AdminTimeEntries.js** - UNUSED FILES - time entry system removed from workflow. Files exist but not routed.

## Backend Key Files

**server.js** - Express app. CORS, JSON parser, file uploads (multer). Registers all route modules. Static uploads folder.

**db/pool.js** - PostgreSQL connection pool (pg). Uses env vars for connection.

**db/migrate.js** - Runs SQL migrations from backend/migrations/ in order. Tracks applied migrations in migrations_history table.

**db/schema.sql** - Base schema definition. Run on fresh DB setup.

**middleware/auth.js** - requireAuth (JWT verification), requireAdmin (role check).

**utils/jwt.js** - generateToken, verifyToken using jsonwebtoken lib.

**utils/notifications.js** - Placeholder for future email/SMS notifications.

**services/pdfGenerator.js** - Generates paystub PDFs using pdfkit.

**services/excelGenerator.js** - Generates Excel reports using exceljs.

**routes/families.js** - NEW ROUTE. Family aggregation logic: SQL joins children + parent_children + parents, groups by concatenated parent IDs. Creates users with role=PARENT. Password = child DOB MMYYYY format. Toggle status updates users.is_active for all parents in family.

**routes/auth.js** - Admin/educator login. Bcrypt password check. JWT generation.

**routes/admin.js** - User CRUD. Create user with bcrypt hash. Update hourly_rate, is_active.

**routes/parents.js** - LEGACY parent CRUD. Links to children via parent_children junction.

**routes/children.js** - Child CRUD. Allergies stored as JSONB: {common: ["Milk", "Nuts"], other: "String"}. Returns full medical/emergency data.

**routes/schedules.js** - Schedule CRUD. Recurring pattern creation. Decline logic updates schedule status and deducts from leave balances if sick/vacation day.

**routes/payPeriods.js** - Pay period management. Close pay period generates payouts + paystubs for each educator based on schedules in period.

**routes/invoices.js** - Parent invoice CRUD. line_items JSONB array. Update balance_due when payments recorded.

**routes/billing.js** - Record payment, update invoice amount_paid/balance_due/status.

**routes/files.js** - Multer upload to /uploads. Store metadata in documents table. linked_child_id for child association. Categories hardcoded (not using document_categories table).

**routes/attendance.js** - Daily child attendance tracking. Status values. Links to children table.

**routes/reports.js** - Generate aggregated data reports. Date range queries.

**routes/parentDashboard.js** - Parent portal APIs. Filter by parent_id from JWT.

**routes/timeEntries.js** - DEPRECATED - no UI. Time entry approval/rejection logic still exists.

## Docker Setup

**docker-compose.yml** - 3 services: postgres (port 5432, volumes), backend (port 5000, depends on postgres), frontend (port 3000, nginx).

**backend/Dockerfile** - Node 18 alpine. npm install --production. Runs src/server.js.

**frontend/Dockerfile** - Multi-stage: npm build → nginx:alpine. Copies build to /usr/share/nginx/html.

**nginx.conf** - Frontend nginx config. Proxy /api to backend, React Router fallback to index.html.

## Critical Implementation Notes

**Family ID Format**: "parentId1-parentId2" (sorted). Orphans: "orphan-childId". Used as React keys and API parameters.

**Age Calculation**: <12mo = weeks, 12-24mo = months, >24mo = years+months. Function in AdminFamilies.js calculateAge().

**Allergy Format**: JSONB {common: ["Milk"], other: "text"}. formatAllergies() parses and displays.

**Password Generation**: Child DOB → MMYYYY string → bcrypt hash. Returned to admin once on creation.

**Schedule vs Time Entries**: Schedule = source of truth for educator hours. Time entries DEPRECATED. Pay periods calculate from schedules table.

**Parent Auth Duality**: Old system uses parents table + parent_sessions. New system uses users table role=PARENT + JWT. /api/families uses new system. /api/parents uses old system. UI only exposes new system (/admin/families).

**File Upload Flow**: Frontend FormData → /api/files/upload → multer saves to /uploads → documents table stores metadata with linked_child_id → /api/files/:id/download serves file.

**Status Enums**:
- Child: ACTIVE, ENROLLED, INACTIVE, WAITLIST
- Invoice: DRAFT, SENT, PARTIAL, PAID, OVERDUE
- Payment: PENDING, PAID
- Schedule: PENDING, ACCEPTED, DECLINED
- Time Entry: PENDING, APPROVED, REJECTED (unused)
- Pay Period: OPEN, CLOSED
- Payout: PENDING, PAID

**No Migrations Needed**: All schema exists in schema.sql + migrations/. No new tables required for recent family changes.

## Removed/Unused Code

**Files exist but NOT routed**: LogHours.js, MyHours.js, AdminTimeEntries.js, routes/timeEntries.js (time entry system).

**Tables exist but DEPRECATED**: document_categories (hardcoded categories used), invoices (educator invoices not used), time_entries (no UI), parents.password_hash/role (users table preferred), parent_sessions (JWT preferred).

**Routes exist but NOT in navbar**: /api/parents, /api/children (individual management). Use /api/families instead.

## Database Cleanup Script

**backend/cleanup-database.js** - Deletes all children, parents, user accounts except admin@test.com and educator@test.com. Cleans orphaned records. Run manually via node.

## Current Test Accounts

**Admin**: admin@test.com
**Educator**: educator@test.com
All other accounts were cleaned. New families created via /admin/families with auto-generated passwords (DOB format).

## File Purposes (Key Files Only)

**Root**:
- docker-compose.yml: Orchestrates postgres/backend/frontend containers
- .env: Environment variables (DB creds, JWT secret)
- README.md, PROJECT_SUMMARY.md, etc.: Documentation (not code)

**backend/src**:
- server.js: Express app entry point, route registration
- db/pool.js: PostgreSQL connection pool
- db/migrate.js: Migration runner
- db/schema.sql: Database schema baseline
- middleware/auth.js: JWT auth middleware (requireAuth, requireAdmin)
- utils/jwt.js: Token generation/verification
- routes/families.js: Family aggregation and management API
- routes/auth.js: Login endpoint for admin/educator
- routes/admin.js: User CRUD for educators
- routes/children.js: Child CRUD with medical data
- routes/schedules.js: Schedule management and recurring patterns
- routes/payPeriods.js: Pay period close generates payouts
- routes/files.js: File upload/download with multer
- routes/invoices.js: Parent invoice management
- routes/billing.js: Payment recording
- routes/attendance.js: Child attendance tracking
- routes/reports.js: Aggregated data reports
- services/pdfGenerator.js: Paystub PDF generation
- services/excelGenerator.js: Excel export

**frontend/src**:
- App.js: React Router, route definitions, PrivateRoute wrapper
- index.js: ReactDOM render with AuthProvider
- utils/api.js: Axios instance with JWT interceptor
- contexts/AuthContext.js: Auth state management (user, login, logout)
- components/Navbar.js: Role-based navigation menu
- pages/AdminFamilies.js: Family management UI (create, view, toggle status, delete, child details, file uploads)
- pages/AdminSchedule.js: Schedule creation with recurring patterns
- pages/AdminEducators.js: Educator CRUD with leave balances
- pages/AdminPayPeriods.js: Pay period management
- pages/MySchedule.js: Educator shift view with decline option
- pages/MyPaystubs.js: Paystub download
- pages/AdminInvoices.js: Parent invoice creation
- pages/AdminPayments.js: Payment recording
- pages/AdminFiles.js: Document management
- pages/AdminAttendance.js: Child attendance tracking
- pages/AdminReports.js: Report generation and export
- pages/ParentDashboard.js: Parent portal home
- pages/LogHours.js, MyHours.js, AdminTimeEntries.js: UNUSED (time entry pages removed from workflow)
- pages/AdminParents.js, AdminChildren.js: UNUSED (replaced by AdminFamilies)

**k8s/**:
- apply-all.sh: Applies all kubernetes configs
- delete-all.sh: Deletes all kubernetes resources
- deploy.sh: Full deployment script
- deployments/*.yaml: K8s deployment configs
- services/*.yaml: K8s service configs
- secrets/*.yaml: Secret configs
- pvc/*.yaml: Persistent volume claims
- jobs/*.yaml: Migration job config
- ingress/*.yaml: Ingress routing

**backend/migrations/**:
- SQL migration files applied in order by migrate.js
