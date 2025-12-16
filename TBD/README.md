# TBD (To Be Deleted) Folder

This folder contains files that have been moved out of the main project structure for cleanup. These files are **not currently used** by the application but are kept here temporarily in case anything breaks.

## Contents

### Test/Debug Scripts (backend/)
- **viewDB.js** - Database inspection tool (one-off utility)
- **setup-admin.js** - Redundant admin setup (use `scripts/create-admin.sh` instead)
- **cleanup-database.js** - Development cleanup tool
- **verify-phase3.js** - Phase 3 verification script (one-time use)
- **test-parent-portal.js** - Test data setup tool

### Test Scripts (root)
- **test-scheduling.js** - JavaScript scheduling test script
- **test-scheduling.sh** - Bash scheduling test script (duplicate purpose)

### Duplicate Migration
- **backend/src/db/migrations/add_emergency_contacts_table.sql** - Duplicate migration (already exists as `backend/migrations/010_add_emergency_contacts_table.sql`)

### Planning/Reference Documentation
- **tabtransition.md** - Future UI redesign notes
- **Thingstodo.md** - Feature roadmap/ideas
- **PROJECT_SUMMARY.md** - Project summary (consolidated into HANDBOOK.md)
- **QUICK_REFERENCE.md** - Quick reference (consolidated into HANDBOOK.md)
- **SCHEDULE_SYSTEM_UPDATE.md** - Schedule feature guide (consolidated into HANDBOOK.md)

### Mockup Images
- **Ideas/** - UI mockup images (reference only)

## Why These Files Were Moved

1. **Test/debug scripts**: One-off utilities created during development phases. Not imported or referenced by production code.
2. **Documentation files**: Redundant with the new comprehensive HANDBOOK.md
3. **Planning files**: Future feature notes that clutter the root directory
4. **Duplicate migration**: Already exists in the proper migrations folder

## What to Keep in Root

Essential documentation that remains:
- **README.md** - Main project overview
- **GETTING_STARTED.md** - Setup guide
- **CODEBASE_CONTEXT.md** - Technical architecture reference
- **HANDBOOK.md** - Comprehensive handbook (NEW - replaces PROJECT_SUMMARY, QUICK_REFERENCE)

## If Something Breaks

If you discover that any of these files are actually needed:
1. Move the file back to its original location
2. Document why it's needed in the main README
3. Update this README to reflect what was restored

## Safe to Delete?

After testing the application and confirming everything works:
- Run the app with docker-compose
- Test all major features (login, families, schedules, pay periods)
- If no errors occur for a week or two, this entire TBD folder can be deleted

---

**Created**: 2025-12-15
**Purpose**: Cleanup and organization
