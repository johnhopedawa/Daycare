-- Migration: Add leave tracking and update scheduling

-- Add leave tracking columns to users table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='annual_sick_days') THEN
    ALTER TABLE users ADD COLUMN annual_sick_days DECIMAL(7,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='annual_vacation_days') THEN
    ALTER TABLE users ADD COLUMN annual_vacation_days DECIMAL(7,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='sick_days_remaining') THEN
    ALTER TABLE users ADD COLUMN sick_days_remaining DECIMAL(7,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='vacation_days_remaining') THEN
    ALTER TABLE users ADD COLUMN vacation_days_remaining DECIMAL(7,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='carryover_enabled') THEN
    ALTER TABLE users ADD COLUMN carryover_enabled BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='date_employed') THEN
    ALTER TABLE users ADD COLUMN date_employed DATE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='ytd_gross') THEN
    ALTER TABLE users ADD COLUMN ytd_gross DECIMAL(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='ytd_cpp') THEN
    ALTER TABLE users ADD COLUMN ytd_cpp DECIMAL(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='ytd_ei') THEN
    ALTER TABLE users ADD COLUMN ytd_ei DECIMAL(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='ytd_tax') THEN
    ALTER TABLE users ADD COLUMN ytd_tax DECIMAL(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='ytd_hours') THEN
    ALTER TABLE users ADD COLUMN ytd_hours DECIMAL(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='sin') THEN
    ALTER TABLE users ADD COLUMN sin VARCHAR(11);
  END IF;
END $$;

-- Add decline_type column to schedules table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='schedules' AND column_name='decline_type') THEN
    ALTER TABLE schedules ADD COLUMN decline_type VARCHAR(20) CHECK (decline_type IN ('SICK_DAY', 'VACATION_DAY', 'UNPAID'));
  END IF;
END $$;

-- Change default status for new schedules to ACCEPTED
ALTER TABLE schedules ALTER COLUMN status SET DEFAULT 'ACCEPTED';

-- Update existing PENDING schedules to ACCEPTED (admin-created are auto-accepted)
UPDATE schedules SET status = 'ACCEPTED' WHERE status = 'PENDING';
