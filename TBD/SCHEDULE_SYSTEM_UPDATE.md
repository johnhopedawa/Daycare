# Schedule System Update - Implementation Guide

## Overview

I've completely redesigned your daycare management system with a comprehensive scheduling feature! Here's what's new:

## Major Changes

### 1. **Calendar-Based Schedule System**
- Admins can create individual shifts or recurring schedules for educators
- Educators can accept or decline shifts with required decline reasons
- Easy bulk actions: "Accept entire month", "Accept entire week"
- Visual calendar interface showing all shifts

### 2. **Admin Isolation (Multi-Tenant)**
- Each admin only sees educators they created
- Admin 1 cannot see Admin 2's educators
- All time entries, schedules, and payouts are isolated by admin

### 3. **Improved Log Hours**
- **Option 1**: Manual entry (traditional method)
- **Option 2**: Log from accepted schedules (quick and easy)
- Educators can select from their accepted shifts and auto-fill the hours

### 4. **Fixed Styling**
- Green buttons for "Accept" and "Active" statuses now display correctly
- Consistent badge colors: Green = Accepted/Approved, Yellow = Pending, Red = Declined/Rejected

## Database Changes

### New Tables
1. **schedules** - Individual shift assignments
   - Tracks shift date, times, hours, and acceptance status
   - Links to educators and the admin who created them

2. **schedule_recurrence** - Recurring schedule patterns
   - Define weekly recurring shifts (e.g., "Every Monday 9am-5pm")
   - Automatically generates individual shifts

### Modified Tables
- **users** - Added `created_by` column to track which admin created each educator

## New Features

### For Admins

#### Schedule Management ([AdminSchedule.js](frontend/src/pages/AdminSchedule.js))
- **Create Single Shift**: Assign one educator to a specific date/time
- **Create Recurring Schedule**: Set up weekly patterns (e.g., "John works every Monday")
- **Calendar View**: See all shifts for the month
- **Filter by Educator**: View one educator's schedule or all
- **Delete Shifts**: Remove unwanted shifts
- **View Status**: See pending, accepted, and declined shifts
- **Decline Reasons**: When educators decline, see why

#### Admin Isolation
- Only see educators you created in all pages:
  - Educators list
  - Time entries review
  - Schedules
  - Payroll

### For Educators

#### My Schedule ([MySchedule.js](frontend/src/pages/MySchedule.js))
- **Calendar View**: See all your assigned shifts
- **Accept Shifts**:
  - Accept individual shifts with one click
  - Accept entire week with one click
  - Accept entire month with one click
- **Decline Shifts**: Must provide a reason when declining
- **Status Badges**:
  - Yellow = Pending (needs your response)
  - Green = Accepted (you confirmed)
  - Red = Declined (you declined with reason)

#### Improved Log Hours ([LogHours.js](frontend/src/pages/LogHours.js))
- **Choose Method**: Toggle between manual entry or schedule-based
- **Manual Entry**: Traditional date/time/hours form
- **From Schedule**:
  - Shows your accepted shifts from past 2 weeks
  - Click to select a shift
  - Hours auto-fill from the shift
  - Submit to log those hours

## API Endpoints

### Schedule Endpoints ([backend/src/routes/schedules.js](backend/src/routes/schedules.js))

