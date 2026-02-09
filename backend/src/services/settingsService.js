const pool = require('../db/pool');

const getDaycareSettings = async (client) => {
  const runner = client || pool;
  const result = await runner.query(
    'SELECT * FROM daycare_settings WHERE id = 1'
  );

  if (result.rows.length > 0) {
    return result.rows[0];
  }

  const insertResult = await runner.query(
    `INSERT INTO daycare_settings (id, tax_rate, tax_enabled, theme_id, parent_theme_id)
     VALUES (1, 0.05, true, 1, 1)
     RETURNING *`
  );

  return insertResult.rows[0];
};

module.exports = { getDaycareSettings };
