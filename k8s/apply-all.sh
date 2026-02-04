#!/bin/bash

# Quick apply all manifests
# Usage: ./apply-all.sh

set -e

K8S_DIR="$(cd "$(dirname "$0")" && pwd)"
NAMESPACE="littlesparrows"

echo "Applying all Kubernetes manifests..."

kubectl apply -f "$K8S_DIR/namespace.yaml"

CF_CERT="$K8S_DIR/secrets/cf-origin.crt"
CF_KEY="$K8S_DIR/secrets/cf-origin.key"
if [[ -f "$CF_CERT" && -f "$CF_KEY" ]]; then
  echo "Applying Cloudflare origin TLS secret..."
  kubectl -n "$NAMESPACE" create secret tls cloudflare-origin-tls \
    --cert="$CF_CERT" \
    --key="$CF_KEY" \
    --dry-run=client -o yaml | kubectl apply -f -
else
  echo "Cloudflare origin cert/key not found; skipping TLS secret."
fi

kubectl apply -f "$K8S_DIR/secrets/"
kubectl apply -f "$K8S_DIR/storage/"

kubectl apply -f "$K8S_DIR/deployments/postgres.yaml"
kubectl apply -f "$K8S_DIR/services/postgres-service.yaml"

echo "Waiting for PostgreSQL to be ready..."
kubectl -n "$NAMESPACE" wait --for=condition=ready pod -l app=postgres --timeout=300s

echo "Running database migrations..."
kubectl -n "$NAMESPACE" delete job db-migration --ignore-not-found=true
kubectl apply -f "$K8S_DIR/jobs/db-migration.yaml"
kubectl -n "$NAMESPACE" wait --for=condition=complete job/db-migration --timeout=300s

kubectl apply -f "$K8S_DIR/deployments/backend.yaml"
kubectl apply -f "$K8S_DIR/services/backend-service.yaml"
kubectl apply -f "$K8S_DIR/deployments/frontend.yaml"
kubectl apply -f "$K8S_DIR/services/frontend-service.yaml"
kubectl apply -f "$K8S_DIR/deployments/firefly.yaml"
kubectl apply -f "$K8S_DIR/services/firefly-service.yaml"

echo "Waiting for deployments to be ready..."
kubectl -n "$NAMESPACE" wait --for=condition=available deployment/backend --timeout=300s
kubectl -n "$NAMESPACE" wait --for=condition=available deployment/frontend --timeout=300s
kubectl -n "$NAMESPACE" wait --for=condition=available deployment/firefly --timeout=300s

kubectl apply -f "$K8S_DIR/ingress/"

echo ""
echo "All manifests applied!"
echo ""
echo "Check status with:"
echo "  kubectl -n $NAMESPACE get all"
