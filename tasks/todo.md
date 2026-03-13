## BC Mandated Payroll Deductions On Paystubs (2026-03-13)
- [x] Verify the official BC/CRA list of mandatory employee payroll deductions
- [x] Inspect the current paystub deduction rendering and identify any misleading labels/amount mapping
- [x] Update the paystub output to show the mandated deduction categories without inventing unsupported current-period values
- [x] Verify the changed paystub/frontend paths and record the result

## Review
- Confirmed from official BC and CRA guidance that the mandatory employee payroll deductions in British Columbia are `Income Tax`, `Employment Insurance (EI)`, and `Canada Pension Plan (CPP)`, with `CPP2` / second additional CPP contributions required only when the employee's pensionable earnings are high enough for CPP2 to apply.
- Updated [`backend/src/services/pdfGenerator.js`](/C:/src/Daycare/backend/src/services/pdfGenerator.js) so the paystub PDF now labels the section as government-required deductions, lists `Income Tax`, `Employment Insurance (EI)`, `Canada Pension Plan (CPP)`, and conditionally `Second Canada Pension Plan (CPP2)`, and stops incorrectly placing the entire current `deductions` total on the `Income Tax` line when separate current-period component values are not stored.
- Updated [`frontend/src/pages/PayPeriodsPage.js`](/C:/src/Daycare/frontend/src/pages/PayPeriodsPage.js) so the HTML paystub preview also states the required BC employee deductions for consistency with the PDF.
- Limitation: the current data model still stores only aggregate current-period `deductions` plus YTD `tax/cpp/ei`, so the paystub can now show the mandated categories honestly but cannot break out current-period `EI` / `CPP` / `CPP2` amounts until those component values are stored separately.
- Verification:
- `node --check` passed for [`backend/src/services/pdfGenerator.js`](/C:/src/Daycare/backend/src/services/pdfGenerator.js).
- `npm exec eslint -- src/pages/PayPeriodsPage.js` passed.
- `npm run build` in `frontend/` succeeded with the repo's existing warnings only.

## Vacation Accrual And Locked Leave Balances (2026-03-13)
- [x] Confirm the current educator leave-balance fields, schedule-based payroll source, and paystub/pay-period touchpoints
- [x] Add educator vacation accrual settings plus locked-by-default leave balance editing in the profile UI/backend
- [x] Compute accrual-enabled vacation balances from schedule history and use them consistently in admin/paystub/auth responses
- [x] Update pay-period payout defaults so part-time accrual auto-pays vacation while full-time payouts expose an explicit payout toggle
- [x] Verify the changed backend/frontend paths and update `SYSTEM_DOCUMENTATION.xml` with review notes

## Review
- Added [`backend/migrations/047_add_user_vacation_accrual_fields.sql`](/C:/src/Daycare/backend/migrations/047_add_user_vacation_accrual_fields.sql) plus the new shared helper [`backend/src/utils/leaveAccrual.js`](/C:/src/Daycare/backend/src/utils/leaveAccrual.js) so educator records can store `vacation_accrual_enabled` / `vacation_accrual_rate` and derive vacation balances from scheduled hours to date instead of another hardcoded profile field.
- Updated [`backend/src/routes/admin.js`](/C:/src/Daycare/backend/src/routes/admin.js), [`backend/src/middleware/auth.js`](/C:/src/Daycare/backend/src/middleware/auth.js), [`backend/src/routes/documents.js`](/C:/src/Daycare/backend/src/routes/documents.js), [`backend/src/routes/schedules.js`](/C:/src/Daycare/backend/src/routes/schedules.js), and [`backend/src/routes/timeOffRequests.js`](/C:/src/Daycare/backend/src/routes/timeOffRequests.js) so accrual-enabled vacation balances are returned consistently in educator admin lists, `/auth/me`, paystub details/sample paystubs, and vacation usage flows; manual vacation balance decrements are skipped when accrual is enabled because the remaining hours are derived instead.
- Updated [`frontend/src/pages/EducatorsPage.js`](/C:/src/Daycare/frontend/src/pages/EducatorsPage.js) so educator edit forms lock Sick Hours Remaining, Vacation Hours Remaining, and Vacation Accrual settings by default, reveal hover `Edit` affordances for manual overrides, disable vacation-balance editing while accrual is enabled, and allow admins to configure a 4% default accrual rate in the profile UI.
- Updated [`backend/src/routes/payPeriods.js`](/C:/src/Daycare/backend/src/routes/payPeriods.js), [`frontend/src/pages/PayPeriodsPage.js`](/C:/src/Daycare/frontend/src/pages/PayPeriodsPage.js), and [`backend/src/services/pdfGenerator.js`](/C:/src/Daycare/backend/src/services/pdfGenerator.js) so pay-period previews/closures include accrual-driven vacation behavior: part-time accrual auto-pays vacation by default, full-time payouts expose a pay-out toggle in the paystub editor, and paystub previews/PDF defaults now treat vacation rows as normal-rate hours rather than a `0.04x` rate multiplier.
- Updated [`SYSTEM_DOCUMENTATION.xml`](/C:/src/Daycare/SYSTEM_DOCUMENTATION.xml) to record the new migration count, educator schema fields, and pay-period vacation accrual behavior.
- Verification:
- `node --check` passed for [`backend/src/routes/admin.js`](/C:/src/Daycare/backend/src/routes/admin.js), [`backend/src/routes/payPeriods.js`](/C:/src/Daycare/backend/src/routes/payPeriods.js), [`backend/src/routes/documents.js`](/C:/src/Daycare/backend/src/routes/documents.js), [`backend/src/middleware/auth.js`](/C:/src/Daycare/backend/src/middleware/auth.js), [`backend/src/routes/schedules.js`](/C:/src/Daycare/backend/src/routes/schedules.js), [`backend/src/routes/timeOffRequests.js`](/C:/src/Daycare/backend/src/routes/timeOffRequests.js), [`backend/src/utils/leaveAccrual.js`](/C:/src/Daycare/backend/src/utils/leaveAccrual.js), and [`backend/src/services/pdfGenerator.js`](/C:/src/Daycare/backend/src/services/pdfGenerator.js).
- `npm exec eslint -- src/pages/EducatorsPage.js src/pages/PayPeriodsPage.js` passed.
- `npm run build` in `frontend/` succeeded with the repo's existing warnings only.
- A direct helper probe confirmed a `4%` input normalizes to stored decimal `0.04` and accrues `3.2` hours from `80` worked hours.

## Educator Leave Settings Alignment (2026-03-13)
- [x] Inspect the educator edit modal section where locked leave balances and accrual settings drift out of horizontal alignment
- [x] Stabilize the locked-field shell and accrual-settings layout so value/helper-state changes do not shift the row
- [x] Verify the educator modal still builds cleanly

## Review
- Updated [`frontend/src/pages/EducatorsPage.js`](/C:/src/Daycare/frontend/src/pages/EducatorsPage.js) so `LockedFieldShell` now uses a full-height column layout with stable helper-text space, which keeps the locked balance cards aligned even when helper copy changes between locked/unlocked/auto-calculated states.
- Updated the Vacation Accrual Settings control in [`frontend/src/pages/EducatorsPage.js`](/C:/src/Daycare/frontend/src/pages/EducatorsPage.js) to use a responsive two-column layout so the checkbox label and `%` rate input stay horizontally aligned instead of drifting when settings change.
- Verification:
- `npm run build` in `frontend/` succeeded with only the repo's existing warnings.

