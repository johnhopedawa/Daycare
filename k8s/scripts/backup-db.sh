#!/usr/bin/env bash
set -euo pipefail

# Back up Postgres to a local encrypted file.
# Example:
#   ./scripts/backup-db.sh
#   ./scripts/backup-db.sh /path/to/backups
# Optional env:
#   NAMESPACE=littlesparrows DB_USER=daycare DB_NAME=daycare BACKUP_PASSPHRASE=...

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${1:-$SCRIPT_DIR/../backups}"
NAMESPACE="${NAMESPACE:-littlesparrows}"
DB_USER="${DB_USER:-daycare}"
DB_NAME="${DB_NAME:-daycare}"

mkdir -p "$BACKUP_DIR"

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
  read -r -s -p "Confirm passphrase: " BACKUP_PASSPHRASE_CONFIRM
  echo ""
  if [[ "$BACKUP_PASSPHRASE" != "$BACKUP_PASSPHRASE_CONFIRM" ]]; then
    echo "Passphrases do not match."
    exit 1
  fi
fi

POD=$(kubectl -n "$NAMESPACE" get pods -l app=postgres -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)
if [[ -z "$POD" ]]; then
  echo "No postgres pod found in namespace $NAMESPACE"
  exit 1
fi

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
OUT_FILE="$BACKUP_DIR/daycare_${TIMESTAMP}.sql.gz.enc"

export BACKUP_PASSPHRASE

echo "Creating encrypted backup: $OUT_FILE"
kubectl -n "$NAMESPACE" exec -t "$POD" -- \
  pg_dump -U "$DB_USER" "$DB_NAME" | \
  gzip | \
  openssl enc -aes-256-cbc -pbkdf2 -salt -pass env:BACKUP_PASSPHRASE -out "$OUT_FILE"

echo "Backup complete."
