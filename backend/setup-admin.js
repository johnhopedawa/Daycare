const pool = require('./src/db/pool');
const bcrypt = require('bcryptjs');

async function setupAdmin() {
  try {
    const passwordHash = await bcrypt.hash('admin123', 10);

    await pool.query(
      `UPDATE users SET password_hash = $1 WHERE email = 'admin@example.com'`,
      [passwordHash]
    );

    console.log('✅ Admin password updated to: admin123');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

setupAdmin();