## Shared Date Picker Year Selection (2026-03-13)
- [x] Record the educator birthday year-selection correction in `tasks/lessons.md`
- [x] Add a clickable custom year picker to the shared date modal without native select controls
- [x] Update `SYSTEM_DOCUMENTATION.xml` and verify the frontend build for the shared picker change

## Review
- Updated [`frontend/src/components/modals/DatePickerModal.js`](/C:/src/Daycare/frontend/src/components/modals/DatePickerModal.js) so the shared picker now has a clickable year chip that opens a custom year-grid view with previous/next year-range controls instead of forcing month-by-month navigation.
- Selecting a year now keeps the custom-styled modal flow intact, returns to the calendar view automatically, and updates the underlying selected date without introducing any native browser dropdown/select controls.
- While updating the picker, replaced the day-cell `aria-selected` usage with `aria-pressed` in [`frontend/src/components/modals/DatePickerModal.js`](/C:/src/Daycare/frontend/src/components/modals/DatePickerModal.js), which removes that file's prior accessibility lint warning.
- Updated [`SYSTEM_DOCUMENTATION.xml`](/C:/src/Daycare/SYSTEM_DOCUMENTATION.xml) to document the shared date-picker year navigation now used by educator birthdays.
- Verification:
- `node --check` passed for [`frontend/src/components/modals/DatePickerModal.js`](/C:/src/Daycare/frontend/src/components/modals/DatePickerModal.js).
- `npm run build` in `frontend/` succeeded with pre-existing repo warnings only.

## Closed Pay Period Deletion (2026-03-13)
- [x] Confirm whether payroll-related rows cascade safely when a pay period is deleted
- [x] Allow deleting closed pay periods in the backend without leaving orphaned payroll data
- [x] Update the pay periods UI so delete actions and confirmation copy match the new behavior
- [x] Update `SYSTEM_DOCUMENTATION.xml` and this task log with review notes, then verify the changed paths

