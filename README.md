# Daycare Management System

A comprehensive web application for managing daycare operations including:
- Educator time tracking and payroll
- Admin approval workflows
- Pay period management
- Invoice and paystub generation (PDF & Excel)
- Parent billing and receipt generation
- Full authentication and role-based access control

## Features

### For Educators
- Log work hours (with start/end time or total hours)
- View and manage personal time entries
- Track entry status (Pending/Approved/Rejected)
- Download personal paystubs as PDFs

### For Admins
- Review and approve/reject time entries (single or batch)
- Manage educator accounts and set hourly rates
- Create and close pay periods
- Generate payroll summaries (Excel export)
- Generate and distribute paystubs (PDF)
- Manage parent accounts and billing
- Track parent payments and generate receipts (PDF)
- Dashboard with key metrics

## Tech Stack

- **Backend**: Node.js + Express + PostgreSQL
- **Frontend**: React + React Router
- **Authentication**: JWT
- **PDF Generation**: PDFKit
- **Excel Export**: ExcelJS
- **Containerization**: Docker + docker-compose
- **Deployment**: k3s + Traefik
- **Memory Usage**: ~1.5-2GB (fits comfortably in 4GB)

## Project Structure

```
.
├── backend/
│   ├── src/
│   │   ├── db/              # Database connection, schema, migrations
│   │   ├── middleware/      # Auth middleware
│   │   ├── routes/          # API endpoints
│   │   ├── services/        # PDF & Excel generation
│   │   ├── utils/           # JWT utilities
│   │   └── server.js        # Express server
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── contexts/        # Auth context
│   │   ├── pages/           # Page components
│   │   ├── utils/           # API client
│   │   ├── App.js           # Main app with routing
│   │   └── index.css        # Styling
│   ├── Dockerfile
│   ├── nginx.conf           # Nginx config for production
│   └── package.json
├── k8s/                     # Kubernetes manifests
├── docker-compose.yml       # Local development setup
├── deploy.sh               # Deployment script
└── README.md

```

## Quick Start

### Option 1: Local Development with Docker Compose

1. **Copy environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Start all services:**
   ```bash
   chmod +x deploy.sh
   ./deploy.sh --local
   ```

   Or manually:
   ```bash
   docker-compose up --build
   ```

3. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

4. **Create first admin user:**
   - Register via POST to `http://localhost:5000/api/auth/register`
   - Then manually update role in database:
     ```bash
     docker-compose exec postgres psql -U daycare -d daycare
     UPDATE users SET role = 'ADMIN' WHERE email = 'your-email@example.com';
     ```

### Option 2: Production Deployment to k3s

See detailed instructions in [k8s/README.md](k8s/README.md)

**Quick deploy:**
```bash
chmod +x deploy.sh
./deploy.sh
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Time Entries (Educator)
- `GET /api/time-entries/mine` - Get my entries
- `POST /api/time-entries` - Create entry
- `PUT /api/time-entries/:id` - Update entry
- `DELETE /api/time-entries/:id` - Delete entry

### Admin - Time Management
- `GET /api/admin/time-entries` - Get all entries (with filters)
- `POST /api/admin/time-entries/:id/approve` - Approve entry
- `POST /api/admin/time-entries/:id/reject` - Reject entry
- `POST /api/admin/time-entries/batch-approve` - Batch approve

### Admin - User Management
- `GET /api/admin/users` - Get all users
- `POST /api/admin/users` - Create educator
- `PATCH /api/admin/users/:id` - Update user

### Admin - Pay Periods
- `GET /api/pay-periods` - Get all pay periods
- `POST /api/pay-periods` - Create pay period
- `POST /api/pay-periods/:id/close` - Close period (generates payouts)
- `GET /api/pay-periods/:id/payouts` - Get payouts for period

### Admin - Parents & Payments
- `GET /api/parents` - Get all parents
- `POST /api/parents` - Create parent
- `PATCH /api/parents/:id` - Update parent
- `GET /api/parents/payments` - Get all payments
- `POST /api/parents/payments` - Create payment
- `PATCH /api/parents/payments/:id` - Update payment

### Documents
- `GET /api/documents/paystubs/mine` - Get my paystubs
- `GET /api/documents/paystubs/:id/pdf` - Download paystub PDF
- `GET /api/documents/pay-periods/:id/export-excel` - Export payroll to Excel
- `POST /api/documents/parent-payments/:id/generate-receipt` - Generate receipt
- `GET /api/documents/parent-payments/:id/receipt-pdf` - Download receipt PDF

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/database

# JWT Secret
JWT_SECRET=your-secret-key-here

# App URLs
BACKEND_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3000

# Node Environment
NODE_ENV=development
```

## Database Schema

- **users** - Educators and admins with roles, hourly rates
- **time_entries** - Work hours logged by educators
- **pay_periods** - Pay period definitions (OPEN/CLOSED)
- **payouts** - Generated when pay period closes
- **paystubs** - Generated paystub records
- **invoices** - Invoice records per educator
- **parents** - Parent/customer information
- **parent_payments** - Payment tracking and receipts

## Security Features

- JWT-based authentication
- Role-based access control (EDUCATOR/ADMIN)
- Password hashing with bcryptjs
- Protected API endpoints
- Input validation
- SQL injection protection via parameterized queries

## Development

### Backend Development
```bash
cd backend
npm install
npm run dev  # Runs with nodemon
```

### Frontend Development
```bash
cd frontend
npm install
npm start  # Runs on port 3000
```

### Database Migrations
```bash
cd backend
npm run migrate
```

## Troubleshooting

### Docker Compose Issues
```bash
# View logs
docker-compose logs -f

# Rebuild services
docker-compose up --build

# Reset everything
docker-compose down -v
docker-compose up --build
```

### Port Conflicts
If ports 3000, 5000, or 5432 are in use, update `docker-compose.yml` ports.

### Database Connection Issues
Ensure PostgreSQL is healthy:
```bash
docker-compose ps
```

## Future Enhancements

- [ ] Stripe Connect integration for actual payouts
- [ ] Email notifications for approvals/rejections
- [ ] Mobile app (React Native)
- [ ] Automated pay period creation
- [ ] Advanced reporting and analytics
- [ ] TLS/HTTPS with Let's Encrypt
- [ ] Automated backups
- [ ] Multi-daycare support

## License

Proprietary - Internal use only

## Support

For issues or questions, refer to the deployment guides or check logs:
- Backend: `kubectl logs -f deployment/backend -n daycare`
- Frontend: `kubectl logs -f deployment/frontend -n daycare`
- Database: `kubectl logs -f statefulset/postgres -n daycare`
