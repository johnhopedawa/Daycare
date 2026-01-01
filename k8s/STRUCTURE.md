# K8s Structure

The Kubernetes manifests are now organized into separate folders for better management.

## New Structure

```
k8s/
├── secrets/
│   └── daycare-secrets.yaml          # Passwords and JWT secret
├── storage/
│   └── postgres-pvc.yaml              # Persistent volume claim
├── deployments/
│   ├── postgres.yaml                  # PostgreSQL StatefulSet
│   ├── backend.yaml                   # Backend API Deployment
│   └── frontend.yaml                  # Frontend Deployment
├── services/
│   ├── postgres-service.yaml          # Postgres Service
│   ├── backend-service.yaml           # Backend Service
│   └── frontend-service.yaml          # Frontend Service
├── ingress/
│   └── daycare-ingress.yaml           # Traefik Ingress
├── jobs/
│   └── db-migration.yaml              # Database migration job
├── deploy.sh                          # Full deployment automation
├── apply-all.sh                       # Quick apply all
├── delete-all.sh                      # Clean up all resources
├── README.md                          # Full documentation
└── STRUCTURE.md                       # This file
```

## Key Changes from Original

1. **No namespace** - Removed all `namespace: daycare` lines
2. **Organized folders** - Separated by resource type
3. **Cleaner secrets** - Updated with better defaults
4. **Helper scripts** - Added apply-all and delete-all
5. **Better documentation** - Updated README with new structure

## Quick Commands

```bash
# Deploy everything
./deploy.sh

# Or manually apply
./apply-all.sh

# Delete everything
./delete-all.sh

# Apply specific component
kubectl apply -f secrets/
kubectl apply -f deployments/backend.yaml
```

## Important: Update Before Deploying

1. **Edit secrets/daycare-secrets.yaml**:
   - Change `postgres-password`
   - Change `jwt-secret` (use `openssl rand -base64 32`)

2. **Edit ingress/daycare-ingress.yaml**:
   - Change host to your actual domain

3. **Update image location** (if needed):
   - deployments/backend.yaml
   - deployments/frontend.yaml
   - Change `localhost:5000` to your registry

## Deployment Order (if doing manually)

1. secrets/
2. storage/
3. deployments/postgres.yaml + services/postgres-service.yaml
4. Wait for postgres ready
5. jobs/db-migration.yaml
6. deployments/backend.yaml + services/backend-service.yaml
7. deployments/frontend.yaml + services/frontend-service.yaml
8. ingress/

Or just use `./deploy.sh` - it handles the order automatically!
