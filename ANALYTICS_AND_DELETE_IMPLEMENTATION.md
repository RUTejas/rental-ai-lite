# First-party analytics and protected deletion

## Analytics tracked

The app stores first-party `AnalyticsSession` and `AnalyticsEvent` records in the existing PostgreSQL database. A random visitor ID is kept in first-party local storage and a random session ID in session storage. Events include app/session open, page views, visible-tab heartbeat, install page/button/prompt outcome, `appinstalled`, standalone launch, download page/click/redirect, and account deletion requests. Authenticated identity/role is attached by the server, never trusted from the browser.

Stored context is coarse device category, browser, OS, PWA mode, screen dimensions, sanitized path, and referrer without query parameters. The system does **not** store passwords, tokens, exact GPS, device serials, raw IP addresses, uploaded-document content, or cross-site advertising identifiers in analytics.

Unique visitors are distinct random visitor IDs. Sessions are distinct browser-session IDs. “Active now” means a heartbeat/visit within five minutes. Day boundaries use UTC. PWA installation cannot be perfectly counted: `Install accepted`, `appinstalled`, and later standalone launches are separate signals. APK metrics are clicks/redirects, not confirmed installations.

## Metric meanings

- Unique visitors: distinct first-party visitor IDs.
- Sessions: distinct browser-session IDs.
- Active now: sessions seen in the last five minutes.
- App opens: first app load in a browser session.
- Standalone launches: loads detected in standalone display mode.
- Install clicks: clicks on the real install/manual-steps control.
- Install accepted/dismissed: browser prompt result where supported.
- APK download clicks/redirects: official button and configured redirect activity, not installs.

## Endpoints and access

- `POST /api/analytics/track`: public write-only, schema allowlist, size limits, basic per-session rate limiting, no sensitive response.
- `GET /api/master/analytics/summary`: Master Admin only.
- `GET /api/master/analytics/realtime`: Master Admin only, five-minute window.
- `GET /api/download/android`: redirects only to the server-configured HTTPS `ANDROID_APK_URL` and records a redirect when valid anonymous IDs are supplied.

The Master Admin **Website & app analytics** view contains accurate cards, 30-day series, device/browser/role breakdowns, top pages, live sessions, recent events, and delete/restore audit entries. Empty data is shown as empty—not fabricated.

## Delete behavior and roles

Important business entities use soft deletion (`isDeleted`, `deletedAt`, `deletedBy`, `deletedByRole`, `deleteReason`): owners, tenants, properties, rent records, utility bills, rental documents, complaints, rent receipts, notices, and support requests. Normal queries exclude deleted records. Master Admin can view and restore these in Deleted Records; restore is also audited. There is no normal UI/API for deleting audit logs or the sole Master Admin.

- Tenant: may remove only their own pending/rejected upload and a newly submitted complaint where allowed.
- Owner/Admin: may remove only in-scope tenants, properties, bills, rent records, owned notices, eligible complaints, and eligible rejected documents.
- Master Admin: global governance, restore, owner/support management; cannot use public signup and cannot delete the protected Master Admin account.

Each delete API authenticates, checks role and ownership, validates `DELETE` plus a reason, updates the database, writes an `ActivityLog`, and returns a safe error. The shared UI shows the entity, recoverability warning, reason, confirmation, loading, success/error feedback, and refreshes local data. Uploaded document content is stored in the same soft-deleted database row so restore remains consistent; permanent storage purge is intentionally not exposed through normal UI.

## Testing

Run Prisma generation, TypeScript/build, lint, then test authorized and unauthorized deletion for every displayed entity, Deleted Records restore, analytics write failure tolerance, Master-only analytics reads, install prompt supported/unsupported paths, standalone launch, and APK unavailable/configured states.
