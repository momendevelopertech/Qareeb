# Qareeb Deep Audit & Refactor Plan

## 1) Findings Report

[SECURITY] Insecure JWT fallback secret allows token forgery in misconfigured environments  
Location: `apps/api/src/auth/auth.module.ts`, `apps/api/src/auth/auth.service.ts`, `apps/api/src/auth/jwt.strategy.ts`  
Severity: Critical  
Description: Authentication falls back to `'dev-secret-key'` when key material is missing. This makes JWT signing/verifying predictable and forgeable when environment variables are absent or misconfigured.  
Risk if ignored: Attackers can mint valid access/refresh tokens and gain admin-level access.

[SECURITY] Refresh token cookie policy is weaker than required baseline  
Location: `apps/api/src/auth/auth.controller.ts`  
Severity: High  
Description: Refresh cookie uses `SameSite` from env defaulting to `lax` and `path: '/'`; strict isolation for auth-only scope is not enforced by default.  
Risk if ignored: Increased CSRF/session riding exposure and broader cookie surface across unrelated routes.

[SECURITY] Missing CSRF verification on cookie-authenticated endpoints  
Location: `apps/api/src/auth/auth.controller.ts`, `apps/api/src/main.ts`, `apps/web/src/lib/api.ts`  
Severity: High  
Description: Cookie-based refresh flow (`credentials: include`) has no synchronizer token/double-submit verification despite allowing `X-CSRF-Token` header.  
Risk if ignored: Cross-site requests can abuse refresh/logout/password-change style flows where browser sends cookies automatically.

[SECURITY] Cloudinary signing endpoint is public  
Location: `apps/api/src/media/media.controller.ts`  
Severity: High  
Description: `POST /media/sign` is not guarded, enabling unauthenticated signature generation and potential abuse of upload quota/storage.  
Risk if ignored: Resource exhaustion, unauthorized uploads, billing/abuse incidents.

[SECURITY] Sensitive settings may be stored in plaintext  
Location: `apps/api/src/modules/settings/settings.service.ts`  
Severity: High  
Description: If `SETTINGS_ENCRYPTION_KEY` is absent, secret values are stored as `plain:<value>` with only a warning log.  
Risk if ignored: Database compromise or lower-privileged access reveals API secrets (Cloudinary, integrations).

[SECURITY] No startup env schema validation  
Location: `apps/api/src/app.module.ts`, `apps/api/src/main.ts`  
Severity: Medium  
Description: Config is loaded from env without Joi/Zod schema validation, allowing unsafe defaults and silent misconfiguration.  
Risk if ignored: Security controls may silently downgrade (CORS/JWT/cookie/redis behavior).

[ARCHITECTURE] Controllers and services rely on untyped inline request bodies and `any`  
Location: `apps/api/src/auth/auth.controller.ts`, `apps/api/src/imams/imams.controller.ts`, `apps/api/src/search/search.service.ts`, `apps/web/src/lib/api.ts`, `apps/web/src/lib/store.ts`  
Severity: Medium  
Description: Multiple routes bypass DTOs for request bodies; frontend API/store layers use pervasive `any`, weakening contract safety and maintainability.  
Risk if ignored: Runtime validation gaps, regressions during refactors, weak editor/tooling guarantees.

[ARCHITECTURE] No global exception filter / inconsistent error shape  
Location: `apps/api/src/main.ts`  
Severity: Medium  
Description: API depends on default Nest exception responses and ad-hoc thrown `Error`s across services, creating inconsistent response payloads.  
Risk if ignored: Frontend error handling becomes brittle and telemetry/monitoring is noisy.

[PERFORMANCE] Redis invalidation uses `KEYS` pattern scan  
Location: `apps/api/src/cache/cache.service.ts`  
Severity: Medium  
Description: `deleteByPrefix` calls `redis.keys(prefix*)`, which blocks Redis on large keyspaces.  
Risk if ignored: Latency spikes and cache-node instability under production load.

