-- Migration 016: Seed additional themes (Ocean Breeze, Forest Garden, Sunset Warmth, Berry Bright)

-- Each theme includes: primary, primary_dark, accent, background, surface, text, muted, border, on_primary, on_accent
-- card_colors: array of 4 background colors for dashboard cards
-- card_text_colors: array of 4 contrasting text colors for dashboard cards

-- Ocean Breeze theme
INSERT INTO themes (id, name, slug, description, palette, fonts)
VALUES (
  2,
  'Ocean Breeze',
  'ocean-breeze',
  'Calm, trustworthy, fresh - crisp white with subtle blue-gray undertones',
  '{
    "primary": "#87CEEB",
    "primary_dark": "#5BA3C6",
    "accent": "#9FE2BF",
    "background": "#F8FAFC",
    "surface": "#FFFFFF",
    "text": "#1E3A5F",
    "muted": "#6B8299",
    "border": "#B8D4E8",
    "on_primary": "#FFFFFF",
    "on_accent": "#1E3A5F",
    "card_colors": ["#9FE2BF", "#6CB4EE", "#7FCDCD", "#F5DEB3"],
    "card_text_colors": ["#1E3A5F", "#1E3A5F", "#1E3A5F", "#44403C"]
  }'::jsonb,
  '{
    "heading": "Quicksand",
    "body": "Inter",
    "import_url": "https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap"
  }'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Forest Garden theme
INSERT INTO themes (id, name, slug, description, palette, fonts)
VALUES (
  3,
  'Forest Garden',
  'forest-garden',
  'Organic, nurturing - natural earthy tones',
  '{
    "primary": "#B2C9AB",
    "primary_dark": "#8BA882",
    "accent": "#E07A5F",
    "background": "#FAF8F3",
    "surface": "#FFFFFF",
    "text": "#2D3B2D",
    "muted": "#6B7B6B",
    "border": "#D4DFD0",
    "on_primary": "#FFFFFF",
    "on_accent": "#FFFFFF",
    "card_colors": ["#A8B89F", "#E07A5F", "#F4E1C1", "#D4A5A5"],
    "card_text_colors": ["#2D3B2D", "#FFFFFF", "#44403C", "#44403C"]
  }'::jsonb,
  '{
    "heading": "Quicksand",
    "body": "Inter",
    "import_url": "https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap"
  }'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Sunset Warmth theme
INSERT INTO themes (id, name, slug, description, palette, fonts)
VALUES (
  4,
  'Sunset Warmth',
  'sunset-warmth',
  'Welcoming, energetic - soft ivory with warm undertones',
  '{
    "primary": "#FF9B85",
    "primary_dark": "#E07A5F",
    "accent": "#FFB347",
    "background": "#FFFAF5",
    "surface": "#FFFFFF",
    "text": "#3D2C29",
    "muted": "#8B7355",
    "border": "#FFE0CC",
    "on_primary": "#FFFFFF",
    "on_accent": "#3D2C29",
    "card_colors": ["#FFB347", "#FBCEB1", "#E8927C", "#F0C987"],
    "card_text_colors": ["#44403C", "#44403C", "#FFFFFF", "#44403C"]
  }'::jsonb,
  '{
    "heading": "Quicksand",
    "body": "Inter",
    "import_url": "https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap"
  }'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Berry Bright theme
INSERT INTO themes (id, name, slug, description, palette, fonts)
VALUES (
  5,
  'Berry Bright',
  'berry-bright',
  'Creative, confident - playful berry tones',
  '{
    "primary": "#9B6B9E",
    "primary_dark": "#7A5080",
    "accent": "#E85D75",
    "background": "#F5F3F7",
    "surface": "#FFFFFF",
    "text": "#2D1F3D",
    "muted": "#7A6B8A",
    "border": "#E0D6E8",
    "on_primary": "#FFFFFF",
    "on_accent": "#FFFFFF",
    "card_colors": ["#E85D75", "#C5A3D9", "#F4C2C2", "#CCCCFF"],
    "card_text_colors": ["#FFFFFF", "#2D1F3D", "#44403C", "#2D1F3D"]
  }'::jsonb,
  '{
    "heading": "Quicksand",
    "body": "Inter",
    "import_url": "https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap"
  }'::jsonb
)
ON CONFLICT (id) DO NOTHING;
