const pool = require('./src/db/pool');

async function cleanupDatabase() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('Starting database cleanup...\n');

    // 1. Delete all families (children and parent relationships)
    const childrenResult = await client.query('DELETE FROM children RETURNING id');
    console.log(`✓ Deleted ${childrenResult.rowCount} children`);

    // 2. Delete all parent records
    const parentsResult = await client.query('DELETE FROM parents RETURNING id');
    console.log(`✓ Deleted ${parentsResult.rowCount} parent records`);

    // 3. Delete all user accounts EXCEPT admin@test.com and educator@test.com
    const usersResult = await client.query(`
      DELETE FROM users
      WHERE email NOT IN ('admin@test.com', 'educator@test.com')
      RETURNING email, role
    `);
    console.log(`✓ Deleted ${usersResult.rowCount} user accounts:`);
    usersResult.rows.forEach(user => {
      console.log(`  - ${user.email} (${user.role})`);
    });

    // 4. Show remaining accounts
    const remainingUsers = await client.query(`
      SELECT email, role, is_active
      FROM users
      ORDER BY role, email
    `);
    console.log(`\n✓ Remaining user accounts (${remainingUsers.rowCount}):`);
    remainingUsers.rows.forEach(user => {
      console.log(`  - ${user.email} (${user.role}) - ${user.is_active ? 'Active' : 'Inactive'}`);
    });

    // 5. Clean up related records
    const timeEntriesResult = await client.query(`
      DELETE FROM time_entries
      WHERE user_id NOT IN (SELECT id FROM users)
      RETURNING id
    `);
    console.log(`\n✓ Cleaned up ${timeEntriesResult.rowCount} orphaned time entries`);

    const invoicesResult = await client.query(`
      DELETE FROM invoices
      WHERE user_id NOT IN (SELECT id FROM users)
      RETURNING id
    `);
    console.log(`✓ Cleaned up ${invoicesResult.rowCount} orphaned invoices`);

    const payoutsResult = await client.query(`
      DELETE FROM payouts
      WHERE user_id NOT IN (SELECT id FROM users)
      RETURNING id
    `);
    console.log(`✓ Cleaned up ${payoutsResult.rowCount} orphaned payouts`);

    const paystubsResult = await client.query(`
      DELETE FROM paystubs
      WHERE user_id NOT IN (SELECT id FROM users)
      RETURNING id
    `);
    console.log(`✓ Cleaned up ${paystubsResult.rowCount} orphaned paystubs`);

    await client.query('COMMIT');
    console.log('\n✅ Database cleanup completed successfully!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

cleanupDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed to cleanup database:', error);
    process.exit(1);
  });
