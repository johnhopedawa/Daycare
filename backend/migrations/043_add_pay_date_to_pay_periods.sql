ALTER TABLE pay_periods
ADD COLUMN IF NOT EXISTS pay_date DATE;

UPDATE pay_periods
SET pay_date = end_date
WHERE pay_date IS NULL;

ALTER TABLE pay_periods
ALTER COLUMN pay_date SET NOT NULL;
