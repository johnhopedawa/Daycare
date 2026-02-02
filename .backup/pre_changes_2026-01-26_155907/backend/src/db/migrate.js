const fs = require('fs');
const path = require('path');
const pool = require('./pool');

async function migrate() {
  let started = false;
  try {
    console.log('Running database migrations...');

    const migrationsDir = path.join(__dirname, '..', '..', 'migrations');
    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    await pool.query('BEGIN');
    started = true;

    for (const file of migrationFiles) {
      console.log(`Running migration: ${file}`);
      const migrationSQL = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await pool.query(migrationSQL);
    }

    await pool.query('COMMIT');

    console.log('Migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    if (started) {
      await pool.query('ROLLBACK');
    }
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