## Review
- Confirmed the payroll schema already supports safe pay-period removal: [`payouts.pay_period_id`](/C:/src/Daycare/backend/migrations/000_initial_schema.sql#L60), [`paystubs.pay_period_id`](/C:/src/Daycare/backend/migrations/000_initial_schema.sql#L87), and related payout-linked records all use `ON DELETE CASCADE`.
- Updated [`backend/src/routes/payPeriods.js`](/C:/src/Daycare/backend/src/routes/payPeriods.js) so the delete endpoint no longer blocks closed periods or periods with payouts; it still locks the target row in a transaction before deleting the pay period.
- Updated [`frontend/src/pages/PayPeriodsPage.js`](/C:/src/Daycare/frontend/src/pages/PayPeriodsPage.js) so both open and closed period cards expose the Delete action, and the confirmation modal now explains that deleting a closed period also removes its stored payouts and paystubs.
- Updated [`SYSTEM_DOCUMENTATION.xml`](/C:/src/Daycare/SYSTEM_DOCUMENTATION.xml) to replace the old open-only deletion rule with the current closed-period deletion behavior.
- Verification:
- `node --check` passed for [`backend/src/routes/payPeriods.js`](/C:/src/Daycare/backend/src/routes/payPeriods.js).
- `npm run build` in `frontend/` succeeded with pre-existing repo warnings only.
- Rebuilt the local backend with `docker compose up -d --build backend`.
- Live API verification created a temporary pay period (`id=20`, `December 15, 2026` through `December 28, 2026`), closed it successfully, deleted that closed period successfully, and a follow-up `GET /api/pay-periods/20/close-preview` returned `404`, confirming the closed record was removed. Cleaned up the earlier failed-test temp open period (`id=19`) as well.

## Pay Period Educator Query Scope Fix (2026-03-13)
- [x] Confirm whether the employee list was using real DB records or hardcoded values
- [x] Restrict pay-period preview, close, payout list, and payroll summary queries to educators owned by the current admin
- [x] Verify the local data explanation for why Lory Cao is missing from the existing closed period
- [x] Update `SYSTEM_DOCUMENTATION.xml`, `tasks/todo.md`, and `tasks/lessons.md` with the fix and findings

## Review
- Confirmed there are no hardcoded employee names in the payroll UI. The bad `Admin User` row was coming from live DB data because the pay-period queries were filtering only by `payment_type`, not by user role/admin ownership.
- Updated [`backend/src/routes/payPeriods.js`](/C:/src/Daycare/backend/src/routes/payPeriods.js) so pay-period close preview, close processing, and payout list queries now require `u.role = 'EDUCATOR'` and `u.created_by = req.user.id`.
- Updated [`backend/src/routes/documents.js`](/C:/src/Daycare/backend/src/routes/documents.js) so payroll summary PDF exports use the same educator-only scope and no longer include admin/parent accounts.
- Verified local data: `Admin User` is user `42` with role `ADMIN` and `payment_type='HOURLY'`, which is why the old query pulled that account into payroll. `Lory Cao` is user `95` with role `EDUCATOR`, created on `November 24, 2025`.
- Verified historical behavior: the existing closed pay period is [`November 1-14, 2025`] and its stored payouts were created before Lory existed, so her absence there is historically correct. After the fix and backend rebuild, `GET /api/pay-periods/3/payouts` returns only the educator payout row, and a temporary preview for `2025-11-24` through `2025-11-30` returned `test educator` and `Lory Cao` only.
- Verification:
- `node --check` passed for [`backend/src/routes/payPeriods.js`](/C:/src/Daycare/backend/src/routes/payPeriods.js) and [`backend/src/routes/documents.js`](/C:/src/Daycare/backend/src/routes/documents.js).
- Rebuilt the local backend container with `docker compose up -d --build backend`.
- Live API verification after rebuild confirmed the scoped results described above.

## Educator Birthdays And Custom Profile Dropdowns (2026-03-13)
- [x] Inspect the educator create/edit flow and identify where birthday data and native dropdowns need changes
- [x] Add educator birthday support through database, admin API, and admin profile UI
- [x] Replace native dropdowns in the educator profile flow with the existing custom menu pattern
- [x] Verify the updated educator page build path and document the resulting behavior

## Paystub Payout Editing From Pay Periods (2026-03-13)
- [x] Inspect the current pay-period paystub preview and payout calculation flow
- [x] Add an admin payout-edit API for closed pay periods that recalculates payroll amounts from the educator profile
- [x] Add paystub edit actions in the pay-period UI with hours-focused editing and computed monetary previews
- [x] Verify the updated backend/frontend paths and record results

## Review
- Updated [`backend/src/routes/payPeriods.js`](/C:/src/Daycare/backend/src/routes/payPeriods.js) to expose `PATCH /pay-periods/payouts/:id`, recalculate payout `hourly_rate`, `gross_amount`, and `net_amount` from the educator profile (`payment_type`, `hourly_rate`, `salary_amount`) when hours are edited, and return the refreshed payout row with current paystub metadata.
- Updated [`backend/src/routes/payPeriods.js`](/C:/src/Daycare/backend/src/routes/payPeriods.js) open-period preview data so hourly and salaried preview rows also include gross, deductions, and net amounts for the new non-destructive Open action.
- Updated [`backend/src/routes/payPeriods.js`](/C:/src/Daycare/backend/src/routes/payPeriods.js) payout list queries to include profile compensation fields (`payment_type`, `profile_hourly_rate`, `profile_salary_amount`, `employment_type`) so the frontend can show where pay is being derived from.
- Updated [`backend/src/routes/documents.js`](/C:/src/Daycare/backend/src/routes/documents.js) paystub detail payloads so the paystub preview modal also knows the educator's live compensation settings.
- Updated [`frontend/src/pages/PayPeriodsPage.js`](/C:/src/Daycare/frontend/src/pages/PayPeriodsPage.js) to add `Edit` actions in the paystubs flow, an hours-focused payout edit modal, computed gross/net previews sourced from educator profile data, preview-header edit access for already-open paystubs, and an `Open` action for open periods that shows current hours plus gross/net payroll detail without starting the close flow.
- Updated [`backend/src/services/pdfGenerator.js`](/C:/src/Daycare/backend/src/services/pdfGenerator.js) paystub layout so the top-third company/employee names render flush-left instead of indented, and the `Hours` / `Rate` / `Current` / `YTD` pay columns now use equal-width numeric spacing with more room for larger values.
- Updated [`SYSTEM_DOCUMENTATION.xml`](/C:/src/Daycare/SYSTEM_DOCUMENTATION.xml) to record the new payout edit API and pay-period paystub editing behavior.
- Verification:
- `node --check` passed for [`backend/src/routes/payPeriods.js`](/C:/src/Daycare/backend/src/routes/payPeriods.js) and [`backend/src/routes/documents.js`](/C:/src/Daycare/backend/src/routes/documents.js).
- `node --check` passed for [`backend/src/services/pdfGenerator.js`](/C:/src/Daycare/backend/src/services/pdfGenerator.js).
- `npm exec eslint -- src/pages/PayPeriodsPage.js` completed with no errors.
- `npm run build` in `frontend/` succeeded with pre-existing repo warnings only.
- Direct PDF layout probes confirmed the top-third `Little Sparrows Academy` / employee name text now renders at the left margin and that large sample values fit inside the rebalanced pay-table numeric columns.

## Review
- Added [`backend/migrations/045_add_user_date_of_birth.sql`](/C:/src/Daycare/backend/migrations/045_add_user_date_of_birth.sql) so educator birthdays are stored on the `users` table.
- Updated [`backend/src/routes/admin.js`](/C:/src/Daycare/backend/src/routes/admin.js) so admin educator CRUD now returns and persists `date_of_birth`, `payment_type`, `pay_frequency`, `salary_amount`, and the existing `employment_type` field together instead of leaving the profile dropdowns partially disconnected.
- Updated [`frontend/src/pages/EducatorsPage.js`](/C:/src/Daycare/frontend/src/pages/EducatorsPage.js) to add birthday pickers to educator add/edit flows, show birthdays on educator cards, replace native profile `<select>` controls with menu-based dropdowns for payment type, pay frequency, and employment type, and use the shared date picker instead of native date inputs for profile date fields.
- Updated [`SYSTEM_DOCUMENTATION.xml`](/C:/src/Daycare/SYSTEM_DOCUMENTATION.xml) to record the new user-field support, migration range, and current Educators page behavior.
- Verification:
- `node --check` passed for [`backend/src/routes/admin.js`](/C:/src/Daycare/backend/src/routes/admin.js).
- `npm run build` in `frontend/` succeeded with pre-existing repo warnings only.
- `rg -n '<select|type="date"' frontend/src/pages/EducatorsPage.js` returned no matches, confirming the educator profile page no longer uses native select/date form controls.

## Staff Scheduling Backdated Shift Fix (2026-03-13)
- [x] Confirm the required scheduling and payroll context from `SYSTEM_DOCUMENTATION.xml`, `STRUCTURE.md`, and the relevant routes/pages
- [x] Remove the UI restriction that prevents admins from creating staff shifts on previous dates
- [x] Verify the current payroll/pay-period data source and document whether scheduled shifts flow into payroll automatically
- [x] Update `SYSTEM_DOCUMENTATION.xml` and this task log with the resulting behavior and review notes

## Pay Period Delete And PDF Export (2026-03-13)
- [x] Confirm the required payroll/pay-period context from `SYSTEM_DOCUMENTATION.xml`, `STRUCTURE.md`, and the relevant routes/pages
- [x] Add a backend pay-period delete path with guardrails that avoid reopening already-closed payroll history
- [x] Replace the pay-period Excel export with a readable payroll summary PDF export
- [x] Update the pay periods UI to expose delete actions and the new PDF download flow
- [x] Update `SYSTEM_DOCUMENTATION.xml` and this task log with the resulting behavior and review notes
- [x] Run focused verification for the changed backend/frontend paths and record the outcome

## Pay Period Frequency Dropdown UI (2026-03-13)
- [x] Confirm the pay periods page still uses a native select for frequency
- [x] Replace the native frequency select with the existing menu-based dropdown pattern used elsewhere in the portal
- [x] Verify the pay periods page build/render path after the control swap
- [x] Add review notes for the UI-only change

## Pay Dates And Paystub Preview Flow (2026-03-13)
- [x] Confirm the existing pay period, payout, and paystub backend/frontend flows
- [x] Add data support for `pay_date` on pay periods and carry it through paystub/PDF generation
- [x] Add admin access to create/view employee-specific paystubs from a pay period
- [x] Replace the closed-period payroll summary download button with a frontend-rendered HTML preview modal that also supports PDF download
- [x] Update `SYSTEM_DOCUMENTATION.xml` and this task log with the resulting behavior and review notes
- [x] Run focused verification for migration syntax, backend route syntax, and frontend build/render path

## Pay Period Custom Date Pickers (2026-03-13)
- [x] Confirm the pay periods page still contains native date inputs
- [x] Replace create-period and auto-generate date inputs with the shared custom date picker modal
- [x] Verify the pay periods page build after the date-picker swap
- [x] Add review notes for the design-system consistency fix

## Open Pay Period Live Totals (2026-03-13)
- [x] Confirm the pay periods list is not currently recalculating open-period totals from live schedule/time data
- [x] Add backend live aggregation so open periods reflect current in-range schedules while closed periods keep finalized payout totals
- [x] Update the pay periods stat card labeling if the open-period source changes from approved entries to scheduled shifts
- [x] Update `SYSTEM_DOCUMENTATION.xml` and this task log with the resulting behavior and review notes
- [x] Run focused verification for the pay periods route and frontend build
- [x] Verify the running local backend container is rebuilt so the live API actually serves the updated open-period aggregation code

- Updated [`backend/src/routes/payPeriods.js`](/C:/src/Daycare/backend/src/routes/payPeriods.js) so `GET /pay-periods` now computes open-period card totals from current in-range, non-declined schedules for the current admin's educators, while closed periods continue to report finalized payout totals.
- Updated [`frontend/src/pages/PayPeriodsPage.js`](/C:/src/Daycare/frontend/src/pages/PayPeriodsPage.js) so the fourth stat card reads `Scheduled Shifts` for open periods and still reads `Approved Entries` for closed periods.
- Updated [`SYSTEM_DOCUMENTATION.xml`](/C:/src/Daycare/SYSTEM_DOCUMENTATION.xml) to record the new live-open-period behavior while keeping the documented rule that closing/final payroll still uses approved time entries rather than schedule records.
- Verification:
- `node --check` passed for [`backend/src/routes/payPeriods.js`](/C:/src/Daycare/backend/src/routes/payPeriods.js).
- `npm run build` in `frontend/` succeeded with pre-existing repo warnings only.
- Follow-up verification for the reported February case:
- The database contains accepted schedule rows on `2026-02-16` and `2026-02-23` for the admin's educators inside pay period `id=18` (`2026-02-16` through `2026-02-27`).
- The running Docker container was initially stale and still serving the pre-aggregation version of [`backend/src/routes/payPeriods.js`](/C:/src/Daycare/backend/src/routes/payPeriods.js), so `/api/pay-periods` returned only raw pay-period fields.
- Rebuilt the local backend with `docker compose up -d --build backend`.
- After rebuild, live `GET /api/pay-periods` for pay period `id=18` returned `total_hours: 24`, `employee_count: 2`, and `scheduled_shifts: 3`, matching the in-range schedule rows.

## Closed Paystub Schedule Alignment (2026-03-13)
- [x] Confirm whether zero-hour paystubs after closing are caused by preview/rendering or by stored payout data
- [x] Update close-preview and close-processing so hourly payout generation uses the same in-range schedule totals shown on open pay periods
- [x] Repair the already-closed February pay period payouts in the local development database so the current paystubs stop showing zero hours
- [x] Update `SYSTEM_DOCUMENTATION.xml`, `tasks/todo.md`, and `tasks/lessons.md` with the corrected behavior
- [x] Run focused verification against the backend route and live API/database state

## Review
- Confirmed the bug was persisted data, not a frontend parsing issue. Closed pay period `id=18` had stored payout rows with `0.00` hours/gross/net because [`backend/src/routes/payPeriods.js`](/C:/src/Daycare/backend/src/routes/payPeriods.js) was still closing periods from approved `time_entries` while the open-period UI had already switched to live `schedules`.
- Updated [`backend/src/routes/payPeriods.js`](/C:/src/Daycare/backend/src/routes/payPeriods.js) so close-preview and close-processing now use the same in-range, non-declined schedule totals for hourly educators that the open-period cards already display, while salaried educators still close at their configured salary amount.
- Updated [`backend/src/routes/documents.js`](/C:/src/Daycare/backend/src/routes/documents.js) to alias paystub columns explicitly in the paystub-details query, fixing the nearby payload bug where `paystub.id` could be overwritten by the payout id.
- Rebuilt the local backend container with `docker compose up -d --build backend`.
- Repaired the already-closed February 16 to February 27, 2026 pay period (`id=18`) directly in the local development database so the current payout rows now store `8.00` hours / `$240.00` for `test educator` and `16.00` hours / `$416.00` for `Lory Cao`.
- Verification:
- `node --check` passed for [`backend/src/routes/payPeriods.js`](/C:/src/Daycare/backend/src/routes/payPeriods.js) and [`backend/src/routes/documents.js`](/C:/src/Daycare/backend/src/routes/documents.js).
- Live `GET /api/pay-periods/18/payouts` now returns the corrected stored hours and amounts.
- Live paystub generation plus `GET /api/documents/paystubs/:id/details` returned the corrected values for both payout `7` and payout `8`, and the paystub payload now reports the real paystub id (`3` / `4`) instead of the payout id.

## Closed Paystub HTML Breakdown Editing (2026-03-13)
- [x] Inspect the current closed-period payout edit flow, paystub detail payload, and PDF generator line-item behavior
- [x] Add persisted payout breakdown fields for regular, sick, vacation, stat, and retro line items
- [x] Update backend payout edit and paystub detail paths so HTML preview and PDF generation use the same stored line-item data
- [x] Replace the closed-period single-hours editor with an HTML paystub preview/editor that exposes editable hours and rate fields per line item
- [x] Update `SYSTEM_DOCUMENTATION.xml`, `tasks/todo.md`, and `tasks/lessons.md` with the new behavior and the no-rebuild instruction
- [ ] Verify the live backend flow after a future backend restart/redeploy picks up the new migration and route code

## Review
- Added migration [`backend/migrations/046_add_payout_breakdown_fields.sql`](/C:/src/Daycare/backend/migrations/046_add_payout_breakdown_fields.sql) to persist paystub line-item breakdown fields on `payouts` for regular, sick, vacation, stat, and retro hours/rates/current amounts, with backfill from the existing aggregate payout values.
- Updated [`backend/src/routes/payPeriods.js`](/C:/src/Daycare/backend/src/routes/payPeriods.js) so closed-period payout editing now accepts a structured paystub breakdown, recalculates stored `total_hours`, `hourly_rate`, `gross_amount`, and `net_amount` from those line items, and creates new payouts with the regular-pay line prefilled instead of only storing raw aggregate hours.
- Updated [`backend/src/routes/documents.js`](/C:/src/Daycare/backend/src/routes/documents.js) so paystub detail payloads include the persisted line-item fields, and retained the earlier paystub-id alias fix.
- Updated [`backend/src/services/pdfGenerator.js`](/C:/src/Daycare/backend/src/services/pdfGenerator.js) so the paystub PDF now prefers `regular_*` line-item fields for the Regular Pay row, which keeps the downloaded PDF aligned with the HTML preview/editor.
- Updated [`frontend/src/pages/PayPeriodsPage.js`](/C:/src/Daycare/frontend/src/pages/PayPeriodsPage.js) so:
- the read-only `Open` paystub modal now shows an HTML pay table preview
- the closed-period `Edit` flow now renders an HTML paystub-style table with editable hours and rate inputs for regular, sick, vacation, stat, and retro rows
- live gross/net/hour totals recalculate in the modal before save
- the paystub list compensation label prefers the stored payout rate instead of always showing the educator profile rate
- follow-up tuning now uses whole-number spinner steps for hours/rates, defaults sick pay to `1.0x` of the current hourly rate, and defaults vacation pay to `1.0x` for full-time educators or `0.04x` of the hourly rate for part-time educators
- Verification:
- `node --check` passed for [`backend/src/routes/payPeriods.js`](/C:/src/Daycare/backend/src/routes/payPeriods.js), [`backend/src/routes/documents.js`](/C:/src/Daycare/backend/src/routes/documents.js), and [`backend/src/services/pdfGenerator.js`](/C:/src/Daycare/backend/src/services/pdfGenerator.js).
- `npm run build` in `frontend/` succeeded with only the repo's existing warnings.
- Per user instruction, I did not rebuild or restart the backend after these code changes, so the new migration and route behavior are not yet live in the running local API until your normal backend restart/redeploy path picks them up.

- Updated [`frontend/src/pages/PayPeriodsPage.js`](/C:/src/Daycare/frontend/src/pages/PayPeriodsPage.js) to replace all native date inputs in the create-period and auto-generate flows with the shared [`DatePickerModal`](/C:/src/Daycare/frontend/src/components/modals/DatePickerModal.js) pattern already used elsewhere in the portal.
- Verification:
- `Select-String` found no remaining `type="date"` inputs in [`frontend/src/pages/PayPeriodsPage.js`](/C:/src/Daycare/frontend/src/pages/PayPeriodsPage.js).
- `npm run build` in `frontend/` succeeded with pre-existing repo warnings only.

## Review
- Added migration [`backend/migrations/043_add_pay_date_to_pay_periods.sql`](/C:/src/Daycare/backend/migrations/043_add_pay_date_to_pay_periods.sql) to introduce `pay_date`, backfill existing rows from `end_date`, and make the new column required for future periods.
- Updated [`backend/src/routes/payPeriods.js`](/C:/src/Daycare/backend/src/routes/payPeriods.js) so manual period creation requires `pay_date`, auto-generated periods default `pay_date` to the period end date, and period payout lookups now include existing paystub ids/stub numbers for admin paystub actions.
- Updated [`backend/src/routes/documents.js`](/C:/src/Daycare/backend/src/routes/documents.js) so admin paystub generation always returns the concrete `paystubId`/`stubNumber`, and paystub PDF generation now carries `pay_date` through the period data.
- Updated [`backend/src/services/pdfGenerator.js`](/C:/src/Daycare/backend/src/services/pdfGenerator.js) so paystubs prefer the configured pay date, and payroll summary PDFs now render the pay date in the header details.
- Added a structured paystub-details response in [`backend/src/routes/documents.js`](/C:/src/Daycare/backend/src/routes/documents.js) so the frontend can render paystub previews as HTML instead of embedding the PDF itself.
- Updated [`frontend/src/pages/PayPeriodsPage.js`](/C:/src/Daycare/frontend/src/pages/PayPeriodsPage.js) to collect `payDate` on create, show `Pay date` on each period card, open payroll summaries as frontend-rendered HTML modals with a `Download PDF` action, and open employee paystubs as frontend-rendered HTML modals after creating/finding the concrete paystub record.
- Updated [`SYSTEM_DOCUMENTATION.xml`](/C:/src/Daycare/SYSTEM_DOCUMENTATION.xml) to record the new migration count, pay-period schema, pay-date-aware creation flow, paystub actions, and HTML-preview-plus-PDF-download behavior.
- Verification:
- `node --check` passed for [`backend/src/routes/payPeriods.js`](/C:/src/Daycare/backend/src/routes/payPeriods.js), [`backend/src/routes/documents.js`](/C:/src/Daycare/backend/src/routes/documents.js), and [`backend/src/services/pdfGenerator.js`](/C:/src/Daycare/backend/src/services/pdfGenerator.js).
- `npm run build` in `frontend/` succeeded with pre-existing repo warnings only.
- Did not apply the new migration against a live database in this session, so [`backend/migrations/043_add_pay_date_to_pay_periods.sql`](/C:/src/Daycare/backend/migrations/043_add_pay_date_to_pay_periods.sql) still needs to be run in the target environment before the new create flow can persist `pay_date`.

## Educator Employment Type And Paystub Labels (2026-03-13)
- [x] Confirm the existing educator profile admin CRUD path and paystub PDF generation path
- [x] Add a stored educator employment-type option (`FULL_TIME` / `PART_TIME`) to the admin educator profile flow
- [x] Update paystub PDF labels and conditional rows:
- [x] Remove the stray `-Amour` suffix from Retro Payment
- [x] Rename Bonus to Stat Pay and show Stat Pay only for full-time educators
- [x] Stop placeholder dashes from rendering on pay rows that already have numeric values
- [x] Fix the Second Canada Pension Plan tax row so the label stays on one line
- [x] Update `SYSTEM_DOCUMENTATION.xml` and this task log with review notes and verification

## Review
- Added [`backend/migrations/044_add_user_employment_type.sql`](/C:/src/Daycare/backend/migrations/044_add_user_employment_type.sql) so educators can store an `employment_type` classification without guessing from payroll output.
- Updated [`backend/src/routes/admin.js`](/C:/src/Daycare/backend/src/routes/admin.js), [`backend/src/routes/documents.js`](/C:/src/Daycare/backend/src/routes/documents.js), and [`backend/src/middleware/auth.js`](/C:/src/Daycare/backend/src/middleware/auth.js) to read/write `employment_type` through the admin educator profile flow and pass it into paystub generation.
- Updated [`frontend/src/pages/EducatorsPage.js`](/C:/src/Daycare/frontend/src/pages/EducatorsPage.js) so add/edit educator profiles expose a Full Time / Part Time selector and educator cards display the stored employment type.
- Updated [`backend/src/services/pdfGenerator.js`](/C:/src/Daycare/backend/src/services/pdfGenerator.js) so paystubs now label `Retro Payment` correctly, rename `Bonus` to `Stat Pay`, hide `Stat Pay` for part-time educators, drop placeholder dashes when numeric pay values are present, and keep `Second Canada Pension Plan` on a single line by widening/reducing that taxes table row.
- Updated [`SYSTEM_DOCUMENTATION.xml`](/C:/src/Daycare/SYSTEM_DOCUMENTATION.xml) to record the new educator employment-type field, current migration count, and paystub PDF behavior.
- Verification:
- `node --check` passed for [`backend/src/routes/admin.js`](/C:/src/Daycare/backend/src/routes/admin.js), [`backend/src/routes/documents.js`](/C:/src/Daycare/backend/src/routes/documents.js), [`backend/src/middleware/auth.js`](/C:/src/Daycare/backend/src/middleware/auth.js), and [`backend/src/services/pdfGenerator.js`](/C:/src/Daycare/backend/src/services/pdfGenerator.js).
- `npm exec eslint -- src/pages/EducatorsPage.js` completed with warnings only and no errors in the changed educator page.
- A direct backend invocation of `generatePaystub` confirmed `Stat Pay` renders only for `FULL_TIME`, `Retro Payment- Amour` no longer appears, `Second Canada Pension Plan` is emitted as a single label, and zero-valued Sick Pay fields render numeric output instead of placeholder dashes when numeric payout values are present.
- `npm run build` in `frontend/` is currently blocked by pre-existing undefined-state errors in [`frontend/src/pages/PayPeriodsPage.js`](/C:/src/Daycare/frontend/src/pages/PayPeriodsPage.js); this task did not modify that file.

## Review
- Added an admin-only delete endpoint in [`backend/src/routes/payPeriods.js`](/C:/src/Daycare/backend/src/routes/payPeriods.js) that only allows deleting `OPEN` periods and blocks removal when payouts already exist, so closed payroll windows do not quietly reopen historical time-entry edits.
- Replaced the pay-period Excel export route in [`backend/src/routes/documents.js`](/C:/src/Daycare/backend/src/routes/documents.js) with a PDF export route backed by [`backend/src/services/pdfGenerator.js`](/C:/src/Daycare/backend/src/services/pdfGenerator.js). The generated PDF includes pay-period metadata, payroll summary totals, and a readable employee payout table.
- Updated [`frontend/src/pages/PayPeriodsPage.js`](/C:/src/Daycare/frontend/src/pages/PayPeriodsPage.js) to show delete actions for open periods, download PDFs for closed periods, and use the existing menu-style frequency selector in the auto-generate modal instead of a native browser dropdown.
- Updated [`SYSTEM_DOCUMENTATION.xml`](/C:/src/Daycare/SYSTEM_DOCUMENTATION.xml) to reflect the new delete guardrails, PDF export endpoint, and menu-based frequency selector behavior.
- Verification:
- `node --check` passed for [`backend/src/routes/payPeriods.js`](/C:/src/Daycare/backend/src/routes/payPeriods.js), [`backend/src/routes/documents.js`](/C:/src/Daycare/backend/src/routes/documents.js), and [`backend/src/services/pdfGenerator.js`](/C:/src/Daycare/backend/src/services/pdfGenerator.js).
- A direct backend invocation of `generatePayrollSummaryPdf` produced a PDF buffer successfully.
- `rg -n "<select" frontend/src/pages/PayPeriodsPage.js` returned no matches after the control swap.
- `npm run build` in `frontend/` succeeded with pre-existing repo warnings only.

## Review
- Removed the past-date block in [`frontend/src/components/modals/AddShiftModal.js`](/C:/src/Daycare/frontend/src/components/modals/AddShiftModal.js) by stopping the modal from passing `disablePast` into the shared date/time picker. The backend scheduling endpoints already accepted previous `shiftDate` values, so no API change was required.
- Confirmed payroll is not currently schedule-driven. [`backend/src/routes/payPeriods.js`](/C:/src/Daycare/backend/src/routes/payPeriods.js) builds pay-period previews and payouts from approved `time_entries` within the period date range, not from `schedules`.
- Updated [`SYSTEM_DOCUMENTATION.xml`](/C:/src/Daycare/SYSTEM_DOCUMENTATION.xml) to record both behaviors: backdated admin shift creation is allowed, and pay periods still depend on approved time entries.

## Short-Path Mobile Workspace (2026-03-13)
- [x] Confirm the standalone `native-mobile/` workspace can be copied independently of the rest of the repo
- [ ] Create a short-path Windows copy at `C:\src\daycare` for native Android builds
- [ ] Preserve local Docker Compose backend connectivity expectations in the copied mobile workspace
- [ ] Update `SYSTEM_DOCUMENTATION.xml`, `STRUCTURE.md`, and this task log with the short-path workflow
- [ ] Validate Android build behavior from `C:\src\daycare`

## Native Mobile Windows Android Path-Length Mitigation (2026-03-12)
- [x] Reproduce and inspect the current React Native Android path-length failure conditions from the existing workspace
- [ ] Replace the weaker temp-junction runner workaround with a shorter Windows-native execution path
- [ ] Document the required Windows long-path prerequisite and the new local Android runner behavior
- [ ] Validate the updated runner logic and record review/results in this file

## Native Mobile Architecture Replacement (2026-03-11)
- [x] Audit the current repo state to identify all Capacitor/mobile-web artifacts and the backend endpoints that actually support the required mobile product scope
- [x] Create a separate real native mobile workspace using React Native + TypeScript, with explicit config for emulator and physical-device API targets
- [x] Remove runtime coupling that treats `frontend/src/mobile/` and `mobile-app/` as the long-term mobile implementation path
- [x] Implement native shared app infrastructure:
  - role-aware auth/session state
  - typed API client
  - native navigation
  - design tokens aligned with the existing web product
  - lucide-adjacent native icon set
- [x] Implement the first authenticated native role shells and routing:
  - Admin: Today, Attendance, Messages, Events, More
  - Educator: Home, Attendance, Care, Messages, Schedule
  - Parent: Home, Child, Messages, Billing, Events
- [x] Restrict feature scope to verified backend support only:
  - unified auth by account role
  - attendance
  - educator care logs limited to `NAP`, `PEE`, `POO`
  - messaging
  - parent child view
  - parent invoices / receipts / billing history
  - events / RSVP where supported
  - password change
  - basic settings
- [x] Add native development instructions that clearly separate:
  - local Docker Compose backend/postgres
  - emulator API connectivity
  - physical-device API connectivity
  - native run/build commands
- [x] Mark the old Capacitor path as deprecated or remove it if safe, without breaking the existing web frontend or Docker Compose backend/postgres flow
- [x] Update `SYSTEM_DOCUMENTATION.xml` and `STRUCTURE.md` so future engineers do not confuse the deprecated Capacitor shell with the real mobile architecture
- [x] Verify the native app against the running local backend and record exact commands used:
  - authenticate successfully with Admin, Educator, and Parent accounts
  - prove role-based routing destinations work
  - prove the implementation is React Native rather than a webview wrapper
  - capture review/results in this file

## Review
- Added `native-mobile/` as the canonical mobile workspace using Expo, React Native, and TypeScript, with secure session storage, typed API services, native navigation, role-based shells, and design tokens aligned to the web product.
- Implemented a unified native login flow plus role-directed tab navigation for Admin, Educator, and Parent accounts using only verified backend capabilities. Educator care actions are limited to `NAP`, `PEE`, and `POO`, and settings/password-change flows stay within supported auth endpoints.
- Removed web runtime coupling to the abandoned mobile-web path by deleting the `frontend/src/mobile/` boot branch from `frontend/src/App.js` and removing the mobile-specific API override logic from `frontend/src/utils/api.js`.
- Marked `mobile-app/` as a deprecated Capacitor wrapper and `frontend/src/mobile/` as a deprecated reference-only UX source so future work continues in `native-mobile/`.
- Added native local-development instructions in `native-mobile/README.md` covering Docker Compose backend/postgres, emulator API access (`10.0.2.2`), physical-device LAN-IP access, and native run/prebuild commands.
- Validation:
- `npm run typecheck` in `native-mobile/` succeeded.
- `npm run build` in `frontend/` succeeded with pre-existing warnings only.
- `npm run verify:local -- --api http://localhost:5000/api --admin-email admin@test.com --admin-password password123 --educator-email educator@test.com --educator-password password123 --parent-email parent@test.com --parent-password password123` in `native-mobile/` succeeded and verified live backend auth plus role routing targets:
- `ADMIN -> AdminToday`
- `EDUCATOR -> EducatorHome`
- `PARENT -> ParentHome`
- `npm run prebuild:android` in `native-mobile/` succeeded and generated `native-mobile/android/`, proving the app is backed by a real Android-native project path rather than a webview packaging folder.
- `rg -n "WebView|webview|capacitor|cordova|ionic" src App.tsx app.json package.json android` in `native-mobile/` returned no matches, confirming the native workspace does not rely on a webview runtime.
- Reviewed nearby quality issues outside this migration that remain unchanged:
- `frontend/src/components/modals/DatePickerModal.js:136` and `frontend/src/components/modals/DateTimePickerModal.js:431` use `aria-selected` on button elements.
- `frontend/src/pages/BankAccountsPage.js` still carries pre-existing lint noise from unused variables/dependencies.

## Historical Capacitor Work (Superseded 2026-03-11)
- [x] Add a separate `mobile-app/` project for Android packaging without changing the existing website/public/portal deployment flow
- [x] Add a mobile frontend build mode with dedicated environment inputs for API, public-site base URL, and portal base URL
- [x] Generate Capacitor Android scaffolding in the separate mobile workspace
- [x] Verify frontend mobile build, Capacitor sync, and Android debug assembly
- [x] Update `STRUCTURE.md`, `SYSTEM_DOCUMENTATION.xml`, `tasks/todo.md`, and `tasks/lessons.md` with the new mobile-target behavior and repo-targeting lesson

## Historical Mobile Login Connectivity Fix (Superseded 2026-03-11)
- [x] Verify the native Android mobile app can reach the local Docker Compose backend in emulator and physical-device scenarios
- [x] Add a mobile runtime API override and connection diagnostics so local Android testing does not require a rebuild for every host change
- [x] Allow Android debug builds to talk to the local HTTP backend during development without blocking production assumptions
- [x] Validate parent/admin login against the running Docker Compose backend and record the exact findings

## Historical Review
- Confirmed live Docker Compose services were healthy: backend on `http://localhost:5000` and Postgres healthy.
- Confirmed the running database contains `admin@test.com`, `educator@test.com`, and `parent@test.com`, and verified both `admin@test.com/password123` and `parent@test.com/password123` succeed against `POST /api/auth/login`.
- Added a runtime API URL override in `frontend/src/utils/api.js` plus mobile connection diagnostics in `frontend/src/mobile/MobileApp.js`, so the app now shows the active API endpoint, tests `/health`, and lets local Android testing switch between emulator and physical-device backend hosts without a rebuild.
- Added Android debug-only cleartext HTTP support in `mobile-app/android/app/src/debug/AndroidManifest.xml`, which is required for local Docker Compose backend access over `http://` from Android.
- Updated `mobile-app/README.md`, `STRUCTURE.md`, and `SYSTEM_DOCUMENTATION.xml` with the emulator-vs-device API guidance and the new mobile connection behavior.
- Validation:
- `npm run build:web` in `mobile-app/` succeeded.
- `npm run sync:android` in `mobile-app/` succeeded.
- `.\gradlew.bat assembleDebug` in `mobile-app/android/` succeeded after setting `JAVA_HOME` to `C:\Program Files\Android\Android Studio\jbr` for this shell session.

## Historical Review
- Added a separate `mobile-app/` Capacitor workspace for Android packaging with its own env handling, scripts, and native project generation.
- Kept the existing website/public/portal deployment flow intact. The standard website build remains `frontend/build`, while the mobile packaging path now builds to `frontend/build-mobile`.
- Added `REACT_APP_DEFAULT_MODE` support in frontend bootstrap so native app builds can force portal mode on localhost-based launches without changing normal website routing.
- Added `mobile-app/scripts/build-web.mjs` to inject `MOBILE_API_URL`, `MOBILE_DEFAULT_MODE`, and optional public/portal base URLs into the frontend build before Capacitor sync.
- Updated `STRUCTURE.md` and `SYSTEM_DOCUMENTATION.xml` to record the separate mobile workspace, mobile build output, and portal-default native startup behavior.
- Updated `tasks/lessons.md` with the repo-targeting correction pattern from this session.
- Validation:
- `npm run build` in `frontend/` succeeded with pre-existing warnings only.
- `npm run sync:android` in `mobile-app/` succeeded using a temporary local-dev config (`MOBILE_API_URL=http://10.0.2.2:5000/api`).
- `.\gradlew.bat assembleDebug` in `mobile-app/android/` succeeded after setting local `JAVA_HOME` to the Android Studio JBR and writing local `android/local.properties`.
- Debug APK output: `mobile-app/android/app/build/outputs/apk/debug/app-debug.apk`
- Proactive quality findings in reviewed scope:
- `frontend/src/components/modals/DatePickerModal.js:136` and `frontend/src/components/modals/DateTimePickerModal.js:431` use `aria-selected` on button elements; switch to a supported selection pattern for accessibility correctness.
- `frontend/src/pages/BankAccountsPage.js:44` retains several unused variables and unnecessary memo deps; clean those to reduce lint noise before broader mobile work.

---

# Public Site Mobile Fixes (2026-03-02)

## Compliance Policy Docs And MFA Audit (2026-03-10)
- [x] Create root-level `DATA_RETENTION_AND_DISPOSAL_POLICY.md`
- [x] Create root-level `ACCESS_CONTROLS_POLICY.md`
- [x] Create root-level `INFORMATION_SECURITY_POLICY.md`
- [x] Verify whether Resend is implemented and whether MFA is operational for critical systems handling financial data
- [x] Add review/results summary with file list and compliance findings
- Files updated:
  - `DATA_RETENTION_AND_DISPOSAL_POLICY.md`
  - `ACCESS_CONTROLS_POLICY.md`
  - `INFORMATION_SECURITY_POLICY.md`
  - `tasks/todo.md`
- Outcome:
  - Added three root-level compliance policy documents grounded in the current repo architecture and written to avoid claiming unimplemented controls as already operational
  - Confirmed Resend is wired only as an SMTP credential path for Nodemailer, not as a dedicated MFA or identity control implementation
  - Confirmed the app currently does not implement operational MFA for admin authentication or finance-critical application access
- Compliance findings:
  - `backend/src/services/emailService.js` supports SMTP email via `RESEND_API_KEY` by defaulting to `smtp.resend.com`
  - `k8s/deployments/backend.yaml` injects `RESEND_API_KEY` into the backend deployment
  - `frontend/src/pages/SettingsPage.js` contains a Two-Factor Authentication section, but repo search found no backend 2FA/MFA/TOTP/OTP implementation behind it
  - The current repo therefore does not satisfy an MFA control requirement for critical systems handling consumer financial data at the application-auth layer
- Validation:
  - Verified the policy files exist in the repository root
  - Verified Resend/MFA status by inspecting backend email service, backend deployment env injection, auth routes, auth middleware, package dependencies, and frontend settings UI

## Frontend Cache Bust Fix (2026-03-03)
- [x] Add explicit no-cache handling for `public-overrides.css` in frontend nginx config
- [x] Add deterministic cache-busting query version to the public overrides stylesheet link
- [x] Verify frontend build and document outcome
- [x] Update `SYSTEM_DOCUMENTATION.xml` with frontend cache-bust behavior
- Files updated:
  - `frontend/nginx.conf`
  - `frontend/src/pages/public/PublicLayout.js`
- Outcome:
  - `/public-overrides.css` is now served with no-cache/no-store headers
  - Public layout now requests `/public-overrides.css?v=20260303-1` (or `REACT_APP_PUBLIC_OVERRIDES_VERSION` when set)
- Validation:
  - `npm run build` succeeds in `frontend/` (warnings only)

## K8s Audit And Drift Fixes (2026-03-03)
- [x] Sanitize Kubernetes Docker registry secret manifest to remove sensitive/static credential values
- [x] Update k8s deploy/apply scripts to avoid blindly applying placeholder docker credentials
- [x] Refresh k8s docs (`README.md`, `STRUCTURE.md`) for current replica/resource defaults and credential flow
- [x] Verify shell script syntax and summarize outcomes
- [x] Update `SYSTEM_DOCUMENTATION.xml` for k8s behavior/documentation changes
- Files updated:
  - `k8s/secrets/dockerhub-credentials.yaml`
  - `k8s/apply-all.sh`
  - `k8s/deploy.sh`
  - `k8s/README.md`
  - `k8s/STRUCTURE.md`
- Outcome:
  - Docker pull secret manifest is now sanitized template content (no static credential values)
  - Deploy/apply scripts now always apply `daycare-secrets.yaml` and only apply docker pull secret when template placeholders are replaced
  - K8s docs now reflect current resource requests/limits, replica counts, and manual deployment order (including Firefly)
- Validation note:
  - Attempted shell syntax checks with `bash -n`, but this Windows environment has no `/bin/bash`, so syntax check could not be executed here

## Gallery Popup Behavior (2026-03-02)
- [x] Replace gallery link navigation with in-page lightbox popup
- [x] Implement transparent-black backdrop with outside-click close behavior
- [x] Implement left/right cycling controls for popup images
- [x] Verify frontend build and summarize results
- [x] Update `SYSTEM_DOCUMENTATION.xml` with popup gallery behavior
- Files updated:
  - `frontend/src/pages/public/PublicHome.js`
  - `frontend/public/public-overrides.css`
- Behavior now:
  - Gallery opens in-page popup (no route change / no leaving the page)
  - Backdrop is semi-transparent black with website still visible behind
  - Clicking outside the image closes the popup
  - Clicking left/right side of the popup image cycles previous/next photo (no visible arrow buttons)
  - Mobile Home `Contact Us` button now uses square corners to match desktop; gallery image corners remain unchanged
  - Smallest phones (`max-width: 380px`) now use a smaller Home `Contact Us` CTA box/text to prevent hierarchy collisions with nearby hero text
  - Keyboard navigation works (`Escape`, left arrow, right arrow)
- Validation:
  - `npm run build` succeeds in `frontend/` (warnings only)

## Plan
- [x] Confirm root selectors for mobile header title, Home CTA button text, and gallery title sizing
- [x] Implement focused CSS fixes in `frontend/public/public-overrides.css`
- [x] Verify no regressions in mobile nav/header behavior and desktop sizing with a frontend build
- [x] Update `SYSTEM_DOCUMENTATION.xml` to reflect the new public-site mobile sizing/centering behavior
- [x] Add review/results summary with changed files and validation output
- [x] Normalize mobile header spacing consistency across large/small phone widths to match mid-size rhythm

## Review / Results
- Updated file:
  - `frontend/public/public-overrides.css`
- Mobile fixes delivered:
  - Increased mobile site-name header scale and allowed full-fit wrapping behavior (instead of forced truncation)
  - Explicitly centered Home banner `Contact Us` button text inside its pill/bubble on phone widths
  - Increased Home gallery heading text scale on phone widths
  - Kept mobile nav drawer offset aligned with the taller header so menu content starts below header chrome
  - Standardized phone header spacing behavior by fixing header height and removing extra tiny-phone title scaling overrides
  - Prevented small-phone logo/title top clipping by increasing mobile title line-height and adding slight top padding
- Verification:
  - `npm run build` in `frontend/` completed successfully (warnings only; no build errors)

## Mobile App UI Handoff Brief (2026-03-11)
- [x] Review current portal routing, role structure, and mobile packaging assumptions
- [x] Review current visual system including fonts, colors, icons, layout patterns, and theme behavior
- [x] Review role-specific workflows for admin, educator, and parent that are relevant to a native mobile app
- [x] Review current settings surface and separate mobile-suitable settings from web-only administration settings
- [x] Produce a detailed handoff prompt for a UI designer/frontend engineer describing what the mobile app should include and how it should look

## Review
- Confirmed the product concept is a dual-surface system: public marketing website plus portal application, with native mobile builds intended to launch directly into portal mode rather than the marketing site.
- Confirmed the existing portal visual language uses Tailwind CSS, `lucide-react` icons, `Quicksand` headings, `Inter` body text, and a warm daycare palette for staff/admin (`#FF9B85`, `#E07A5F`, `#FFE5D9`, `#FFF8F3`) with a calmer teal parent palette.
- Confirmed admin information architecture is already split around `Today` versus broader management workflows, which should drive the mobile app structure.
- Confirmed current mobile-relevant workflows from code review:
- Admin: Today workspace, attendance, daily readiness/compliance, care logs, calendar/events, notifications, messaging follow-up, family/staff quick access.
- Educator: dashboard, attendance, care logs, messages, schedule acceptance/decline, time-off requests, hours view, paystub access.
- Parent: dashboard, child details, invoices/receipts, messages, events calendar with RSVP, newsletters, read-only care logs.
- Confirmed current settings surface includes profile, password change, notification toggles, display preferences/density, daycare business identity/contact/signature/tax settings, theme selection, and developer diagnostics.
- Accuracy note: the security tab shows a Two-Factor Authentication UI control, but prior repo audit found no backend MFA implementation behind it; any mobile handoff should treat 2FA as unimplemented unless separately scoped.

## Native Mobile UI Rewrite (2026-03-11)
- [x] Add a dedicated mobile-app frontend mode flag so the Android build can render a native-style mobile UI without changing the website/public portal
- [x] Implement a unified mobile auth flow with one login experience for Admin, Educator, and Parent
- [x] Implement a shared mobile shell with role-based bottom navigation, role-aware header treatment, and mobile settings access
- [x] Implement Admin mobile screens for Today, Attendance, Messages, Events, and More using existing backend data/features only
- [x] Implement Educator mobile screens for Home, Attendance, Care, Messages, and Schedule using existing backend data/features only
- [x] Implement Parent mobile screens for Home, Child, Messages, Billing, and Events using existing backend data/features only
- [x] Add mobile-native styling, motion, and shared components aligned with the Little Sparrows design system
- [x] Update `SYSTEM_DOCUMENTATION.xml` and `STRUCTURE.md` if the mobile runtime behavior or repo navigation assumptions change
- [x] Run a frontend build targeted at the mobile path to validate the implementation

## Review
- Added a dedicated mobile frontend mode controlled by `REACT_APP_MOBILE_APP=true`, injected by `mobile-app/scripts/build-web.mjs`, so the Android build now renders a separate mobile-native UI shell instead of the standard portal/public router.
- Added a unified mobile login flow for all roles in `frontend/src/mobile/MobileApp.js`, with role-based redirects after authentication and legacy route redirects to preserve old portal links/action targets inside the mobile build.
- Added a shared mobile shell with brand header, role-based bottom navigation, safe-area-aware layout, and mobile settings access.
- Added new mobile role screens:
  - Admin: Today, Attendance, Messages, Events, More
  - Educator: Home, Attendance, Care, Messages, Schedule
  - Parent: Home, Child, Messages, Billing, Events
- Kept mobile feature scope aligned to current backend/frontend support only:
  - Educator care logging remains nap/pee/poo only
  - Parent daily updates remain based on read-only care logs and newsletters/messages
  - Mobile settings include password change, notification toggles stored locally, display density, account summary, and sign-out
  - 2FA remains explicitly unimplemented
- Updated `SYSTEM_DOCUMENTATION.xml` and `STRUCTURE.md` to record the new native mobile startup behavior and build flag.
- Validation:
  - `npm run build` in `frontend/` succeeded with `REACT_APP_MOBILE_APP=true`, `REACT_APP_DEFAULT_MODE=portal`, and `REACT_APP_API_URL=/api`
  - Build completed with pre-existing repo warnings plus no new blocking errors from the mobile implementation
