#!/bin/bash

# Script to create an admin user
# Usage: ./scripts/create-admin.sh email@example.com password "First Name" "Last Name"

set -e

if [ "$#" -ne 4 ]; then
    echo "Usage: $0 <email> <password> <first_name> <last_name>"
    echo "Example: $0 admin@example.com mypassword Admin User"
    exit 1
fi

EMAIL=$1
PASSWORD=$2
FIRST_NAME=$3
LAST_NAME=$4

echo "Creating admin user: $EMAIL"

# Check if running in docker-compose or k8s
if docker-compose ps | grep -q "backend"; then
    echo "Detected docker-compose environment"

    docker-compose exec backend node -e "
    const bcrypt = require('bcryptjs');
    const pool = require('./src/db/pool');

    async function createAdmin() {
      const passwordHash = await bcrypt.hash('$PASSWORD', 10);

      try {
        const result = await pool.query(
          'INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES (\$1, \$2, \$3, \$4, \$5) RETURNING id',
          ['$EMAIL', passwordHash, '$FIRST_NAME', '$LAST_NAME', 'ADMIN']
        );

        console.log('Admin created successfully with ID:', result.rows[0].id);
        process.exit(0);
      } catch (err) {
        if (err.code === '23505') {
          console.error('Error: Email already exists');
        } else {
          console.error('Error:', err.message);
        }
        process.exit(1);
      }
    }

    createAdmin();
    "
elif kubectl get namespace daycare &> /dev/null; then
    echo "Detected Kubernetes environment"

    BACKEND_POD=$(kubectl get pods -n daycare -l app=backend -o jsonpath='{.items[0].metadata.name}')

    kubectl exec -it $BACKEND_POD -n daycare -- node -e "
    const bcrypt = require('bcryptjs');
    const pool = require('./src/db/pool');

    async function createAdmin() {
      const passwordHash = await bcrypt.hash('$PASSWORD', 10);

      try {
        const result = await pool.query(
          'INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES (\$1, \$2, \$3, \$4, \$5) RETURNING id',
          ['$EMAIL', passwordHash, '$FIRST_NAME', '$LAST_NAME', 'ADMIN']
        );

        console.log('Admin created successfully with ID:', result.rows[0].id);
        process.exit(0);
      } catch (err) {
        if (err.code === '23505') {
          console.error('Error: Email already exists');
        } else {
          console.error('Error:', err.message);
        }
        process.exit(1);
      }
    }

    createAdmin();
    "
else
    echo "Error: Could not detect environment (docker-compose or k8s)"
    exit 1
fi

echo "Done!"