[PERFORMANCE] Frequent status-filtered queries lack explicit indexes in some models  
Location: `apps/api/prisma/schema.prisma`, `apps/api/src/halaqat/halaqat.service.ts`, `apps/api/src/maintenance/maintenance.service.ts`, `apps/api/src/search/search.service.ts`  
Severity: Medium  
Description: `Halqa` and `MaintenanceRequest` are filtered by `status='approved'` frequently, but schema has no explicit status index for those models.  
Risk if ignored: Slower reads and higher DB CPU as data volume grows.

[I18N] Large amount of user-facing copy bypasses `next-intl` catalogs  
Location: `apps/web/src/components/chat/ChatWidget.tsx`, `apps/web/src/app/[locale]/page.tsx`  
Severity: Medium  
Description: Strings are hardcoded with locale ternaries instead of catalog keys, reducing translation consistency and scalability.  
Risk if ignored: Translation drift, harder localization QA, inconsistent bilingual UX.

[I18N] Backend chat responses are hardcoded Arabic and not translatable  
Location: `apps/api/src/chat/chat.service.ts`  
Severity: Medium  
Description: Chat service emits literal Arabic/English strings directly from backend logic.  
Risk if ignored: Inability to localize backend-originated messages cleanly on frontend.

[RELIABILITY] Dynamic raw SQL helper uses `$queryRawUnsafe`  
Location: `apps/api/src/search/search.service.ts`  
Severity: Low  
Description: Table name interpolation currently uses an enum-derived value, but the unsafe API broadens blast radius for future changes.  
Risk if ignored: Future edits may accidentally introduce SQL injection paths.

[DX] Excessive `'use client'` at route level limits App Router server-component benefits  
Location: multiple under `apps/web/src/app/[locale]/**/page.tsx`  
Severity: Low  
Description: Many pages are fully client components; data-fetching/serialization opportunities for server components are underused.  
Risk if ignored: Larger JS payloads, reduced SEO/perf headroom, harder caching strategy.

[SECURITY] Client-side geolocation fallback calls third-party IP API directly  
Location: `apps/web/src/components/chat/ChatWidget.tsx`  
Severity: Low  
Description: Browser calls `https://ipapi.co/json/` and reverse geocoding directly; privacy policy/consent boundaries are unclear.  
Risk if ignored: Potential compliance/privacy concerns and brittle behavior if provider throttles requests.

---

## 2) Task List (Prioritized)

TASK-001 | [SECURITY] | Priority: P0  
Title: Remove insecure JWT fallback secrets and enforce key presence  
Scope: `apps/api/src/auth/*`, config bootstrap  
What to do: Replace `'dev-secret-key'` fallbacks with strict startup failure when required JWT material is missing; keep HS/RS mode explicit and validated.  
What NOT to touch: Existing endpoint URLs, JWT payload fields (`sub/email/role/typ`), token TTL semantics.  
How to verify: Boot without JWT env should fail fast; boot with correct env should preserve login/refresh behavior and guard checks.  
Estimated effort: S

TASK-002 | [SECURITY] | Priority: P0  
Title: Add CSRF defense for cookie-based auth flows  
Scope: Auth controller, Nest middleware/guard, frontend API client  
What to do: Implement double-submit (or synchronizer) token for endpoints using `credentials: include`; validate token server-side.  
What NOT to touch: Access-token authorization header flow and response shape.  
How to verify: Valid token requests succeed; forged cross-site request without CSRF token fails (403).  
Estimated effort: M

TASK-003 | [SECURITY] | Priority: P1  
Title: Harden refresh cookie attributes and scope  
Scope: `apps/api/src/auth/auth.controller.ts`  
What to do: Default to `SameSite=Strict`, constrain cookie `path` to refresh route, enforce `secure` in non-local environments, keep domain validation.  
What NOT to touch: Cookie name and remember-me expiry policy.  
How to verify: Browser devtools shows strict attributes; refresh flow still works in intended environments.  
Estimated effort: XS

