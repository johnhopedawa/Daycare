# Getting Started with Daycare Management System

This guide will walk you through setting up and using the Daycare Management System for the first time.

## Prerequisites

- Docker and Docker Compose installed (for local dev)
- OR k3s cluster with Traefik (for production)
- Node.js 18+ (for local development without Docker)

## Step 1: Clone and Setup

```bash
# Navigate to your project directory
cd /path/to/daycare

# Copy environment file
cp .env.example .env

# Edit .env and update values (especially JWT_SECRET in production)
nano .env
```

## Step 2: Start the Application

### Option A: Local Development (Recommended for Testing)

```bash
# Make deploy script executable
chmod +x deploy.sh

# Start with docker-compose
./deploy.sh --local

# Or manually
docker-compose up --build
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

### Option B: Production on k3s

```bash
# Build and deploy to k8s
./deploy.sh

# Check deployment status
kubectl get pods -n daycare
```

## Step 3: Create Your First Admin Account

### Method 1: Using the helper script (easiest)

```bash
chmod +x scripts/create-admin.sh
./scripts/create-admin.sh admin@sistersdomain.com yourpassword Admin User
```

### Method 2: Manual creation

**For docker-compose:**
```bash
# Access the database
docker-compose exec postgres psql -U daycare -d daycare

# In psql, run:
# First register a user via the API or manually insert with hashed password
# Then promote to admin:
UPDATE users SET role = 'ADMIN' WHERE email = 'your-email@example.com';
```

**For k8s:**
```bash
# Get backend pod name
BACKEND_POD=$(kubectl get pods -n daycare -l app=backend -o jsonpath='{.items[0].metadata.name}')

# Use the node command to create admin (see k8s/README.md for full command)
```

## Step 4: Login and Initial Setup

1. **Open the application** in your browser (http://localhost:3000 or your domain)

2. **Login** with your admin credentials

3. **Create Educators:**
   - Navigate to "Educators" in the admin menu
   - Click "Add Educator"
   - Fill in their details and set their hourly rate
   - They can now login and start logging hours

4. **Create a Pay Period:**
   - Go to "Pay Periods"
   - Click "Create Period"
   - Set name (e.g., "March 2024"), start date, and end date
   - Leave it OPEN for educators to log hours

5. **Add Parents (optional):**
   - Navigate to "Parents"
   - Add parent information
   - You can then track payments and generate receipts

## Step 5: Daily Operations

### For Educators:
1. Login at http://localhost:3000 (or your domain)
2. Click "Log Hours"
3. Enter date, hours worked, and any notes
4. Submit
5. View status in "My Hours"

### For Admins:
1. Login and view dashboard for overview
2. Go to "Review Hours" to approve/reject time entries
   - Use checkboxes to batch approve multiple entries
3. When pay period ends:
   - Go to "Pay Periods"
   - Click "Close Period" on the active period
   - This locks the period and generates payouts
4. Download payroll summary:
   - Click "Download Excel" on closed period
5. Generate and distribute paystubs:
   - Paystubs are auto-generated when period closes
   - Educators can download from "My Paystubs"
   - Admins can view all paystubs

### Parent Billing:
1. Add parents in "Parents" section
2. Log payments in "Payments" section
3. Mark payments as "Paid"
4. Generate and download receipts

## Common Tasks

### View Logs (docker-compose)
```bash
# All services
docker-compose logs -f

# Just backend
docker-compose logs -f backend

# Just frontend
docker-compose logs -f frontend
```

### View Logs (k8s)
```bash
# Backend logs
kubectl logs -f deployment/backend -n daycare

# Frontend logs
kubectl logs -f deployment/frontend -n daycare

# Database logs
kubectl logs -f statefulset/postgres -n daycare
```

### Reset Database (docker-compose)
```bash
# Stop and remove volumes
docker-compose down -v

# Start fresh
docker-compose up --build
```

### Access Database Directly

**docker-compose:**
```bash
docker-compose exec postgres psql -U daycare -d daycare
```

**k8s:**
```bash
kubectl exec -it postgres-0 -n daycare -- psql -U daycare -d daycare
```

### Update Code and Redeploy

**docker-compose:**
```bash
# Just rebuild and restart
docker-compose up --build
```

**k8s:**
```bash
# Rebuild images and redeploy
./deploy.sh
```

## Troubleshooting

### Application won't start
1. Check Docker is running: `docker ps`
2. Check ports aren't in use: `lsof -i :3000,5000,5432`
3. View logs: `docker-compose logs`

### Can't login
1. Verify user exists in database
2. Check JWT_SECRET is set
3. Clear browser cookies/localStorage
4. Check backend logs for auth errors

### Database connection failed
1. Ensure postgres service is healthy: `docker-compose ps`
2. Check DATABASE_URL in .env
3. Verify postgres logs: `docker-compose logs postgres`

### Images not building
1. Ensure you have enough disk space
2. Clear Docker cache: `docker system prune -a`
3. Try building manually:
   ```bash
   cd backend && docker build -t daycare-backend .
   cd ../frontend && docker build -t daycare-frontend .
   ```

## Next Steps

- Set up automated backups for your database
- Configure TLS/HTTPS for production
- Set up monitoring (optional)
- Train your staff on using the system
- Establish a regular pay period schedule

## Getting Help

- Check the main [README.md](README.md) for full documentation
- See [k8s/README.md](k8s/README.md) for Kubernetes-specific help
- Review backend logs for API errors
- Check browser console for frontend errors

## Security Reminders

- [ ] Change default JWT_SECRET
- [ ] Use strong passwords for admin accounts
- [ ] Change default database credentials
- [ ] Enable HTTPS in production
- [ ] Regularly backup your database
- [ ] Keep dependencies updated
