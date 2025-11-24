const pool = require('./src/db/pool');

async function viewDatabase() {
  try {
    console.log('\n=== DATABASE CONTENTS ===\n');

    // View all users
    const users = await pool.query(`
      SELECT id, email, first_name, last_name, role, created_by, is_active, created_at
      FROM users
      ORDER BY role, created_at
    `);

    console.log('📊 USERS:');
    console.table(users.rows);

    // View schedules
    const schedules = await pool.query(`
      SELECT s.id, s.shift_date, s.start_time, s.end_time, s.hours, s.status,
             u.first_name || ' ' || u.last_name as educator
      FROM schedules s
      JOIN users u ON s.user_id = u.id
      ORDER BY s.shift_date DESC
      LIMIT 10
    `);

    console.log('\n📅 RECENT SCHEDULES (last 10):');
    console.table(schedules.rows);

    // View time entries
    const entries = await pool.query(`
      SELECT te.id, te.entry_date, te.total_hours, te.status,
             u.first_name || ' ' || u.last_name as educator
      FROM time_entries te
      JOIN users u ON te.user_id = u.id
      ORDER BY te.entry_date DESC
      LIMIT 10
    `);

    console.log('\n⏰ RECENT TIME ENTRIES (last 10):');
    console.table(entries.rows);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

viewDatabase();
