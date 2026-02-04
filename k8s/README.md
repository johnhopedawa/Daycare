# Kubernetes Deployment

Organized k8s manifests for deploying the Daycare Management System.

## Directory Structure

```
k8s/
|- namespace.yaml           # Namespace for all resources
|- crds/                    # CRDs (Traefik middleware)
|- secrets/                 # Secret configurations (passwords, JWT secret)
|- storage/                 # PersistentVolumeClaims
|- deployments/             # Deployment manifests
|- services/                # Service manifests
|- ingress/                 # Ingress configuration
|- jobs/                    # One-time jobs (migrations)
|- scripts/                 # Utility scripts (admin, backups)
|- deploy.sh                # Full deployment script
|- apply-all.sh             # Quick apply all manifests
`- delete-all.sh            # Delete all resources
```

## Prerequisites

- k3s cluster running
- kubectl configured
- Docker Hub accessible (default: johnhopedawa)
- Domain DNS pointing to your cluster IP
- Namespace `littlesparrows` (lowercase required by Kubernetes) will be created by the scripts

## Quick Deployment

### Option 1: Full Automated Deploy

```bash
# From the k8s directory
./deploy.sh
```

This will:
1. Apply CRDs (Traefik middleware)
2. Build Docker images
2. Push to registry
3. Apply all manifests in correct order
4. Wait for services to be ready
5. Run database migrations

### Option 2: Manual Step-by-Step

```bash
# 1. Update secrets first!
nano secrets/daycare-secrets.yaml
# Change postgres-password, jwt-secret, and encryption-key

# 2. Apply all manifests (includes CRDs)
./apply-all.sh

# 3. Wait for postgres to be ready
kubectl -n littlesparrows wait --for=condition=ready pod -l app=postgres --timeout=300s

# 4. Run migrations
kubectl -n littlesparrows apply -f jobs/db-migration.yaml

# 5. Check everything is running
kubectl -n littlesparrows get all
```

### Option 3: Apply Individual Components

```bash
kubectl -n littlesparrows apply -f namespace.yaml
kubectl -n littlesparrows apply -f secrets/
kubectl -n littlesparrows apply -f storage/
kubectl -n littlesparrows apply -f deployments/postgres.yaml
kubectl -n littlesparrows apply -f services/postgres-service.yaml
# ... continue as needed
```

## Building and Pushing Images

The images need to be accessible to your k3s cluster. Options:

### Option A: Docker Hub (recommended)

```bash
# Build and push
cd ..
docker build -t johnhopedawa/daycare-backend:latest ./backend
docker build -t johnhopedawa/daycare-frontend:latest \
  --build-arg REACT_APP_FIREFLY_URL=https://firefly.littlesparrowsacademy.com \
  ./frontend
docker push johnhopedawa/daycare-backend:latest
docker push johnhopedawa/daycare-frontend:latest
```

### Option B: Import to k3s Directly

```bash
cd ..
docker build -t daycare-backend:latest ./backend
docker build -t daycare-frontend:latest \
  --build-arg REACT_APP_FIREFLY_URL=https://firefly.littlesparrowsacademy.com \
  ./frontend

# Import to k3s
docker save daycare-backend:latest | sudo k3s ctr images import -
docker save daycare-frontend:latest | sudo k3s ctr images import -

# Update deployments to use local images (remove Docker Hub prefix)
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
  encryption-key: YOUR_64_HEX_CHAR_KEY
  firefly-service-pat: YOUR_FIREFLY_SERVICE_PAT
  firefly-app-key: base64:YOUR_FIREFLY_APP_KEY
  firefly-site-owner: admin@littlesparrowsacademy.com
```

Generate a strong JWT secret:
```bash
openssl rand -base64 32
```
Generate an encryption key (required for SimpleFIN/Firefly integration):
```bash
openssl rand -hex 32
```

### Private Registry Pull Secret (Docker Hub)

If your Docker Hub repos are private, create a pull secret in the cluster and
ensure it is named `dockerhub-credentials` in the `littlesparrows` namespace:

```bash
kubectl -n littlesparrows create secret docker-registry dockerhub-credentials \
  --docker-username="$DOCKERHUB_USERNAME" \
  --docker-password="$DOCKERHUB_TOKEN" \
  --docker-email="you@example.com"
```
### Update CORS Origin (IMPORTANT!)

Edit `deployments/backend.yaml` and set `FRONTEND_URL` to your real domain:

```yaml
- name: FRONTEND_URL
  value: "https://littlesparrowsacademy.com"
```

### Update Ingress Domain

Edit `ingress/daycare-ingress.yaml` and change the host:

```yaml
spec:
  rules:
  - host: littlesparrowsacademy.com
```
The ingress routes `/api` to the backend and `/` to the frontend.

### Firefly Subdomain (Recommended)

Firefly is routed via its own subdomain to avoid path conflicts.
The subdomain is protected by a Traefik forward-auth middleware that
requires a developer unlock cookie issued by the backend.

1) Update `ingress/firefly-ingress.yaml` to your desired subdomain:
```yaml
spec:
  rules:
  - host: firefly.littlesparrowsacademy.com
