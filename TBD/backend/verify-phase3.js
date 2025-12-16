const pool = require('./src/db/pool');

async function verifyPhase3() {
  try {
    console.log('🔍 Verifying Phase 3 Database Schema...\n');

    // Check all Phase 3 tables
    const tables = ['children', 'parent_children', 'parent_invoices'];

    for (const table of tables) {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = $1
        );
      `, [table]);

      const exists = result.rows[0].exists;
      console.log(`${exists ? '✅' : '❌'} Table "${table}": ${exists ? 'EXISTS' : 'MISSING'}`);

      if (exists) {
        // Get column count
        const colResult = await pool.query(`
          SELECT COUNT(*) as count
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = $1
        `, [table]);
        console.log(`   └─ Columns: ${colResult.rows[0].count}`);
      }
    }

    // Check updated parents table
    console.log('\n📋 Checking parents table updates...');
    const parentCols = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'parents'
      AND column_name IN ('address_line1', 'password_hash', 'role')
      ORDER BY column_name
    `);

    const expectedCols = ['address_line1', 'password_hash', 'role'];
    expectedCols.forEach(col => {
      const found = parentCols.rows.find(r => r.column_name === col);
      console.log(`${found ? '✅' : '❌'} parents.${col}: ${found ? found.data_type : 'MISSING'}`);
    });

    // Check parent_payments.invoice_id
    console.log('\n📋 Checking parent_payments updates...');
    const invoiceIdCol = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'parent_payments'
      AND column_name = 'invoice_id'
    `);
    console.log(`${invoiceIdCol.rows.length > 0 ? '✅' : '❌'} parent_payments.invoice_id: ${invoiceIdCol.rows.length > 0 ? invoiceIdCol.rows[0].data_type : 'MISSING'}`);

    // Check indexes
    console.log('\n🔗 Checking indexes for new tables...');
    const indexes = await pool.query(`
      SELECT tablename, indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND tablename IN ('children', 'parent_children', 'parent_invoices')
      ORDER BY tablename, indexname
    `);

    console.log(`Found ${indexes.rows.length} indexes:`);
    indexes.rows.forEach(idx => {
      console.log(`   - ${idx.tablename}.${idx.indexname}`);
    });

    console.log('\n✅ Phase 3 verification complete!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  }
}

verifyPhase3();
