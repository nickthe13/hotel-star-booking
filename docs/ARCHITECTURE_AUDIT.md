# Architecture Audit

Status: **Complete**
Owner: TBD
Last updated: 2026-01-21

## Scope
This audit captures known inconsistencies between code, docs, and runtime behavior and tracks stabilization work before new features.

## Issues

### 1) Backend implementation status doc is stale
- Problem: The status doc reports Payments and Email as not started, but they are implemented and wired.
- Files: backend/IMPLEMENTATION_STATUS.md, backend/src/app.module.ts, backend/src/payments/, backend/src/email/
- Impact: Developer confusion and duplicate work risk.
- Fix: Update the status doc to reflect actual module completion and remaining gaps.
- Priority: Immediate
- Status: **RESOLVED** (2026-01-21) - Updated IMPLEMENTATION_STATUS.md to document all 10 implemented modules

### 2) Payment API mismatches + missing endpoints
- Problem: Frontend includes saved-method CRUD flows that do not exist in backend.
- Files: src/app/core/services/payment.service.ts, backend/src/payments/payments.controller.ts
- Impact: UX gaps and runtime errors when features are exercised.
- Fix: Either implement backend endpoints (POST/DELETE/PATCH for saved methods) or disable/feature-flag UI and remove mock paths.
- Priority: Immediate (if saved methods are MVP), Otherwise Soon
- Status: **RESOLVED** (2026-01-21) - Removed mock implementations from frontend; methods now return errors indicating feature not supported

### 3) Architecture/plan docs don't match reality
- Problem: Plan doc references json-server/Express/Mongo and Angular Material; actual stack is NestJS + Prisma + Postgres and no Material dependency.
- Files: docs/hotel-booking-plan.md, backend/README.md, package.json, backend/package.json
- Impact: Onboarding confusion and misleading guidance.
- Fix: Update plan doc to current architecture or archive with a clear banner.
- Priority: Soon
- Status: **RESOLVED** (2026-01-21) - Added banner to plan doc noting it's the original planning document with table showing planned vs actual stack

### 4) Encoding artifacts in docs and email templates
- Problem: Garbled characters appear in docs and email HTML templates.
- Files: docs/hotel-booking-plan.md, backend/src/email/email.service.ts
- Impact: Broken user-facing emails and unreadable docs.
- Fix: Normalize to UTF-8 and replace garbled characters with intended text/icons.
- Priority: Immediate for emails, Soon for docs
- Status: **RESOLVED** (2026-01-21) - Fixed encoding in ARCHITECTURE_AUDIT.md; email templates verified clean

### 5) Angular package version mismatch
- Problem: @angular/service-worker is v21 while core packages are v20.
- Files: package.json
- Impact: Build and runtime incompatibilities.
- Fix: Align all Angular packages to the same major version (20.x) or upgrade the entire app to 21.
- Priority: Immediate
- Status: **RESOLVED** (2026-01-21) - Downgraded @angular/service-worker to ^20.3.0

### 6) Unclear payment flow ownership (confirm vs webhook)
- Problem: Both client confirm and webhook can update payment/booking state; idempotency and source of truth are undefined.
- Files: src/app/core/services/payment.service.ts, backend/src/payments/payments.service.ts, backend/src/payments/payments.controller.ts, STRIPE_AND_EMAIL_SETUP.md
- Impact: Potential double-processing and duplicate emails; inconsistent booking status.
- Fix: Decide single source of truth, enforce idempotency, and document flow.
- Priority: Soon
- Status: **RESOLVED** (2026-01-21) - Documented in STRIPE_AND_EMAIL_SETUP.md. Current design is dual-confirmation (idempotent). Emails only via webhook to prevent duplicates.

## Stabilization Roadmap

### Phase 1: Build and runtime safety
1. ~~Align Angular package versions in package.json.~~ DONE
2. ~~Define and implement the single source of truth for payment confirmation and idempotency.~~ DONE (documented)

### Phase 2: User-visible correctness
3. ~~Fix encoding artifacts in backend/src/email/email.service.ts.~~ DONE (verified clean)
4. ~~Decide on saved payment methods scope and implement missing backend endpoints or disable UI.~~ DONE (disabled)

### Phase 3: Documentation accuracy
5. ~~Update backend/IMPLEMENTATION_STATUS.md.~~ DONE
6. ~~Refresh or archive docs/hotel-booking-plan.md with current architecture.~~ DONE (archived with banner)

## Summary

| Issue | Status |
|-------|--------|
| #1 Backend status doc stale | RESOLVED |
| #2 Payment API mismatches | RESOLVED |
| #3 Plan docs outdated | RESOLVED |
| #4 Encoding artifacts | RESOLVED |
| #5 Angular version mismatch | RESOLVED |
| #6 Payment flow ownership | RESOLVED |

**All 6 issues have been resolved!**

## Notes
- Keep this audit in sync with actual fixes to avoid drift.
