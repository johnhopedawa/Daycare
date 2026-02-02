-- Migration: Set default leave balances for existing educators

-- Update any NULL values to 0 for existing users
UPDATE users
SET
  annual_sick_days = COALESCE(annual_sick_days, 0),
  annual_vacation_days = COALESCE(annual_vacation_days, 0),
  sick_days_remaining = COALESCE(sick_days_remaining, 0),
  vacation_days_remaining = COALESCE(vacation_days_remaining, 0),
  carryover_enabled = COALESCE(carryover_enabled, FALSE),
  ytd_gross = COALESCE(ytd_gross, 0),
  ytd_cpp = COALESCE(ytd_cpp, 0),
  ytd_ei = COALESCE(ytd_ei, 0),
  ytd_tax = COALESCE(ytd_tax, 0),
  ytd_hours = COALESCE(ytd_hours, 0)
WHERE role = 'EDUCATOR';
