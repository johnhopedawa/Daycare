const pool = require('./src/db/pool');
const fs = require('fs');
const path = require('path');

async function migrate() {
  const client = await pool.connect();

  try {
    console.log('Running database migration...');

    await client.query('BEGIN');

    // First, create all tables using the schema file
    const schema = fs.readFileSync('./src/db/schema.sql', 'utf-8');
    await client.query(schema);

    // Run migration scripts in order
    const migrationsDir = path.join(__dirname, 'migrations');
    if (fs.existsSync(migrationsDir)) {
      const migrationFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

      for (const file of migrationFiles) {
        console.log(`Running migration: ${file}`);
        const migrationSQL = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
        await client.query(migrationSQL);
        console.log(`✓ ${file} completed`);
      }
    }

    await client.query('COMMIT');

    console.log('✓ Database migrated successfully!');
    console.log('✓ All tables created');
    console.log('✓ All indexes created');
    console.log('✓ All migrations applied');

    process.exit(0);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration error:', error);
    process.exit(1);
  } finally {
    client.release();
  }
}

migrate();
