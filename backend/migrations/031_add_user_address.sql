DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'address_line1'
  ) THEN
    ALTER TABLE users ADD COLUMN address_line1 VARCHAR(255);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'address_line2'
  ) THEN
    ALTER TABLE users ADD COLUMN address_line2 VARCHAR(255);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'city'
  ) THEN
    ALTER TABLE users ADD COLUMN city VARCHAR(100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'province'
  ) THEN
    ALTER TABLE users ADD COLUMN province VARCHAR(100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'postal_code'
  ) THEN
    ALTER TABLE users ADD COLUMN postal_code VARCHAR(20);
  END IF;
END $$;