```
2) Ensure the Cloudflare origin TLS cert includes the subdomain and update the
`cloudflare-origin-tls` secret if needed.
3) Rebuild the frontend image with:
```bash
docker build -t johnhopedawa/daycare-frontend:latest \
  --build-arg REACT_APP_FIREFLY_URL=https://firefly.littlesparrowsacademy.com \
  ./frontend
```
4) Apply the ingress (includes the Firefly auth middleware):
```bash
kubectl -n littlesparrows apply -f ingress/
```

### Cloudflare Origin TLS

Create the Cloudflare origin TLS secret in the same namespace as the ingress:

```bash
kubectl -n littlesparrows create secret tls cloudflare-origin-tls \
  --cert=cf-origin.crt \
  --key=cf-origin.key
```

### Frontend API URL (Build Time)

The frontend uses `REACT_APP_API_URL` at build time. If you deploy behind ingress,
set it to `https://littlesparrowsacademy.com/api` when building the frontend image.

## Verification

Check that everything is running:

```bash
# Check all resources
kubectl -n littlesparrows get all

# Check pods are running
kubectl -n littlesparrows get pods
# Should show: backend, frontend, postgres all Running

# Check services
kubectl -n littlesparrows get svc

# Check ingress
kubectl -n littlesparrows get ingress
```

## Accessing the Application

Once deployed:

1. **Via Ingress** (if DNS configured):
   - http://littlesparrowsacademy.com

2. **Via Port Forward** (for testing):
   ```bash
   kubectl -n littlesparrows port-forward svc/frontend 8080:80
   # Access at http://localhost:8080
   ```

## Create First Admin User

You can use the helper script:

```bash
./scripts/create-admin.sh admin@littlesparrowsacademy.com
```

Or run the one-liner directly:

```bash
# Get backend pod name
BACKEND_POD=$(kubectl -n littlesparrows get pods -l app=backend -o jsonpath='{.items[0].metadata.name}')

# Create admin user
kubectl -n littlesparrows exec -it $BACKEND_POD -- node -e "
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
docker build -t johnhopedawa/daycare-backend:latest ./backend
docker build -t johnhopedawa/daycare-frontend:latest \
  --build-arg REACT_APP_FIREFLY_URL=https://firefly.littlesparrowsacademy.com \
  ./frontend
docker push johnhopedawa/daycare-backend:latest
docker push johnhopedawa/daycare-frontend:latest

# Restart deployments to pull new images
kubectl -n littlesparrows rollout restart deployment/backend
kubectl -n littlesparrows rollout restart deployment/frontend

# Watch the rollout
kubectl -n littlesparrows rollout status deployment/backend
kubectl -n littlesparrows rollout status deployment/frontend
```

## Troubleshooting

### View Logs

```bash
# Backend logs
kubectl -n littlesparrows logs -f deployment/backend

# Frontend logs
kubectl -n littlesparrows logs -f deployment/frontend

# Postgres logs
kubectl -n littlesparrows logs -f statefulset/postgres

# Migration job logs
kubectl -n littlesparrows logs job/db-migration
```

### Check Pod Status

```bash
# Describe a pod to see events
kubectl -n littlesparrows describe pod <pod-name>

# Get all events
kubectl -n littlesparrows get events --sort-by='.lastTimestamp'
```

### Images Not Pulling

If pods show `ImagePullBackOff`:

1. Check registry is accessible from k3s nodes
2. For local registry, ensure k3s can reach localhost:5000
3. Consider importing images directly to k3s

### Database Connection Issues

```bash
# Test postgres is running
kubectl -n littlesparrows get pods -l app=postgres

# Check postgres service
kubectl -n littlesparrows get svc postgres

# Test connection from backend pod
kubectl -n littlesparrows exec -it deployment/backend -- sh
# Inside pod:
psql $DATABASE_URL -c "SELECT 1"
```

### Reset Everything

```bash
# Delete all resources (keeps PVC)
./delete-all.sh

# Delete including data
kubectl -n littlesparrows delete pvc postgres-pvc

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

You can use the helper scripts (encrypted, stored locally):

```bash
# Create encrypted backup in k8s/backups
./scripts/backup-db.sh

# Restore from an encrypted backup
./scripts/restore-db.sh ./backups/daycare_YYYYMMDD_HHMMSS.sql.gz.enc
```

Or use the raw commands:

```bash
# Backup
kubectl -n littlesparrows exec -it postgres-0 -- pg_dump -U daycare daycare > backup_$(date +%Y%m%d).sql

# Restore
kubectl -n littlesparrows exec -i postgres-0 -- psql -U daycare daycare < backup_20240301.sql
```

## Useful Commands

```bash
# Watch all pods
kubectl -n littlesparrows get pods -w

# Shell into backend pod
kubectl -n littlesparrows exec -it deployment/backend -- sh

# View resource usage
kubectl -n littlesparrows top pods

# Scale deployments
kubectl -n littlesparrows scale deployment/backend --replicas=3

# Delete and redeploy single component
kubectl -n littlesparrows delete -f deployments/backend.yaml
kubectl -n littlesparrows apply -f deployments/backend.yaml
```





