# Kubernetes Deployment

Organized k8s manifests for deploying the Daycare Management System.

## Directory Structure

```
k8s/
├── secrets/          # Secret configurations (passwords, JWT secret)
├── storage/          # PersistentVolumeClaims
├── deployments/      # Deployment manifests
├── services/         # Service manifests
├── ingress/          # Ingress configuration
├── jobs/             # One-time jobs (migrations)
├── deploy.sh         # Full deployment script
├── apply-all.sh      # Quick apply all manifests
└── delete-all.sh     # Delete all resources
```

## Prerequisites

- k3s cluster running
- kubectl configured
- Docker registry accessible (default: localhost:5000)
- Domain DNS pointing to your cluster IP

## Quick Deployment

### Option 1: Full Automated Deploy

```bash
# From the k8s directory
./deploy.sh
```

This will:
1. Build Docker images
2. Push to registry
3. Apply all manifests in correct order
4. Wait for services to be ready
5. Run database migrations

### Option 2: Manual Step-by-Step

```bash
# 1. Update secrets first!
nano secrets/daycare-secrets.yaml
# Change postgres-password and jwt-secret

# 2. Apply all manifests
./apply-all.sh

# 3. Wait for postgres to be ready
kubectl wait --for=condition=ready pod -l app=postgres --timeout=300s

# 4. Run migrations
kubectl apply -f jobs/db-migration.yaml

# 5. Check everything is running
kubectl get all
```

### Option 3: Apply Individual Components

```bash
kubectl apply -f secrets/
kubectl apply -f storage/
kubectl apply -f deployments/postgres.yaml
kubectl apply -f services/postgres-service.yaml
# ... continue as needed
```

## Building and Pushing Images

The images need to be accessible to your k3s cluster. Options:

### Option A: Local Registry

```bash
# Start a local registry if you don't have one
docker run -d -p 5000:5000 --restart=always --name registry registry:2

# Build and push
cd ..
docker build -t localhost:5000/daycare-backend:latest ./backend
docker build -t localhost:5000/daycare-frontend:latest ./frontend
docker push localhost:5000/daycare-backend:latest
docker push localhost:5000/daycare-frontend:latest
```

### Option B: Import to k3s Directly

```bash
cd ..
docker build -t daycare-backend:latest ./backend
docker build -t daycare-frontend:latest ./frontend

# Import to k3s
docker save daycare-backend:latest | sudo k3s ctr images import -
docker save daycare-frontend:latest | sudo k3s ctr images import -

# Update deployments to use local images (remove registry prefix)
```

## Configuration

### Update Secrets (IMPORTANT!)

Before deploying, update `secrets/daycare-secrets.yaml`:

```yaml
stringData:
  postgres-user: daycare
  postgres-password: YOUR_STRONG_PASSWORD_HERE
  postgres-db: daycare
  jwt-secret: YOUR_LONG_RANDOM_STRING_HERE
```

Generate a strong JWT secret:
```bash
openssl rand -base64 32
```

### Update Ingress Domain

Edit `ingress/daycare-ingress.yaml` and change the host:

```yaml
spec:
  rules:
  - host: your-actual-domain.com  # Change this
```

## Verification

Check that everything is running:

```bash
# Check all resources
kubectl get all

# Check pods are running
kubectl get pods
# Should show: backend, frontend, postgres all Running

# Check services
kubectl get svc

# Check ingress
kubectl get ingress
```

## Accessing the Application

Once deployed:

1. **Via Ingress** (if DNS configured):
   - http://your-domain.com

2. **Via Port Forward** (for testing):
   ```bash
   kubectl port-forward svc/frontend 8080:80
   # Access at http://localhost:8080
   ```

## Create First Admin User

```bash
# Get backend pod name
BACKEND_POD=$(kubectl get pods -l app=backend -o jsonpath='{.items[0].metadata.name}')

# Create admin user
kubectl exec -it $BACKEND_POD -- node -e "
const bcrypt = require('bcryptjs');
const pool = require('./src/db/pool');

async function createAdmin() {
  const passwordHash = await bcrypt.hash('your-password', 10);
  const result = await pool.query(
    'INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES (\$1, \$2, \$3, \$4, \$5) RETURNING id',
    ['admin@example.com', passwordHash, 'Admin', 'User', 'ADMIN']
  );
  console.log('Admin created with ID:', result.rows[0].id);
  process.exit(0);
}

createAdmin();
"
```

## Updating the Application

```bash
# Rebuild images
cd ..
docker build -t localhost:5000/daycare-backend:latest ./backend
docker build -t localhost:5000/daycare-frontend:latest ./frontend
docker push localhost:5000/daycare-backend:latest
docker push localhost:5000/daycare-frontend:latest

# Restart deployments to pull new images
kubectl rollout restart deployment/backend
kubectl rollout restart deployment/frontend

# Watch the rollout
kubectl rollout status deployment/backend
kubectl rollout status deployment/frontend
```

## Troubleshooting

### View Logs

```bash
# Backend logs
kubectl logs -f deployment/backend

# Frontend logs
kubectl logs -f deployment/frontend

# Postgres logs
kubectl logs -f statefulset/postgres

# Migration job logs
kubectl logs job/db-migration
```

### Check Pod Status

```bash
# Describe a pod to see events
kubectl describe pod <pod-name>

# Get all events
kubectl get events --sort-by='.lastTimestamp'
```

### Images Not Pulling

If pods show `ImagePullBackOff`:

1. Check registry is accessible from k3s nodes
2. For local registry, ensure k3s can reach localhost:5000
3. Consider importing images directly to k3s

### Database Connection Issues

```bash
# Test postgres is running
kubectl get pods -l app=postgres

# Check postgres service
kubectl get svc postgres

# Test connection from backend pod
kubectl exec -it deployment/backend -- sh
# Inside pod:
psql $DATABASE_URL -c "SELECT 1"
```

### Reset Everything

```bash
# Delete all resources (keeps PVC)
./delete-all.sh

# Delete including data
kubectl delete pvc postgres-pvc

# Redeploy
./deploy.sh
```

## Resource Usage

Current configuration:
- **Backend**: 256Mi-512Mi RAM, 250m-500m CPU × 2 replicas
- **Frontend**: 128Mi-256Mi RAM, 100m-200m CPU × 2 replicas
- **Postgres**: ~200-300Mi RAM
- **Total**: ~1.5-2GB

Adjust in deployment YAMLs under `resources:` section if needed.

## Security Notes

- [ ] Change default passwords in secrets
- [ ] Generate strong JWT secret
- [ ] Restrict database access to cluster only
- [ ] Add TLS/HTTPS (use cert-manager for Let's Encrypt)
- [ ] Implement backup strategy for PVC
- [ ] Consider NetworkPolicies for additional security

## Backup Database

```bash
# Backup
kubectl exec -it postgres-0 -- pg_dump -U daycare daycare > backup_$(date +%Y%m%d).sql

# Restore
kubectl exec -i postgres-0 -- psql -U daycare daycare < backup_20240301.sql
```

## Useful Commands

```bash
# Watch all pods
kubectl get pods -w

# Shell into backend pod
kubectl exec -it deployment/backend -- sh

# View resource usage
kubectl top pods

# Scale deployments
kubectl scale deployment/backend --replicas=3

# Delete and redeploy single component
kubectl delete -f deployments/backend.yaml
kubectl apply -f deployments/backend.yaml
```
