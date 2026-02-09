#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
K8S_DIR="$SCRIPT_DIR/k8s"
NAMESPACE="${NAMESPACE:-littlesparrows}"

"$K8S_DIR/apply-all.sh" "$@"

echo "Ensuring frontend imagePullPolicy is Always..."
kubectl -n "$NAMESPACE" patch deployment frontend --type='merge' -p \
  '{"spec":{"template":{"spec":{"containers":[{"name":"frontend","imagePullPolicy":"Always"}]}}}}'

echo "Restarting frontend so latest image is pulled..."
kubectl -n "$NAMESPACE" rollout restart deployment/frontend
kubectl -n "$NAMESPACE" rollout status deployment/frontend --timeout=300s