TASK-004 | [SECURITY] | Priority: P1  
Title: Protect Cloudinary signature issuance  
Scope: `apps/api/src/media/media.controller.ts`, media service  
What to do: Add guard/role or signed short-lived nonce policy to `POST /media/sign`; optionally rate-limit endpoint separately.  
What NOT to touch: Existing signed payload contract consumed by frontend uploader.  
How to verify: Unauthorized call rejected; authorized upload flow still succeeds.  
Estimated effort: S

TASK-005 | [SECURITY] | Priority: P1  
Title: Enforce encrypted secret setting storage  
Scope: `apps/api/src/modules/settings/settings.service.ts`, startup checks  
What to do: Disallow saving `isSecret=true` values when encryption key is absent; provide migration utility for existing `plain:` records.  
What NOT to touch: Public non-secret settings behavior and API shape for settings endpoints.  
How to verify: Secret upsert fails without key; succeeds with key; legacy plaintext entries can be migrated and read.  
Estimated effort: M

TASK-006 | [SECURITY] | Priority: P1  
Title: Add environment schema validation at startup  
Scope: `app.module.ts`, dedicated config schema module  
What to do: Validate required envs (JWT, CORS, COOKIE, REDIS, CLOUDINARY, SETTINGS_ENCRYPTION_KEY) with Joi/Zod and fail fast on invalid values.  
What NOT to touch: Runtime module wiring and route contracts.  
How to verify: Invalid env values stop boot with actionable errors; valid env boots normally.  
Estimated effort: S

TASK-007 | [ARCHITECTURE] | Priority: P1  
Title: Standardize request DTOs and remove inline body shapes  
Scope: auth/imams/halaqat/maintenance/admin controllers  
What to do: Introduce DTO classes for inline bodies (`login`, `change-password`, `reject reason`, etc.) with class-validator annotations.  
What NOT to touch: Endpoint URLs and accepted field names.  
How to verify: Existing requests pass; malformed payloads now fail with validation errors.  
Estimated effort: M

TASK-008 | [ARCHITECTURE] | Priority: P2  
Title: Add global exception filter with stable error envelope  
Scope: new filter under `common/`, `main.ts` registration  
What to do: Return consistent `{ message, code, details?, requestId? }` structure for all thrown errors.  
What NOT to touch: Success response payloads and HTTP status semantics.  
How to verify: Trigger validation/auth/not-found/internal errors and confirm consistent shape.  
Estimated effort: S

TASK-009 | [PERFORMANCE] | Priority: P2  
Title: Replace Redis `KEYS` invalidation with `SCAN` strategy  
Scope: `apps/api/src/cache/cache.service.ts`  
What to do: Iterate with `SCAN` + batched `DEL`/`UNLINK` for prefix invalidation to avoid blocking Redis.  
What NOT to touch: Cache key format and TTL semantics.  
How to verify: Invalidation correctness maintained; Redis latency stable under synthetic large keyspace test.  
Estimated effort: S

TASK-010 | [PERFORMANCE] | Priority: P2  
Title: Add missing DB indexes for high-frequency filters  
Scope: `apps/api/prisma/schema.prisma` + migration files  
What to do: Add explicit indexes on `Halqa.status`, `MaintenanceRequest.status`, and compound indexes that match hottest list queries.  
What NOT to touch: Existing table/column names and Prisma model field names.  
How to verify: Migration applies cleanly; EXPLAIN plans use new indexes; endpoint latency improves.  
Estimated effort: M

TASK-011 | [I18N] | Priority: P2  
Title: Externalize frontend hardcoded strings to `next-intl` messages  
Scope: `apps/web/src/components/chat/ChatWidget.tsx`, `apps/web/src/app/[locale]/page.tsx`, `apps/web/src/messages/*.json`  
What to do: Move literals into message catalogs and consume via `useTranslations`/server translations APIs.  
What NOT to touch: Copy meaning, routes, and component behavior.  
How to verify: ar/en locales render equivalent content from catalogs; no hardcoded UI copy remains in target files.  
Estimated effort: L

