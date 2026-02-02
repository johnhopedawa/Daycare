#!/usr/bin/env bash
set -euo pipefail

# Restore Postgres from a local encrypted backup file.
# Example:
#   ./scripts/restore-db.sh /path/to/backup.sql.gz.enc
# Optional env:
#   NAMESPACE=littlesparrows DB_USER=daycare DB_NAME=daycare BACKUP_PASSPHRASE=...

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <backup-file.sql.gz.enc>"
  exit 1
fi

BACKUP_FILE="$1"
NAMESPACE="${NAMESPACE:-littlesparrows}"
DB_USER="${DB_USER:-daycare}"
DB_NAME="${DB_NAME:-daycare}"

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "Backup file not found: $BACKUP_FILE"
  exit 1
fi

if ! command -v kubectl >/dev/null 2>&1; then
  echo "kubectl not found in PATH"
  exit 1
fi

if ! command -v openssl >/dev/null 2>&1; then
  echo "openssl not found in PATH"
  exit 1
fi

if [[ -z "${BACKUP_PASSPHRASE:-}" ]]; then
  read -r -s -p "Encryption passphrase: " BACKUP_PASSPHRASE
  echo ""
fi

echo "This will restore into database '$DB_NAME' in namespace '$NAMESPACE'."
read -r -p "Type RESTORE to continue: " CONFIRM
if [[ "$CONFIRM" != "RESTORE" ]]; then
  echo "Aborted."
  exit 1
fi

POD=$(kubectl -n "$NAMESPACE" get pods -l app=postgres -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)
if [[ -z "$POD" ]]; then
  echo "No postgres pod found in namespace $NAMESPACE"
  exit 1
fi

export BACKUP_PASSPHRASE

echo "Restoring from $BACKUP_FILE..."
openssl enc -d -aes-256-cbc -pbkdf2 -salt -pass env:BACKUP_PASSPHRASE -in "$BACKUP_FILE" | \
  gunzip | \
  kubectl -n "$NAMESPACE" exec -i "$POD" -- psql -U "$DB_USER" "$DB_NAME"

echo "Restore complete."