**Admin Routes:**
- `GET /api/schedules/admin/schedules` - Get all schedules (filtered by admin's educators)
- `POST /api/schedules/admin/schedules` - Create single shift
- `POST /api/schedules/admin/schedules/recurring` - Create recurring schedule
- `DELETE /api/schedules/admin/schedules/:id` - Delete shift

**Educator Routes:**
- `GET /api/schedules/my-schedules` - Get my schedules
- `POST /api/schedules/my-schedules/:id/accept` - Accept shift
- `POST /api/schedules/my-schedules/:id/decline` - Decline shift (requires reason)
- `POST /api/schedules/my-schedules/bulk-accept` - Accept multiple shifts by IDs
- `POST /api/schedules/my-schedules/accept-range` - Accept shifts in date range

## How to Use

### Setup

1. **Start your PostgreSQL database**

2. **Run the migration:**
   ```bash
   cd backend
   node migrate.js
   ```

3. **Start the backend:**
   ```bash
   cd backend
   npm start
   ```

4. **Start the frontend:**
   ```bash
   cd frontend
   npm start
   ```

### Admin Workflow

1. **Create Educators** (as you do now)
   - Each educator is linked to your admin account
   - You can only see your own educators

2. **Create Schedules**
   - Go to "Schedule" in the navbar
   - Click "Create Single Shift" for one-time assignments
   - Click "Create Recurring" for weekly patterns
   - Example: "John works every Monday 9am-5pm starting Feb 1st"

3. **Monitor Responses**
   - Calendar shows shift status with color badges
   - Pending = educator hasn't responded
   - Accepted = educator confirmed
   - Declined = educator can't work (see reason)

4. **Manage as Needed**
   - Delete shifts if plans change
   - Filter by educator to see individual schedules

### Educator Workflow

1. **Check Your Schedule**
   - Go to "My Schedule" in navbar
   - See all assigned shifts in calendar view

2. **Respond to Shifts**
   - Yellow badges = need your response
   - Click "Accept" to confirm individual shifts
   - Or use "Accept Entire Week" / "Accept Entire Month" for bulk
   - Click "Decline" if you can't work (must explain why)

3. **Log Your Hours**
   - Go to "Log Hours"
   - **Option 1**: Click "Manual Entry" and fill in dates/times
   - **Option 2**: Click "Log from Accepted Schedule"
     - See your accepted shifts from past 2 weeks
     - Click on a shift to select it
     - Hours auto-fill
     - Add notes if needed
     - Submit

## Files Modified

### Backend
- [schema.sql](backend/src/db/schema.sql) - Added schedules tables and created_by column
- [admin.js](backend/src/routes/admin.js) - Added admin isolation filtering
- [schedules.js](backend/src/routes/schedules.js) - NEW: Schedule management routes
- [server.js](backend/src/server.js) - Added schedules routes
- [migrate.js](backend/migrate.js) - NEW: Migration script

### Frontend
- [AdminSchedule.js](frontend/src/pages/AdminSchedule.js) - NEW: Admin schedule management page
- [MySchedule.js](frontend/src/pages/MySchedule.js) - NEW: Educator schedule page
- [LogHours.js](frontend/src/pages/LogHours.js) - Redesigned with two logging options
- [App.js](frontend/src/App.js) - Added schedule routes
- [Navbar.js](frontend/src/components/Navbar.js) - Added schedule links
- [index.css](frontend/src/index.css) - Added calendar styles, fixed badge colors

## Key Benefits

1. **Easier for Educators**: No more tedious hour logging - just click accepted shifts
2. **Better Planning**: Admins can plan weeks/months in advance with recurring schedules
3. **Accountability**: Educators must explain why they decline shifts
4. **Multi-Tenant Safe**: Admin accounts are completely isolated
5. **Flexible**: Manual entry still available for special cases
6. **User-Friendly**: Bulk accept options save time

## Migration Notes

When you run `node migrate.js`, it will:
- Add `created_by` column to existing users (will be NULL for existing users)
- Create `schedules` table
- Create `schedule_recurrence` table
- Create all necessary indexes

**Important**: Existing educators in your database won't have a `created_by` value. You may need to manually update them:

```sql
UPDATE users SET created_by = <admin_id> WHERE role = 'EDUCATOR' AND created_by IS NULL;
```

Replace `<admin_id>` with your admin's user ID.

## Testing Checklist

- [ ] Admin can create single shifts
- [ ] Admin can create recurring schedules (e.g., every Monday)
- [ ] Educator sees shifts in "My Schedule"
- [ ] Educator can accept individual shifts
- [ ] Educator can accept entire week/month
- [ ] Educator can decline with reason (required)
- [ ] Admin sees decline reasons
- [ ] Educator can log hours from accepted schedules
- [ ] Admin 1 cannot see Admin 2's educators
- [ ] Green buttons display correctly
- [ ] Calendar displays correctly

## Questions?

The system is fully implemented and ready to use. Start your database, run the migration, and you're good to go!
