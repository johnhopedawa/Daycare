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
- [ ] Add data support for `pay_date` on pay periods and carry it through paystub/PDF generation
- [ ] Add admin access to create/view employee-specific paystubs from a pay period
- [ ] Replace the closed-period payroll summary download button with an in-app PDF preview modal that also supports download
- [ ] Update `SYSTEM_DOCUMENTATION.xml` and this task log with the resulting behavior and review notes
- [ ] Run focused verification for migration syntax, backend route syntax, and frontend build/render path

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
