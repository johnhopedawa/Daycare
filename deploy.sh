#!/bin/bash

set -e

echo "=========================================="
echo "Daycare Management System - Deployment"
echo "=========================================="
echo ""

# Configuration
REGISTRY=${REGISTRY:-"localhost:5000"}
BACKEND_IMAGE="$REGISTRY/daycare-backend:latest"
FRONTEND_IMAGE="$REGISTRY/daycare-frontend:latest"

# Parse command line arguments
SKIP_BUILD=false
LOCAL_DEV=false

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --skip-build) SKIP_BUILD=true ;;
        --local) LOCAL_DEV=true ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

# Local development with docker-compose
if [ "$LOCAL_DEV" = true ]; then
    echo "Starting local development environment..."

    if [ ! -f .env ]; then
        echo "Creating .env from .env.example..."
        cp .env.example .env
    fi

    echo "Building and starting services with docker-compose..."
    docker-compose up --build -d

    echo ""
    echo "Waiting for services to be healthy..."
    sleep 10

    echo ""
    echo "Local development environment is ready!"
    echo "Frontend: http://localhost:3000"
    echo "Backend API: http://localhost:5000"
    echo ""
    echo "To view logs: docker-compose logs -f"
    echo "To stop: docker-compose down"
    exit 0
fi

# K8s deployment
echo "Deploying to Kubernetes..."
echo ""

# Build images
if [ "$SKIP_BUILD" = false ]; then
    echo "Building Docker images..."

    echo "Building backend..."
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

# Apply Kubernetes manifests
echo "Applying Kubernetes manifests..."

echo "Creating namespace..."
kubectl apply -f k8s/namespace.yaml

echo "Creating secrets..."
kubectl apply -f k8s/secrets.yaml

echo "Deploying PostgreSQL..."
kubectl apply -f k8s/postgres.yaml

echo "Waiting for PostgreSQL to be ready..."
kubectl wait --for=condition=ready pod -l app=postgres -n daycare --timeout=300s

echo "Running database migrations..."
kubectl delete job db-migration -n daycare --ignore-not-found=true
kubectl apply -f k8s/init-job.yaml
kubectl wait --for=condition=complete job/db-migration -n daycare --timeout=300s

echo "Deploying backend..."
kubectl apply -f k8s/backend.yaml

echo "Deploying frontend..."
kubectl apply -f k8s/frontend.yaml

echo "Waiting for deployments to be ready..."
kubectl wait --for=condition=available deployment/backend -n daycare --timeout=300s
kubectl wait --for=condition=available deployment/frontend -n daycare --timeout=300s

echo "Deploying ingress..."
kubectl apply -f k8s/ingress.yaml

echo ""
echo "=========================================="
echo "Deployment completed successfully!"
echo "=========================================="
echo ""
echo "Your application should now be accessible at:"
echo "http://sistersdomain.com (update with your actual domain)"
echo ""
echo "Useful commands:"
echo "  kubectl get pods -n daycare"
echo "  kubectl logs -f deployment/backend -n daycare"
echo "  kubectl logs -f deployment/frontend -n daycare"
echo ""
echo "Don't forget to create your first admin user!"
echo "See k8s/README.md for instructions."
echo ""
