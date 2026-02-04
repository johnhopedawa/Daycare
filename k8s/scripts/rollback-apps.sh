#!/usr/bin/env bash
set -euo pipefail

NAMESPACE="${NAMESPACE:-littlesparrows}"
DEPLOYMENTS=(backend frontend firefly)
WAIT=false

for arg in "$@"; do
  case "$arg" in
    --wait) WAIT=true ;;
  esac
done

echo "Rolling back deployments in namespace: ${NAMESPACE}"

for deployment in "${DEPLOYMENTS[@]}"; do
  if kubectl -n "$NAMESPACE" get deployment "$deployment" >/dev/null 2>&1; then
    echo "Rolling back ${deployment}..."
    kubectl -n "$NAMESPACE" rollout undo "deployment/${deployment}"
    if [ "$WAIT" = true ]; then
      kubectl -n "$NAMESPACE" rollout status "deployment/${deployment}"
    fi
  else
    echo "Skipping ${deployment} (not found)"
  fi
done

echo "Rollback complete."
