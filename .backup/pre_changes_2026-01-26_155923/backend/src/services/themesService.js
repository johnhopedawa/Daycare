const pool = require('../db/pool');

const getAllThemes = async (client) => {
  const runner = client || pool;
  const result = await runner.query(
    'SELECT * FROM themes ORDER BY id ASC'
  );
  return result.rows;
};

const getThemeById = async (client, id) => {
  const runner = client || pool;
  const result = await runner.query(
    'SELECT * FROM themes WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
};

const getActiveTheme = async (client) => {
  const runner = client || pool;
  const settingsResult = await runner.query(
    'SELECT theme_id FROM daycare_settings WHERE id = 1'
  );
  const themeId = settingsResult.rows[0]?.theme_id || 1;
  const themeResult = await runner.query(
    'SELECT * FROM themes WHERE id = $1',
    [themeId]
  );

  if (themeResult.rows.length > 0) {
    return themeResult.rows[0];
  }

  const fallbackResult = await runner.query(
    'SELECT * FROM themes ORDER BY id ASC LIMIT 1'
  );
  return fallbackResult.rows[0] || null;
};

module.exports = {
  getAllThemes,
  getThemeById,
  getActiveTheme,
};
