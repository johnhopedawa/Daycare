# Lessons Learned

## 2026-03-02
- When the user asks for exact wording changes in governance docs, paste their text verbatim and do not paraphrase.
- Do not start background dev servers/build commands unless explicitly requested or clearly necessary for the specific deliverable.
- Validate header/logo/CTA alignment at both phone and narrow-desktop widths (especially around 1024px), not only at wide desktop.
- For legacy layouts using `display: table/table-cell`, avoid margin-based spacing assumptions; prefer explicit flex layout overrides for reliable mobile header alignment.
- After collision fixes, explicitly validate perceived typography scale and centering on-device; “no overlap” is not sufficient for header quality.
- When user says “entire phone version,” apply hierarchy refinements across all public menu routes, not only the landing page.
- When feedback targets one UI element (for example: button vs image), constrain CSS edits to that element only and re-verify before broadening scope.
- Before app-store or mobile packaging work, verify the target repository/folder explicitly so setup does not happen in the wrong project.

## 2026-03-11
- If the user says they do not want a wrapped website, do not default to Capacitor or any webview shell; treat that as a requirement for a real native app architecture unless they explicitly approve a hybrid approach.
- When replacing a wrong hybrid-mobile direction, remove the old runtime hooks from the web app and mark the abandoned path deprecated in-repo; do not leave stale architecture cues that make the deprecated path look current.

## 2026-03-13
- When a user reports the wrong people appearing in payroll or employee lists, verify the live DB rows and the exact period dates before assuming a frontend bug; distinguish between a bad query scope and a legitimate historical snapshot.
- After backend route changes in local Docker Compose, verify the running container is using the updated file; this repo does not bind-mount backend source, so `docker compose up -d --build backend` is required before trusting live API results.
- When open-period cards are changed to show schedule-based payroll projections, keep close-preview and close-processing on the same source of truth or the UI will show one set of hours and store another.
- If the user explicitly says not to rebuild or restart the backend, stop at code-level verification and clearly call out that the new backend behavior will not be live until their normal restart/deploy path picks it up.
- In numeric payroll editors, spinner step behavior and typed-decimal behavior are separate concerns: use whole-number `step` increments when requested without blocking manual decimal entry.
- When the user gives a multiplier hint like `0.04 so 4%`, interpret it literally as `0.04x` unless they explicitly say `0.4x`.
- When paystub editing exists for closed periods, check whether the same draft-review capability is also expected before closing so the preview and stored payout flows stay aligned.
- When a user points to a specific payroll surface like the educator `My Paystubs` route, trace that exact frontend route and its backing `/api/documents/paystubs/*` endpoints before broadening the fix to adjacent payroll screens.
- When a paystub shows both `Current` and `YTD`, do not let YTD display below the current stub amount; at minimum it must reflect the current paystub values, and if the user asks for YTD editing in the HTML preview, wire that through the real paystub edit flow instead of leaving it as read-only display text.
- When admins can edit YTD paystub values, normalize entries below the current amount as `entered + current` instead of clamping straight to current; apply that same rule consistently across the preview, save path, and PDF output.

## 2026-03-13
- When a user retracts a reported issue, stop pursuing that verification path and focus only on the remaining requested change instead of continuing to optimize the abandoned concern.
- When a user asks for an "Open" preview of a document inside the app, confirm whether they want a real PDF embed or a frontend-rendered HTML preview before defaulting to an iframe/object PDF viewer.
- When updating a portal form to match the existing design system, replace all remaining native date and select controls in that flow, not just the first obvious one.
- When a user corrects a payroll business rule like closed-period deletion, update the backend guard and the frontend delete messaging/actions in the same change so the product does not enforce two conflicting policies.
- When a shared date picker is used for birthdays or other historical dates, provide direct year navigation inside the custom picker; month-by-month navigation alone is not acceptable.
- When a user gives a payroll percentage in decimal shorthand, confirm whether they mean the stored decimal fraction (`0.04`) or the displayed percent (`4%`) before wiring the rule into accrual logic.
- When a user corrects a paystub/table grouping inside the same request, match that exact grouping in the rendered output instead of treating it as a spacing-only tweak.
- Do not rename established payroll/paystub labels like `TAXES` or `DEDUCTIONS` unless the user explicitly asks for wording changes; preserve existing memo language when only the data logic needs correction.
