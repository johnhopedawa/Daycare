#!/bin/bash

set -e

echo "=========================================="
echo "Daycare Management System - K8s Deployment"
echo "=========================================="
echo ""

# Configuration
REGISTRY=${REGISTRY:-"localhost:5000"}
BACKEND_IMAGE="$REGISTRY/daycare-backend:latest"
FRONTEND_IMAGE="$REGISTRY/daycare-frontend:latest"
K8S_DIR="$(cd "$(dirname "$0")" && pwd)"

# Parse command line arguments
SKIP_BUILD=false

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --skip-build) SKIP_BUILD=true ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

# Build images
if [ "$SKIP_BUILD" = false ]; then
    echo "Building Docker images..."

    echo "Building backend..."
    cd "$K8S_DIR/.."
    docker build -t $BACKEND_IMAGE ./backend

    echo "Building frontend..."
    docker build -t $FRONTEND_IMAGE ./frontend

    echo ""
    echo "Pushing images to registry..."
    docker push $BACKEND_IMAGE
    docker push $FRONTEND_IMAGE

    echo "Images built and pushed successfully!"
    echo ""
else
    echo "Skipping image build (--skip-build flag)"
    echo ""
fi

# Apply Kubernetes manifests in order
echo "Deploying to Kubernetes..."
echo ""

echo "1. Creating secrets..."
kubectl apply -f "$K8S_DIR/secrets/"

echo "2. Creating storage..."
kubectl apply -f "$K8S_DIR/storage/"

echo "3. Deploying PostgreSQL..."
kubectl apply -f "$K8S_DIR/deployments/postgres.yaml"
kubectl apply -f "$K8S_DIR/services/postgres-service.yaml"

echo "Waiting for PostgreSQL to be ready..."
kubectl wait --for=condition=ready pod -l app=postgres --timeout=300s

echo "4. Running database migrations..."
kubectl delete job db-migration --ignore-not-found=true
kubectl apply -f "$K8S_DIR/jobs/db-migration.yaml"
kubectl wait --for=condition=complete job/db-migration --timeout=300s

echo "5. Deploying backend..."
kubectl apply -f "$K8S_DIR/deployments/backend.yaml"
kubectl apply -f "$K8S_DIR/services/backend-service.yaml"

echo "6. Deploying frontend..."
kubectl apply -f "$K8S_DIR/deployments/frontend.yaml"
kubectl apply -f "$K8S_DIR/services/frontend-service.yaml"

echo "Waiting for deployments to be ready..."
kubectl wait --for=condition=available deployment/backend --timeout=300s
kubectl wait --for=condition=available deployment/frontend --timeout=300s

echo "7. Deploying ingress..."
kubectl apply -f "$K8S_DIR/ingress/"

echo ""
echo "=========================================="
echo "Deployment completed successfully!"
echo "=========================================="
echo ""
echo "Your application should now be accessible at:"
echo "http://littlesparrowsacademy.com"
echo ""
echo "Useful commands:"
echo "  kubectl get pods"
echo "  kubectl logs -f deployment/backend"
echo "  kubectl logs -f deployment/frontend"
echo ""
echo "Don't forget to create your first admin user!"
echo ""
