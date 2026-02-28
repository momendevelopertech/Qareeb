# Qareeb Production Security Hardening Guide

This guide is aligned to Qareeb's production architecture (Next.js on Vercel, NestJS API, Prisma/PostgreSQL, Redis, Cloudinary).

## 1) HTTP Security Headers (Frontend)

- Enforce HSTS with preload.
- Deny framing (`X-Frame-Options: DENY`, `frame-ancestors 'none'`).
- Disable MIME sniffing (`X-Content-Type-Options: nosniff`).
- Restrict referrer leakage (`strict-origin-when-cross-origin`).
- Restrict browser capabilities (`Permissions-Policy`).
- CSP tuned for Next.js + Cloudinary (images/media + API + Vercel live tooling).

Implemented in `apps/web/next.config.js` via `headers()`.

## 2) Backend Hardening (NestJS)

- Helmet enabled with strict HSTS, frameguard, referrer policy.
- CORS allow-list only; preview Vercel domains disabled by default.
- Global request validation: `whitelist`, `forbidNonWhitelisted`, transform enabled.
- Body size limits (`REQUEST_BODY_LIMIT`) to reduce abuse risk.
- Global rate limit enabled via Throttler.
- Disable `x-powered-by`, trust proxy set for Vercel.
- Cookie parser enabled for refresh-token flow.

Implemented in `apps/api/src/main.ts` and `apps/api/src/app.module.ts`.

## 3) Authentication Hardening

- Prefer **RS256 in production** with dedicated key pairs.
- Separate access/refresh signing material (`JWT_ACCESS_*`, `JWT_REFRESH_*`).
- Add `iss`, `aud`, `jti`, `typ` claims.
- Verify refresh tokens with refresh key and `typ=refresh`.
- Verify access tokens with access key and `typ=access`.
- Cookie settings: `HttpOnly`, `Secure` in prod, scoped path `/v1/admin/auth`, optional `COOKIE_DOMAIN`.

Implemented in auth module/service/strategy/controller.

## 4) OWASP Top 10 (2023) Mitigation Checklist

- **XSS**: CSP + React auto-escaping, avoid `dangerouslySetInnerHTML`, sanitize rich text.
- **CSRF**: Cookie refresh endpoint + strict CORS; add double-submit CSRF token for all state-changing cookie-auth endpoints.
- **SQL Injection**: Prisma parameterization only; avoid `$queryRawUnsafe`.
- **SSRF**: Validate outbound URLs (Cloudinary/webhooks/maps), deny private CIDRs.
- **Broken Access Control**: Guards + role checks + server-side authorization on every sensitive route.
- **Account Takeover**: Strong password policy, throttled login, account lockout/MFA for admins.
- **Clickjacking**: `X-Frame-Options DENY` + CSP `frame-ancestors 'none'`.
- **File Upload Abuse**: Signed Cloudinary uploads, MIME/size validation, extension allow-list.
- **Sensitive Data Exposure**: TLS-only, encrypted secrets, minimal logs, redaction, short-lived access tokens.

## 5) Prisma + PostgreSQL Security

- Use least-privilege DB role in production (no superuser app role).
- Require TLS connection (`sslmode=require`).
- Enforce migration discipline: apply via CI/CD deploy step with rollback plan.
- Reject raw unsafe SQL, use typed Prisma queries.
- Audit and index sensitive query paths to prevent expensive table scans (DoS angle).

## 6) Redis Security

- Use authenticated Redis URL with strong password.
- Prefer `rediss://` TLS endpoints.
- Keep Redis private-network only.
- Use namespaced keys (`qareeb:prod:*`) to avoid collision/poisoning.
- Disable offline queue and cap retries to reduce retry storms.

Implemented key prefixing and TLS-aware connection setup in `apps/api/src/cache/cache.service.ts`.

## 7) Cloudinary Hardening

- Only server-side signed upload signatures.
- Restrict upload preset and allowed formats (e.g., jpg/jpeg/png/webp/mp4).
- Enforce max file size and transformation constraints.
- Verify MIME/content-type server-side before creating signatures.
- Quarantine or reject SVG/HTML/polyglot payloads.

## 8) Vercel Production Hardening

- Use Vercel encrypted project env vars only.
- Never expose backend secrets via `NEXT_PUBLIC_*`.
- Separate preview/prod env sets and keys.
- Avoid writing secrets in build logs.
- Enable log drains + alerting (Sentry/Datadog/ELK), redact PII and auth tokens.

## 9) SSR & Next.js Security

- Avoid unsafe HTML rendering in Server/Client Components.
- Protect API routes with server-side authz checks.
- Keep middleware minimal and deterministic; avoid parsing untrusted payloads there.
- Apply global security headers through `next.config.js`.
- i18n: validate locale strictly from allow-list (`ar`, `en`) and avoid using locale in filesystem/network paths without mapping.

## 10) Production-Ready Snippets

Use the currently committed files as source-of-truth examples:

- `apps/web/next.config.js` (headers + CSP)
- `apps/api/src/main.ts` (helmet, CORS, validation)
- `apps/api/src/app.module.ts` (rate limiter)
- `apps/api/src/auth/auth.controller.ts` (secure refresh cookie)
- `apps/api/src/auth/auth.service.ts` (JWT claims/rotation primitives)
- `apps/api/src/auth/jwt.strategy.ts` (access token verification)
- `apps/api/src/cache/cache.service.ts` (Redis secure setup)
- `apps/api/src/prisma/prisma.service.ts` (safe DB logging behavior)

### Recommended env vars (prod)

```bash
NODE_ENV=production
CORS_ORIGIN=https://qareeb-web.vercel.app
ALLOW_VERCEL_PREVIEW=false
REQUEST_BODY_LIMIT=1mb
THROTTLE_LIMIT_PER_MINUTE=60
COOKIE_SAMESITE=lax
COOKIE_DOMAIN=.qareeb.app

JWT_ISSUER=qareeb-api
JWT_AUDIENCE=qareeb-web
JWT_ACCESS_PRIVATE_KEY=...
JWT_ACCESS_PUBLIC_KEY=...
JWT_REFRESH_PRIVATE_KEY=...
JWT_REFRESH_PUBLIC_KEY=...
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=1d
JWT_REFRESH_REMEMBER_TTL=30d

DATABASE_URL=postgres://.../qareeb?sslmode=require
REDIS_URL=rediss://:password@redis-host:6379
REDIS_KEY_PREFIX=qareeb:prod:
```
