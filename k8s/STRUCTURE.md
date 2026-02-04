# K8s Structure

The Kubernetes manifests are organized into separate folders for better management.

## Structure

```
k8s/
|- namespace.yaml               # Namespace for all resources
|- secrets/
|  `- daycare-secrets.yaml        # Passwords, JWT, encryption key
|- crds/
|  `- kustomization.yaml          # Traefik CRDs
|- storage/
|  |- postgres-pvc.yaml           # Persistent volume claim
|  `- firefly-upload-pvc.yaml     # Firefly III upload storage
|- deployments/
|  |- postgres.yaml               # PostgreSQL StatefulSet
|  |- backend.yaml                # Backend API Deployment
|  |- frontend.yaml               # Frontend Deployment
|  `- firefly.yaml                # Firefly III Deployment
|- services/
|  |- postgres-service.yaml       # Postgres Service
|  |- backend-service.yaml        # Backend Service
|  |- frontend-service.yaml       # Frontend Service
|  `- firefly-service.yaml        # Firefly III Service
|- ingress/
|  |- daycare-ingress.yaml        # Traefik Ingress
|  |- firefly-ingress.yaml        # Firefly III Ingress
|  `- firefly-auth-middleware.yaml # Firefly access gate
|- jobs/
|  `- db-migration.yaml           # Database migration job
|- scripts/                       # Utility scripts (admin, backups)
|  |- create-admin.sh             # Create an admin user
|  |- backup-db.sh                # Encrypted database backup
|  `- restore-db.sh               # Restore from encrypted backup
|- deploy.sh                      # Full deployment automation
|- apply-all.sh                   # Quick apply all
|- delete-all.sh                  # Clean up all resources
|- README.md                      # Full documentation
`- STRUCTURE.md                   # This file
```

Note: Namespace names must be lowercase in Kubernetes; this project uses `littlesparrows`.

## Key Changes from Original

1. **Namespace isolation** - All resources live in the `littlesparrows` namespace
2. **Organized folders** - Separated by resource type
3. **Cleaner secrets** - Added encryption key and safer defaults
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
kubectl -n littlesparrows apply -f secrets/
kubectl -n littlesparrows apply -f deployments/backend.yaml
```

## Important: Update Before Deploying

1. **Edit secrets/daycare-secrets.yaml**:
   - Change `postgres-password`
   - Change `jwt-secret` (use `openssl rand -base64 32`)
   - Change `encryption-key` (use `openssl rand -hex 32`)
   - Set `firefly-service-pat`, `firefly-app-key`, and `firefly-site-owner`

2. **Edit deployments/backend.yaml**:
   - Set `FRONTEND_URL` to your domain

3. **Edit ingress/daycare-ingress.yaml**:
   - Change host to your actual domain

4. **Update image location** (if needed):
   - deployments/backend.yaml
   - deployments/frontend.yaml
   - Change `localhost:5000` to your registry

## Deployment Order (if doing manually)

1. namespace.yaml
2. secrets/
3. storage/
4. deployments/postgres.yaml + services/postgres-service.yaml
5. Wait for postgres ready
6. jobs/db-migration.yaml
7. deployments/backend.yaml + services/backend-service.yaml
8. deployments/frontend.yaml + services/frontend-service.yaml
9. ingress/

Or just use `./deploy.sh` - it handles the order automatically!
