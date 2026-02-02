-- Migration 017: Backfill theme card colors for existing rows

UPDATE themes
SET palette = palette || '{
  "card_colors": ["#E5D4ED", "#B8E6D5", "#FFF4CC", "#FFDCC8"],
  "card_text_colors": ["#44403C", "#44403C", "#44403C", "#44403C"]
}'::jsonb
WHERE slug = 'default'
  AND (palette->'card_colors' IS NULL OR jsonb_array_length(palette->'card_colors') = 0);

UPDATE themes
SET palette = palette || '{
  "card_colors": ["#9FE2BF", "#6CB4EE", "#7FCDCD", "#F5DEB3"],
  "card_text_colors": ["#1E3A5F", "#1E3A5F", "#1E3A5F", "#44403C"]
}'::jsonb
WHERE slug = 'ocean-breeze'
  AND (palette->'card_colors' IS NULL OR jsonb_array_length(palette->'card_colors') = 0);

UPDATE themes
SET palette = palette || '{
  "card_colors": ["#A8B89F", "#E07A5F", "#F4E1C1", "#D4A5A5"],
  "card_text_colors": ["#2D3B2D", "#FFFFFF", "#44403C", "#44403C"]
}'::jsonb
WHERE slug = 'forest-garden'
  AND (palette->'card_colors' IS NULL OR jsonb_array_length(palette->'card_colors') = 0);

UPDATE themes
SET palette = palette || '{
  "card_colors": ["#FFB347", "#FBCEB1", "#E8927C", "#F0C987"],
  "card_text_colors": ["#44403C", "#44403C", "#FFFFFF", "#44403C"]
}'::jsonb
WHERE slug = 'sunset-warmth'
  AND (palette->'card_colors' IS NULL OR jsonb_array_length(palette->'card_colors') = 0);

UPDATE themes
SET palette = palette || '{
  "card_colors": ["#E85D75", "#C5A3D9", "#F4C2C2", "#CCCCFF"],
  "card_text_colors": ["#FFFFFF", "#2D1F3D", "#44403C", "#2D1F3D"]
}'::jsonb
WHERE slug = 'berry-bright'
  AND (palette->'card_colors' IS NULL OR jsonb_array_length(palette->'card_colors') = 0);
