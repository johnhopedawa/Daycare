#!/bin/bash

# Quick apply all manifests
# Usage: ./apply-all.sh

set -e

K8S_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Applying all Kubernetes manifests..."

kubectl apply -f "$K8S_DIR/secrets/"
kubectl apply -f "$K8S_DIR/storage/"
kubectl apply -f "$K8S_DIR/deployments/"
kubectl apply -f "$K8S_DIR/services/"
kubectl apply -f "$K8S_DIR/ingress/"

echo ""
echo "All manifests applied!"
echo ""
echo "Check status with:"
echo "  kubectl get all"
