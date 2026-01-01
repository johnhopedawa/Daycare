# Daycare Management System - Complete Handbook

> **One-stop reference for setup, usage, development, and troubleshooting**

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [User Workflows](#user-workflows)
4. [API Reference](#api-reference)
5. [Database Schema](#database-schema)
6. [Development Guide](#development-guide)
7. [Deployment](#deployment)
8. [Troubleshooting](#troubleshooting)
9. [Security & Maintenance](#security--maintenance)

---

## Quick Start

### Prerequisites
- Docker Desktop installed and running
- Node.js 18+ (for local development without Docker)
- OR k3s cluster (for production deployment)

### Local Development Setup (5 minutes)

```bash
# 1. Copy environment file
cp .env.example .env

# 2. Start all services with Docker Compose
docker-compose up --build

# Frontend will be at: http://localhost:3000
# Backend API at: http://localhost:5000
```

### Create Your First Admin Account

```bash
# Using the helper script (easiest)
chmod +x scripts/create-admin.sh
./scripts/create-admin.sh admin@example.com yourpassword Admin User

# OR manually via database
docker-compose exec postgres psql -U daycare -d daycare
# Then run: UPDATE users SET role = 'ADMIN' WHERE email = 'your-email@example.com';
```

### Daily Operations

**Educators:**
1. Login → My Schedule → View assigned shifts
2. Accept or decline shifts with reasons (sick/vacation/unpaid)
3. My Paystubs → Download paystubs when pay period closes

**Admins:**
1. Schedule → Create educator shifts (one-time or recurring)
2. Families → Manage families (parents + children), upload documents
3. Attendance → Track daily child attendance
4. Pay Periods → Create periods, close to generate payouts
5. Invoices → Bill families, track payments

---

## Architecture Overview

### Tech Stack
- **Backend**: Node.js + Express + PostgreSQL
- **Frontend**: React + React Router (not Next.js - simpler for internal app)
- **Authentication**: JWT with bcrypt password hashing
- **PDF Generation**: PDFKit (paystubs, receipts)
- **Excel Export**: ExcelJS (payroll summaries)
- **Containerization**: Docker + docker-compose
- **Production**: Kubernetes (k3s) + Traefik ingress
- **Memory Usage**: ~1.5-2GB total (fits in 4GB allocation)

### Project Structure

```
.
├── backend/
│   ├── src/
│   │   ├── db/              # Database pool, schema, migrations
│   │   ├── middleware/      # JWT auth middleware
│   │   ├── routes/          # API endpoints (18 route files)
│   │   ├── services/        # PDF & Excel generation
│   │   ├── utils/           # JWT utilities
│   │   └── server.js        # Express app entry point
│   ├── migrations/          # Database migrations (001-010)
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # Navbar
│   │   ├── contexts/        # AuthContext
│   │   ├── pages/           # 20+ page components
│   │   ├── utils/           # API client (Axios)
│   │   ├── App.js           # Router + protected routes
│   │   └── index.css        # Global styling
│   ├── nginx.conf           # Production nginx config
│   ├── Dockerfile
│   └── package.json
├── k8s/                     # Kubernetes manifests
├── scripts/                 # Helper scripts (create-admin.sh)
├── docker-compose.yml       # Local development orchestration
├── deploy.sh               # Deployment automation
└── HANDBOOK.md             # This file
```

### Key Design Decisions

**Why no ORM?** Direct SQL with `pg` library is simpler, more transparent, and prevents abstraction overhead.

**Why JWT?** Stateless authentication scales well in Kubernetes environments.

**Why family-centric management?** Families are the natural unit - parents and children are managed together via [/admin/families](frontend/src/pages/AdminFamilies.js).

**Why schedule-based payroll?** Admin-created schedules are the source of truth. Time entries are deprecated (files exist but not routed).

---

## User Workflows

### Educator Daily Flow
1. **Login** at http://localhost:3000
2. **My Schedule** → View assigned shifts
3. **Respond to shifts** → Accept or decline with reason:
   - Decline types: SICK_DAY, VACATION_DAY, UNPAID
   - Sick/vacation days auto-deduct from balances
4. **My Paystubs** → Download PDF paystubs after pay period closes

### Admin - Schedule Management
1. **Schedule** page → Create shifts for educators
2. **One-time shifts**: Select date, educator, start/end time
3. **Recurring shifts**: Set day of week, times, start/end dates
4. **View responses**: See which shifts are accepted/declined

### Admin - Family Management
1. **Families** page → View all families (parents + children grouped)
2. **Add Family**: Parent 1 + optional Parent 2 + Child
   - Auto-generates parent login credentials (password = child DOB in MMYYYY format)
   - Creates user accounts with role='PARENT'
3. **View child details**: Click to expand allergies, medical notes, emergency contacts
4. **Upload documents**: Medical forms, enrollment, insurance, photos
5. **Toggle family status**: Activate/deactivate parent accounts

### Admin - Pay Period Workflow
1. **Pay Periods** → Create new period (name, start date, end date)
2. Educators work shifts during the period
3. **Close Period** when ready:
   - Locks the period (status: OPEN → CLOSED)
   - Calculates total hours per educator from schedules table
   - Generates payouts (gross pay, deductions, net pay)
   - Creates paystubs (educators can download PDFs)
4. **Download Excel** → Export payroll summary for accounting

### Admin - Parent Billing
1. **Invoices** → Create invoice for a family
   - Add line items (tuition, fees, etc.)
   - Set due date, tax rate
2. **Payments** → Record when parent pays
   - Links to invoice, updates balance
   - Generate receipt PDF
3. Parents can view their invoices in the parent portal

### Parent Portal Flow
1. **Login** at /parent-login with credentials provided by admin
2. **Dashboard** → View children, upcoming invoices, messages
3. **Children** → See child info, uploaded documents
4. **Invoices** → View bills, payment history
5. **Messages** → Communicate with admin

---

## API Reference

### Base URL
- Local: `http://localhost:5000/api`
- Production: `https://yourdomain.com/api`

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/register` | Register new user | No |
| POST | `/auth/login` | Login (returns JWT token) | No |
| GET | `/auth/me` | Get current user info | Yes |

**Login Request:**
```json
POST /api/auth/login
{
  "email": "admin@example.com",
  "password": "yourpassword"
}
```

**Login Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "admin@example.com",
    "role": "ADMIN",
    "first_name": "Admin",
    "last_name": "User"
  }
}
```

### Admin - User Management

| Method | Endpoint | Description | Role Required |
|--------|----------|-------------|---------------|
| GET | `/admin/users` | Get all users | ADMIN |
| POST | `/admin/users` | Create educator | ADMIN |
| PATCH | `/admin/users/:id` | Update user | ADMIN |

### Families (NEW - Primary Management Endpoint)

| Method | Endpoint | Description | Role Required |
|--------|----------|-------------|---------------|
| GET | `/families` | Get all families (parents + children) | ADMIN |
| POST | `/families` | Create family (parents + child) | ADMIN |
| PATCH | `/families/:familyId/toggle-status` | Activate/deactivate family | ADMIN |
| DELETE | `/families/:familyId` | Delete family | ADMIN |

**Create Family Request:**
```json
POST /api/families
{
  "parent1": {
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "phone": "555-0100"
  },
  "parent2": {
    "first_name": "Jane",
    "last_name": "Doe",
    "email": "jane@example.com",
    "phone": "555-0101"
  },
  "child": {
    "first_name": "Emma",
    "last_name": "Doe",
    "date_of_birth": "2022-08-15",
    "enrollment_start_date": "2024-01-01",
    "monthly_rate": 1500,
    "allergies": {
      "common": ["Milk", "Eggs"],
      "other": "Seasonal pollen"
    },
    "medical_notes": "Asthma - has inhaler",
    "emergency_contact_name": "Grandma Sue",
    "emergency_contact_phone": "555-0200",
    "emergency_contact_relationship": "Grandmother"
  }
}
```

### Schedules

| Method | Endpoint | Description | Role Required |
|--------|----------|-------------|---------------|
| GET | `/schedules` | Get my schedules | EDUCATOR |
| GET | `/schedules/all` | Get all schedules | ADMIN |
| POST | `/schedules` | Create shift | ADMIN |
| POST | `/schedules/recurring` | Create recurring pattern | ADMIN |
| PATCH | `/schedules/:id` | Respond to shift (accept/decline) | EDUCATOR |
| DELETE | `/schedules/:id` | Delete shift | ADMIN |

### Pay Periods

| Method | Endpoint | Description | Role Required |
|--------|----------|-------------|---------------|
| GET | `/pay-periods` | Get all pay periods | ADMIN |
| POST | `/pay-periods` | Create pay period | ADMIN |
| POST | `/pay-periods/:id/close` | Close period (generates payouts) | ADMIN |
| GET | `/pay-periods/:id/summary` | Get payout summary | ADMIN |

### Invoices (Parent Billing)

| Method | Endpoint | Description | Role Required |
|--------|----------|-------------|---------------|
| GET | `/invoices` | Get all invoices | ADMIN |
| POST | `/invoices` | Create invoice | ADMIN |
| PATCH | `/invoices/:id` | Update invoice | ADMIN |
| DELETE | `/invoices/:id` | Delete invoice | ADMIN |

### Files/Documents

| Method | Endpoint | Description | Role Required |
|--------|----------|-------------|---------------|
| GET | `/files?linked_child_id=X` | Get child's files | ADMIN |
| POST | `/files/upload` | Upload file (multipart) | ADMIN |
| GET | `/files/:id/download` | Download file | ADMIN/PARENT |
| DELETE | `/files/:id` | Delete file | ADMIN |

**File Upload (multipart/form-data):**
```
POST /api/files/upload
Content-Type: multipart/form-data

file: [binary file data]
category: MEDICAL | ENROLLMENT | EMERGENCY | PHOTO_CONSENT | INSURANCE | OTHER
description: "Immunization record"
tags: ["medical", "required"]
linked_child_id: 5
```

### Attendance

| Method | Endpoint | Description | Role Required |
|--------|----------|-------------|---------------|
| GET | `/attendance?date=YYYY-MM-DD&child_id=X` | Get attendance records | ADMIN |
| POST | `/attendance` | Mark attendance | ADMIN |

---

## Database Schema

### Tables Overview

**users** - Admin, educators, and parents
- Fields: email (unique), password_hash, first_name, last_name, role (ADMIN/EDUCATOR/PARENT), hourly_rate, is_active, sick_days_remaining, vacation_days_remaining, date_employed

**children** - Child records
- Fields: first_name, last_name, date_of_birth, enrollment_start_date, status (ACTIVE/INACTIVE/WAITLIST), monthly_rate, allergies (JSONB), medical_notes, emergency_contact_name/phone/relationship

**parent_children** - Junction table linking parents to children
- Fields: parent_id (references users), child_id (references children), relationship, is_primary_contact, can_pickup, has_billing_responsibility

**schedules** - Educator work shifts (SOURCE OF TRUTH for payroll)
- Fields: user_id, shift_date, start_time, end_time, hours, status (PENDING/ACCEPTED/DECLINED), decline_reason, decline_type (SICK_DAY/VACATION_DAY/UNPAID)

**schedule_recurrence** - Recurring shift patterns
- Fields: user_id, day_of_week (0-6), start_time, end_time, start_date, end_date, is_active

**pay_periods** - Pay period definitions
- Fields: name, start_date, end_date, status (OPEN/CLOSED), closed_at, closed_by

**payouts** - Generated when pay period closes
- Fields: pay_period_id, user_id, total_hours, hourly_rate, gross_amount, deductions, net_amount

**paystubs** - Paystub records for PDF generation
- Fields: payout_id, user_id, pay_period_id, stub_number (unique)

**parent_invoices** - Family invoices
- Fields: parent_id, child_id, invoice_number, due_date, line_items (JSONB), total_amount, balance_due, status (DRAFT/SENT/PARTIAL/PAID/OVERDUE)

**parent_payments** - Payment records
- Fields: parent_id, invoice_id, amount, payment_date, status (PENDING/PAID), payment_method, receipt_number

**documents** - File storage metadata
- Fields: original_filename, stored_filename, file_path, file_size, category_id, linked_child_id, uploaded_by

**messages** - Parent-admin messaging
- Fields: from_user_id, to_user_id, subject, message, is_read

**attendance** - Daily child attendance
- Fields: child_id, attendance_date, check_in_time, check_out_time, status (PRESENT/ABSENT/LATE/SICK), notes

**emergency_contacts** - Additional emergency contacts (migration 010)
- Fields: child_id, contact_name, contact_phone, relationship

### Migration System

Migrations are located in [backend/migrations/](backend/migrations/) and applied in order:
1. `001_add_leave_tracking.sql` - Sick/vacation tracking
2. `002_set_default_leave_balances.sql` - Default balances
3. `003_create_children_and_invoices.sql` - Parent portal phase
4. `004_fix_varchar_lengths.sql` - Data type fixes
5. `005_add_waitlist_priority.sql` - Waitlist feature
6. `006_add_parent_portal.sql` - Parent features
7. `007_add_attendance.sql` - Attendance system
8. `008_add_enhanced_features.sql` - Additional features
9. `009_add_payment_tracking_fields.sql` - Payment tracking
10. `010_add_emergency_contacts_table.sql` - Emergency contacts

**Run migrations:**
```bash
cd backend
npm run migrate
```

---

## Development Guide

### Local Development (Without Docker)

**Backend:**
```bash
cd backend
npm install
npm run dev  # Runs with nodemon (auto-restart)
```

**Frontend:**
```bash
cd frontend
npm install
npm start  # Runs on port 3000
```

**Database:**
- Install PostgreSQL locally
- Create database: `createdb daycare`
- Update `.env` with local connection string
- Run migrations: `npm run migrate`

### Environment Variables

**Backend `.env`:**
```bash
# Database
DATABASE_URL=postgresql://daycare:daycare@localhost:5432/daycare

# JWT Secret (CHANGE IN PRODUCTION!)
JWT_SECRET=your-secret-key-change-this-in-production

# Server
PORT=5000
NODE_ENV=development
```

**Frontend** (optional):
```bash
# If backend is on different host/port
REACT_APP_API_URL=http://localhost:5000/api
```

### Code Organization

**Adding a new API endpoint:**
1. Create route file in [backend/src/routes/](backend/src/routes/)
2. Define routes with Express Router
3. Add middleware (requireAuth, requireAdmin) where needed
4. Register route in [server.js](backend/src/server.js): `app.use('/api/yourroute', yourRouteFile)`

**Adding a new page:**
1. Create component in [frontend/src/pages/](frontend/src/pages/)
2. Add route in [App.js](frontend/src/App.js)
3. Add navigation link in [Navbar.js](frontend/src/components/Navbar.js)
4. Use `api.get/post/patch/delete` from [utils/api.js](frontend/src/utils/api.js) for backend calls

**Making authenticated requests:**
```javascript
import api from '../utils/api';

// GET request
const response = await api.get('/families');

// POST request
const response = await api.post('/families', {
  parent1: {...},
  child: {...}
});

// The JWT token is automatically included from localStorage
```

### Database Queries

**Connection pool** ([backend/src/db/pool.js](backend/src/db/pool.js)):
```javascript
const pool = require('./db/pool');

// Query with parameters (prevents SQL injection)
const result = await pool.query(
  'SELECT * FROM users WHERE email = $1',
  [email]
);

const users = result.rows;
```

---

## Deployment

### Option 1: Docker Compose (Local/Testing)

```bash
# Start services
docker-compose up --build

# Start in background (detached)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Reset everything (deletes volumes!)
docker-compose down -v
```

**Access:**
- Frontend: http://localhost:3000
- Backend: http://localhost:5000
- Database: localhost:5432

### Option 2: Kubernetes (Production)

See [k8s/README.md](k8s/README.md) for full details.

**Quick deploy:**
```bash
chmod +x deploy.sh
./deploy.sh  # Builds images, pushes to registry, applies k8s manifests
```

**Check deployment:**
```bash
kubectl get pods -n daycare
kubectl get services -n daycare
kubectl get ingress -n daycare
```

**View logs:**
```bash
kubectl logs -f deployment/backend -n daycare
kubectl logs -f deployment/frontend -n daycare
kubectl logs -f statefulset/postgres -n daycare
```

**Resource usage:**
- Backend: 256-512Mi × 2 replicas = 512Mi-1Gi
- Frontend: 128-256Mi × 2 replicas = 256Mi-512Mi
- PostgreSQL: ~200-300Mi
- **Total**: ~1.5-2GB

---

## Troubleshooting

### Common Issues

**❌ Can't login / "Invalid credentials"**
1. Check user exists: `docker-compose exec postgres psql -U daycare -d daycare`
   ```sql
   SELECT * FROM users WHERE email = 'your@email.com';
   ```
2. Check backend logs: `docker-compose logs backend`
3. Verify JWT_SECRET is set in `.env`
4. Clear browser localStorage and cookies
5. Try password reset or create new admin account

**❌ Port already in use (3000, 5000, 5432)**
```bash
# Windows (PowerShell)
netstat -ano | findstr :3000
taskkill /PID <process_id> /F

# Linux/Mac
lsof -i :3000
kill -9 <PID>
```

**❌ Docker Compose won't start**
1. Ensure Docker Desktop is running: `docker ps`
2. Check logs: `docker-compose logs`
3. Reset: `docker-compose down -v && docker-compose up --build`
4. Check disk space: Docker needs ~2GB free

**❌ Database connection failed**
1. Check postgres is healthy: `docker-compose ps`
2. Verify DATABASE_URL in `.env`
3. Check postgres logs: `docker-compose logs postgres`
4. Wait 10-15 seconds for postgres to initialize on first start

**❌ Frontend shows blank page**
1. Check browser console for errors (F12)
2. Verify backend is running: `curl http://localhost:5000/api/auth/me`
3. Check frontend logs: `docker-compose logs frontend`
4. Clear browser cache and reload

**❌ File uploads failing**
1. Check file size < 20MB
2. Check allowed types: .pdf, .jpg, .jpeg, .png, .doc, .docx
3. Check uploads directory exists and is writable
4. Check backend logs for multer errors

**❌ Paystubs not generating**
1. Ensure pay period is closed: `status = 'CLOSED'`
2. Check payouts were created: `SELECT * FROM payouts WHERE pay_period_id = X`
3. Check paystubs table: `SELECT * FROM paystubs WHERE pay_period_id = X`
4. Check backend logs for PDF generation errors

### Database Operations

**Access database:**
```bash
# Docker Compose
docker-compose exec postgres psql -U daycare -d daycare

# Kubernetes
kubectl exec -it postgres-0 -n daycare -- psql -U daycare -d daycare
```

**Common queries:**
```sql
-- Make user an admin
UPDATE users SET role = 'ADMIN' WHERE email = 'user@example.com';

-- View all users
SELECT id, email, first_name, last_name, role, is_active FROM users;

-- View pending schedules
SELECT s.*, u.first_name, u.last_name
FROM schedules s
JOIN users u ON s.user_id = u.id
WHERE s.status = 'PENDING';

-- View open pay periods
SELECT * FROM pay_periods WHERE status = 'OPEN';
```

**Backup database:**
```bash
# Docker Compose
docker-compose exec postgres pg_dump -U daycare daycare > backup_$(date +%Y%m%d).sql

# Kubernetes
kubectl exec -it postgres-0 -n daycare -- pg_dump -U daycare daycare > backup_$(date +%Y%m%d).sql
```

**Restore database:**
```bash
# Docker Compose
docker-compose exec -T postgres psql -U daycare daycare < backup_20240301.sql

# Kubernetes
kubectl exec -i postgres-0 -n daycare -- psql -U daycare daycare < backup_20240301.sql
```

### Debug Mode

**Enable verbose logging:**
Add to `.env`:
```bash
DEBUG=*
LOG_LEVEL=debug
```

**Watch Kubernetes events:**
```bash
kubectl get events -n daycare --watch
```

---

## Security & Maintenance

### Security Checklist

- [x] Passwords hashed with bcrypt (10 rounds)
- [x] JWT tokens with 7-day expiration
- [x] Role-based access control (middleware)
- [x] Parameterized SQL queries (prevents injection)
- [x] CORS enabled for frontend domain
- [ ] **Change JWT_SECRET** from default (REQUIRED!)
- [ ] **Change database password** (REQUIRED!)
- [ ] **Use strong admin passwords** (REQUIRED!)
- [ ] **Add .env to .gitignore** (REQUIRED!)
- [ ] Enable HTTPS/TLS (production)
- [ ] Set up automated backups
- [ ] Regularly update dependencies: `npm audit`

### Sensitive Files (Never Commit!)

- `.env` - Contains secrets
- `k8s/secrets.yaml` - Kubernetes secrets
- Database backup files (.sql)

### Maintenance Tasks

**Weekly:**
- Review and approve educator schedules
- Close pay periods on schedule
- Backup database

**Monthly:**
- Review logs for errors: `docker-compose logs | grep ERROR`
- Check disk space: `df -h`
- Update dependencies: `npm audit fix`

**As Needed:**
- Add/remove user accounts
- Adjust educator hourly rates
- Archive inactive families
- Update domain/DNS records

### Updating the Application

1. **Make code changes** locally
2. **Test with docker-compose**: `docker-compose up --build`
3. **Commit to git** (if using version control)
4. **Deploy to production**: `./deploy.sh`
5. **Verify**: Check pods, test features, monitor logs

### Scaling

**Increase backend replicas:**
Edit [k8s/deployments/backend.yaml](k8s/deployments/backend.yaml):
```yaml
spec:
  replicas: 3  # Increase from 2 to 3
```
Apply: `kubectl apply -f k8s/deployments/backend.yaml`

**Increase resource limits:**
Edit resource limits in deployment YAMLs, then apply.

---

## Additional Resources

- **Main README**: [README.md](README.md) - Project overview
- **Kubernetes Guide**: [k8s/README.md](k8s/README.md) - K8s deployment details
- **Source Code**:
  - Backend routes: [backend/src/routes/](backend/src/routes/)
  - Frontend pages: [frontend/src/pages/](frontend/src/pages/)
  - Database schema: [backend/src/db/schema.sql](backend/src/db/schema.sql)

---

## Quick Reference Commands

```bash
# Start local development
docker-compose up --build

# Create admin user
./scripts/create-admin.sh email@example.com password123 First Last

# View logs
docker-compose logs -f backend

# Access database
docker-compose exec postgres psql -U daycare -d daycare

# Backup database
docker-compose exec postgres pg_dump -U daycare daycare > backup.sql

# Deploy to production
./deploy.sh

# Check k8s status
kubectl get all -n daycare

# Reset local environment
docker-compose down -v && docker-compose up --build
```

---

**Need Help?**
1. Check this handbook first
2. Review logs for errors
3. Check database state with SQL queries
4. Verify environment variables in `.env`

**System Status Check:**
- [ ] Docker running: `docker ps`
- [ ] Services healthy: `docker-compose ps`
- [ ] Database accessible: `psql` connection works
- [ ] Frontend loads: http://localhost:3000
- [ ] Backend responds: http://localhost:5000/api/auth/me
- [ ] Can login as admin
- [ ] Can create/view families

---

*Last updated: 2025-12-15*
