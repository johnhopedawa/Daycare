ALTER TABLE users
ADD COLUMN IF NOT EXISTS employment_type VARCHAR(20)
CHECK (employment_type IN ('FULL_TIME', 'PART_TIME'));
