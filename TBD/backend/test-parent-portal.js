const pool = require('./src/db/pool');
const bcrypt = require('bcryptjs');

async function setupTestParent() {
  try {
    console.log('🧪 Setting up test parent account...\n');

    // First, get an admin user to use as creator
    const adminResult = await pool.query(
      "SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1"
    );

    if (adminResult.rows.length === 0) {
      console.log('❌ No admin user found. Please create an admin first.');
      process.exit(1);
    }

    const adminId = adminResult.rows[0].id;

    // Check if test parent already exists
    const existingParent = await pool.query(
      "SELECT id FROM parents WHERE email = 'test@parent.com'"
    );

    let parentId;

    if (existingParent.rows.length > 0) {
      console.log('✅ Test parent already exists');
      parentId = existingParent.rows[0].id;
    } else {
      // Create test parent
      const passwordHash = await bcrypt.hash('password123', 10);

      const parentResult = await pool.query(
        `INSERT INTO parents (first_name, last_name, email, phone, password_hash, is_active,
         address_line1, city, province, postal_code)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id`,
        ['John', 'Doe', 'test@parent.com', '555-1234', passwordHash, true,
         '123 Main St', 'Toronto', 'ON', 'M5H 2N2']
      );

      parentId = parentResult.rows[0].id;
      console.log(`✅ Created test parent (ID: ${parentId})`);
    }

    // Create test child if doesn't exist
    const existingChild = await pool.query(
      "SELECT id FROM children WHERE first_name = 'Emma' AND last_name = 'Doe'"
    );

    let childId;

    if (existingChild.rows.length > 0) {
      console.log('✅ Test child already exists');
      childId = existingChild.rows[0].id;
    } else {
      const childResult = await pool.query(
        `INSERT INTO children (first_name, last_name, date_of_birth, enrollment_start_date,
         status, monthly_rate, allergies, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        ['Emma', 'Doe', '2020-05-15', '2023-09-01', 'ACTIVE', 1200.00,
         'Peanuts', adminId]
      );

      childId = childResult.rows[0].id;
      console.log(`✅ Created test child (ID: ${childId})`);
    }

    // Link parent to child
    const existingLink = await pool.query(
      'SELECT 1 FROM parent_children WHERE parent_id = $1 AND child_id = $2',
      [parentId, childId]
    );

    if (existingLink.rows.length === 0) {
      await pool.query(
        `INSERT INTO parent_children (parent_id, child_id, relationship, is_primary_contact,
         can_pickup, has_billing_responsibility)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [parentId, childId, 'Parent', true, true, true]
      );
      console.log('✅ Linked parent to child');
    } else {
      console.log('✅ Parent-child link already exists');
    }

    // Create test invoice
    const existingInvoice = await pool.query(
      'SELECT id FROM parent_invoices WHERE parent_id = $1 LIMIT 1',
      [parentId]
    );

    if (existingInvoice.rows.length === 0) {
      const lineItems = [
        { description: 'Monthly Daycare Fee', quantity: 1, rate: 1200.00, amount: 1200.00 },
        { description: 'Lunch Program', quantity: 20, rate: 8.00, amount: 160.00 }
      ];

      await pool.query(
        `INSERT INTO parent_invoices (parent_id, child_id, invoice_number, invoice_date, due_date,
         line_items, subtotal, tax_rate, tax_amount, total_amount, balance_due, status, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [parentId, childId, 'INV-202511-001', '2025-11-01', '2025-11-15',
         JSON.stringify(lineItems), 1360.00, 0.13, 176.80, 1536.80, 1536.80, 'SENT', adminId]
      );
      console.log('✅ Created test invoice');
    } else {
      console.log('✅ Test invoice already exists');
    }

    // Create test message
    const existingMessage = await pool.query(
      'SELECT id FROM messages WHERE to_parent_id = $1 LIMIT 1',
      [parentId]
    );

    if (existingMessage.rows.length === 0) {
      await pool.query(
        `INSERT INTO messages (from_user_id, to_parent_id, subject, message, is_read, parent_read)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [adminId, parentId, 'Welcome!', 'Welcome to the parent portal!', false, false]
      );
      console.log('✅ Created test message');
    } else {
      console.log('✅ Test message already exists');
    }

    console.log('\n🎉 Test data setup complete!');
    console.log('\n📧 Test Login Credentials:');
    console.log('   Email: test@parent.com');
    console.log('   Password: password123');
    console.log('\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

setupTestParent();
