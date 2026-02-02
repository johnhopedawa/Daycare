#!/usr/bin/env bash
set -euo pipefail

# Example usage:
#   ./scripts/create-admin.sh admin@littlesparrowsacademy.com "TempPassword123" "Admin" "User"
# Optional: override namespace with NAMESPACE=your-namespace

NAMESPACE="${NAMESPACE:-littlesparrows}"

EMAIL="${1:-}"
PASSWORD="${2:-}"
FIRST_NAME="${3:-Admin}"
LAST_NAME="${4:-User}"

if [[ -z "$EMAIL" ]]; then
  echo "Usage: $0 <email> <initial_password> [first_name] [last_name]"
  exit 1
fi

if [[ -z "$PASSWORD" ]]; then
  read -r -s -p "Initial password: " PASSWORD
  echo ""
fi

POD=$(kubectl -n "$NAMESPACE" get pods -l app=backend -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)
if [[ -z "$POD" ]]; then
  echo "No backend pod found in namespace $NAMESPACE"
  exit 1
fi

kubectl -n "$NAMESPACE" exec -i "$POD" -- env \
  ADMIN_EMAIL="$EMAIL" \
  ADMIN_PASSWORD="$PASSWORD" \
  ADMIN_FIRST="$FIRST_NAME" \
  ADMIN_LAST="$LAST_NAME" \
  node -e '
const bcrypt = require("bcryptjs");
const pool = require("./src/db/pool");

(async () => {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const first = process.env.ADMIN_FIRST || "Admin";
  const last = process.env.ADMIN_LAST || "User";

  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
  if (existing.rows.length) {
    console.log("User already exists with id:", existing.rows[0].id);
    process.exit(0);
  }

  const hash = await bcrypt.hash(password, 10);
  const res = await pool.query(
    "INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5) RETURNING id",
    [email, hash, first, last, "ADMIN"]
  );

  console.log("Admin created:", res.rows[0].id);
  process.exit(0);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
'
