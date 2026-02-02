-- Migration: Add waitlist priority field to children table

-- Add waitlist_priority field
ALTER TABLE children ADD COLUMN IF NOT EXISTS waitlist_priority INTEGER;

-- Create index for efficient waitlist queries
CREATE INDEX IF NOT EXISTS idx_children_waitlist_priority ON children(waitlist_priority) WHERE status = 'WAITLIST';

-- Add comment explaining the field
COMMENT ON COLUMN children.waitlist_priority IS 'Priority position for children on waitlist (1 = first in line, 2 = second, etc.). NULL for non-waitlist children.';
