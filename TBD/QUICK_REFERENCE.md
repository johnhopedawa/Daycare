# Quick Reference Card

## 🚀 Quick Commands

### Start Local Development
```bash
docker-compose up --build
# Frontend: http://localhost:3000
# Backend: http://localhost:5000
```

### Deploy to k3s
```bash
./deploy.sh
```

### Create Admin User
```bash
./scripts/create-admin.sh email@example.com password123 First Last
```

### View Logs
```bash
# Docker Compose
docker-compose logs -f backend
docker-compose logs -f frontend

# Kubernetes
kubectl logs -f deployment/backend -n daycare
kubectl logs -f deployment/frontend -n daycare
```

### Access Database
```bash
# Docker Compose
docker-compose exec postgres psql -U daycare -d daycare

# Kubernetes
kubectl exec -it postgres-0 -n daycare -- psql -U daycare -d daycare
```

## 📋 Common SQL Queries

### Make user an admin
```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'user@example.com';
```

### View all users
```sql
SELECT id, email, first_name, last_name, role, is_active FROM users;
```

### View pending time entries
```sql
SELECT te.*, u.first_name, u.last_name
FROM time_entries te
JOIN users u ON te.user_id = u.id
WHERE te.status = 'PENDING';
```

### View open pay periods
```sql
SELECT * FROM pay_periods WHERE status = 'OPEN';
```

### View recent payouts
```sql
SELECT po.*, u.first_name, u.last_name, pp.name as period_name
FROM payouts po
JOIN users u ON po.user_id = u.id
JOIN pay_periods pp ON po.pay_period_id = pp.id
ORDER BY po.created_at DESC;
```

## 🔧 Troubleshooting

### Port already in use
```bash
# Find process using port 3000
lsof -i :3000
# Kill it
kill -9 <PID>
```

### Reset everything (docker-compose)
```bash
docker-compose down -v
docker-compose up --build
```

### Can't login
1. Check backend logs: `docker-compose logs backend`
2. Verify user exists: `SELECT * FROM users WHERE email = 'your@email';`
3. Clear browser cookies/localStorage
4. Regenerate JWT_SECRET in .env

### Database won't start
```bash
# Check postgres logs
docker-compose logs postgres

# Ensure no volume conflicts
docker-compose down -v
docker volume prune
```

### Images won't build
```bash
# Clear Docker cache
docker system prune -a

# Build manually
cd backend && docker build -t daycare-backend .
cd ../frontend && docker build -t daycare-frontend .
```

## 📊 User Workflows

### Educator Daily Flow
1. Login → Dashboard
2. Click "Log Hours"
3. Enter date, hours, notes
4. Submit
5. Check "My Hours" for status

### Admin Daily Flow
1. Login → Dashboard (see pending count)
2. "Review Hours"
3. Select entries to approve (use checkboxes for batch)
4. Click "Approve Selected" or individual approve/reject

### Admin Pay Period Close
1. "Pay Periods"
2. Verify all hours approved
3. Click "Close Period"
4. System generates payouts automatically
5. Download Excel summary
6. Educators can now download paystubs

### Admin Parent Payment
1. "Parents" → Add parent if new
2. "Payments" → "Add Payment"
3. Enter amount, date, method
4. Mark as "Paid" when received
5. Download receipt PDF to give parent

## 🔐 Important Files to Secure

- `.env` - Contains secrets (never commit!)
- `k8s/secrets.yaml` - Kubernetes secrets
- Database backups

## 📁 Important Directories

- `backend/src/routes/` - API endpoints
- `frontend/src/pages/` - UI pages
- `k8s/` - Kubernetes manifests
- `backend/src/db/schema.sql` - Database structure

## 🔄 Update Workflow

1. Make code changes
2. Test locally with docker-compose
3. Commit to git (if using version control)
4. Rebuild images: `./deploy.sh`
5. Verify in production

## 📞 Getting Help

1. Check logs first (see commands above)
2. Review README.md for detailed docs
3. Check GETTING_STARTED.md for setup issues
4. Review PROJECT_SUMMARY.md for architecture
5. Check k8s/README.md for deployment issues

## 🎯 Key URLs

### Local Development
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Database: localhost:5432

### Production (k3s)
- App: http://sistersdomain.com (or your domain)
- Backend is proxied through nginx at /api

## 🛡️ Security Checklist

- [ ] Changed JWT_SECRET from default
- [ ] Changed database password
- [ ] Created strong admin password
- [ ] Added .env to .gitignore
- [ ] Limited database access
- [ ] Planning TLS/HTTPS (future)

## 💾 Backup Commands

### Backup Database (docker-compose)
```bash
docker-compose exec postgres pg_dump -U daycare daycare > backup_$(date +%Y%m%d).sql
```

### Restore Database (docker-compose)
```bash
docker-compose exec -T postgres psql -U daycare daycare < backup_20240301.sql
```

### Backup Database (k8s)
```bash
kubectl exec -it postgres-0 -n daycare -- pg_dump -U daycare daycare > backup_$(date +%Y%m%d).sql
```

## 📈 Scaling Tips

### Increase Backend Replicas
Edit `k8s/backend.yaml`:
```yaml
spec:
  replicas: 3  # Change from 2 to 3
```
Then: `kubectl apply -f k8s/backend.yaml`

### Increase Resource Limits
Edit resource limits in deployment yamls, then apply.

## 🐛 Debug Mode

### Enable Verbose Logging
Add to `.env`:
```
DEBUG=*
LOG_LEVEL=debug
```

### Watch Kubernetes Events
```bash
kubectl get events -n daycare --watch
```

## 📝 Quick Notes

- Pay periods must be closed before educators can get paystubs
- Only pending entries can be edited/deleted by educators
- Closed pay period dates are locked - no new entries
- Admin role is required for all /api/admin/* endpoints
- JWT tokens expire after 7 days
- Batch approve only works on pending entries

---
Keep this file handy for day-to-day operations!
