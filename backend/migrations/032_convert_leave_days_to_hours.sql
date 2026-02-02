ALTER TABLE users
  ALTER COLUMN annual_sick_days TYPE DECIMAL(7,2)
  USING annual_sick_days::DECIMAL(7,2),
  ALTER COLUMN annual_vacation_days TYPE DECIMAL(7,2)
  USING annual_vacation_days::DECIMAL(7,2),
  ALTER COLUMN sick_days_remaining TYPE DECIMAL(7,2)
  USING sick_days_remaining::DECIMAL(7,2),
  ALTER COLUMN vacation_days_remaining TYPE DECIMAL(7,2)
  USING vacation_days_remaining::DECIMAL(7,2);
