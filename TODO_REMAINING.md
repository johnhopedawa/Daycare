# Remaining Work (Post-Billing Updates)

This is a short checklist of work still needed after the recent billing/receipts/credits changes.

## P0 (Must-Have)
- Add first-login forced reset for parents:
  - Add a flag on parent accounts (e.g., must_reset_password).
  - Enforce at parent login (block access until reset).
  - Clear flag after reset is complete.
- Wire up email delivery for password resets:
  - Notifications queue exists but no email service.
  - Pick a provider and implement send + failure handling.

## P1 (High Priority)
- Expose credit balances and apply-credit UX:
  - Show `credit_balance` in admin + parent views.
  - Add clear "apply credits" action with validation.
- End-to-end billing smoke:
  - Fresh DB migration run.
  - Invoice create -> payment -> receipt -> parent download flow.

## P2 (Cleanup / Consistency)
- Check Settings password payloads:
  - Some UI forms use legacy field names for password change.
  - Align frontend payloads with backend expectations.

## Notes
- Credits are now created on overpayment and can be applied to invoices, but there is no visible balance or explicit apply flow.
- Parent reset endpoint returns a link; delivery still needs to send an email.
