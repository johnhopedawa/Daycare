-- Migration 015: Themes and theme selection

CREATE TABLE IF NOT EXISTS themes (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  palette JSONB NOT NULL,
  fonts JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE daycare_settings
  ADD COLUMN IF NOT EXISTS theme_id INTEGER REFERENCES themes(id);

INSERT INTO themes (id, name, slug, description, palette, fonts)
VALUES (
  1,
  'Default',
  'default',
  'Current system theme',
  '{
    "primary": "#FF9B85",
    "primary_dark": "#E07A5F",
    "accent": "#FFE5D9",
    "background": "#FFF8F3",
    "surface": "#FFFFFF",
    "text": "#1C1917",
    "muted": "#78716C",
    "border": "#FFE5D9",
    "on_primary": "#FFFFFF",
    "on_accent": "#7A3B2A",
    "card_colors": ["#E5D4ED", "#B8E6D5", "#FFF4CC", "#FFDCC8"],
    "card_text_colors": ["#44403C", "#44403C", "#44403C", "#44403C"]
  }'::jsonb,
  '{
    "heading": "Quicksand",
    "body": "Inter",
    "import_url": "https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap"
  }'::jsonb
)
ON CONFLICT (id) DO NOTHING;

UPDATE daycare_settings
SET theme_id = COALESCE(theme_id, 1);
