#!/bin/bash

# Delete all resources
# Usage: ./delete-all.sh

set -e

K8S_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Deleting all Kubernetes resources..."

kubectl delete -f "$K8S_DIR/ingress/" --ignore-not-found=true
kubectl delete -f "$K8S_DIR/services/" --ignore-not-found=true
kubectl delete -f "$K8S_DIR/deployments/" --ignore-not-found=true
kubectl delete -f "$K8S_DIR/jobs/" --ignore-not-found=true
kubectl delete -f "$K8S_DIR/storage/" --ignore-not-found=true
kubectl delete -f "$K8S_DIR/secrets/" --ignore-not-found=true

echo ""
echo "All resources deleted!"
