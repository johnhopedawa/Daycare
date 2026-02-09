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

const getActiveTheme = async (client, options = {}) => {
  const runner = client || pool;
  const normalizedRole = String(options.role || '').toUpperCase();
  const settingsResult = await runner.query(
    'SELECT theme_id, parent_theme_id FROM daycare_settings WHERE id = 1'
  );
  const settings = settingsResult.rows[0] || {};
  const defaultThemeId = settings.theme_id || 1;
  const themeId = normalizedRole === 'PARENT'
    ? (settings.parent_theme_id || defaultThemeId)
    : defaultThemeId;
  const themeResult = await getThemeById(runner, themeId);

  if (themeResult) {
    return themeResult;
  }

  const fallbackResult = await runner.query(
    'SELECT * FROM themes ORDER BY id ASC LIMIT 1'
  );
  return fallbackResult.rows[0] || null;
};

const updateThemeById = async (client, id, updates) => {
  const runner = client || pool;
  const fields = [];
  const values = [];

  const addField = (field, value, cast = '') => {
    values.push(value);
    const index = values.length;
    fields.push(`${field} = $${index}${cast}`);
  };

  if (Object.prototype.hasOwnProperty.call(updates, 'name')) {
    addField('name', updates.name);
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'slug')) {
    addField('slug', updates.slug);
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'description')) {
    addField('description', updates.description);
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'palette')) {
    addField('palette', JSON.stringify(updates.palette), '::jsonb');
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'fonts')) {
    addField('fonts', JSON.stringify(updates.fonts), '::jsonb');
  }

  if (fields.length === 0) {
    return getThemeById(runner, id);
  }

  values.push(id);
  const idIndex = values.length;
  const result = await runner.query(
    `UPDATE themes
     SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
     WHERE id = $${idIndex}
     RETURNING *`,
    values
  );

  return result.rows[0] || null;
};

module.exports = {
  getAllThemes,
  getThemeById,
  getActiveTheme,
  updateThemeById,
};