TASK-012 | [I18N] | Priority: P2  
Title: Make backend-originated chat messages localizable  
Scope: `apps/api/src/chat/chat.service.ts`, frontend chat rendering pipeline  
What to do: Return message keys + interpolation params (or locale-aware templates) instead of hardcoded text.  
What NOT to touch: Chat API endpoint path and core intent logic.  
How to verify: Chat still answers same intents; displayed text comes from locale catalogs.  
Estimated effort: M

TASK-013 | [RELIABILITY] | Priority: P2  
Title: Remove `$queryRawUnsafe` from nearest-search path  
Scope: `apps/api/src/search/search.service.ts`  
What to do: Switch to safe query builder/prisma.sql pattern with strict table mapping helper, preserving query behavior.  
What NOT to touch: Search result schema/ordering semantics.  
How to verify: Existing nearest tests/manual checks match current response ordering and payload fields.  
Estimated effort: S

TASK-014 | [DX] | Priority: P3  
Title: Reduce `any` usage in API/store boundaries  
Scope: `apps/web/src/lib/api.ts`, `apps/web/src/lib/store.ts`, selected services  
What to do: Introduce typed response/request interfaces and narrow unknown payload parsing.  
What NOT to touch: Runtime behavior and persisted zustand storage keys.  
How to verify: Typecheck catches previous unsafe accesses; UI behavior unchanged.  
Estimated effort: M

TASK-015 | [DX] | Priority: P3  
Title: Rebalance Server vs Client Components in App Router pages  
Scope: `apps/web/src/app/[locale]/**/page.tsx`  
What to do: Move pure data-fetch/render pages to server components; isolate interactive islands in child client components.  
What NOT to touch: Visible UX, route structure, or admin permissions logic.  
How to verify: `next build` succeeds; JS bundle for refactored pages decreases; behavior parity via manual smoke tests.  
Estimated effort: L

TASK-016 | [SECURITY] | Priority: P3  
Title: Add explicit privacy/consent handling for third-party geolocation fallbacks  
Scope: `apps/web/src/components/chat/ChatWidget.tsx`, privacy docs/settings  
What to do: Gate IP geolocation behind user consent and optional feature flag; consider server-side proxy to avoid exposing provider directly.  
What NOT to touch: Core nearest-search logic and manual area selection flow.  
How to verify: Without consent, no third-party geolocation calls fire; with consent, fallback still works.  
Estimated effort: S

Dependencies:
- TASK-001 precedes TASK-006 (env schema should encode new strict JWT requirements).
- TASK-002 should be completed before TASK-003 verification in production-like browser tests.
- TASK-011 and TASK-012 should be coordinated (frontend and backend message contracts).
- TASK-010 should land before performance benchmarking follow-up.

---

## 3) Suggested Execution Order

### Phase 1 — Security Hardening (P0 + P1 security)
Tasks: TASK-001, TASK-002, TASK-003, TASK-004, TASK-005, TASK-006.  
Deployability check: All tasks are additive hardening with no API contract renames; phase can ship safely after regression tests for login/refresh/admin uploads/settings.

### Phase 2 — Architecture Cleanup (P1 + P2 structure)
Tasks: TASK-007, TASK-008, TASK-013.  
Deployability check: DTO/filter/query safety refactors preserve endpoint contracts and improve error consistency without feature removal.

### Phase 3 — Performance & Reliability (P2)
Tasks: TASK-009, TASK-010, TASK-011, TASK-012.  
Deployability check: Caching/index/i18n-integration changes are incremental and can be feature-flagged where needed; behavior remains functionally equivalent.

### Phase 4 — Polish & DX (P3)
Tasks: TASK-014, TASK-015, TASK-016.  
Deployability check: Developer-experience and component-boundary improvements are non-breaking and can roll out gradually.

