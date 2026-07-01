# Real Master Admin setup and access

Master Admin access no longer depends on demo accounts. Public signup accepts only `ADMIN` or `TENANT`; the database migration also enforces one `MASTER_ADMIN` row.

## Required Vercel environment variables

Set these for Production (and Preview only if intentionally testing there):

```text
DATABASE_URL=postgresql://...
SESSION_SECRET=<at least 32 random characters>
MASTER_ADMIN_EMAIL=<real owner email>
MASTER_ADMIN_PASSWORD=<12+ chars with upper/lowercase, number, symbol>
MASTER_ADMIN_SECRET_KEY=<long random hidden-route key>
MASTER_ADMIN_SETUP_KEY=<different long random recovery/setup key>
MASTER_ADMIN_CREATION_ENABLED=false
```

Never prefix secrets with `NEXT_PUBLIC_`.

## Create or update the production account with the seed

After setting the environment variables:

```powershell
npm run db:seed
```

The seed creates the first Master Admin if none exists; otherwise it updates that one account's email/password from the environment. Vercel's configured build command runs migrations and this seed before `next build`.

An alternative first-time UI setup exists only when `MASTER_ADMIN_CREATION_ENABLED=true`, no Master Admin exists, the hidden portal key is valid, and the separate setup key is entered. Turn creation back to `false` immediately afterward.

## Sign in

Open this private URL (never publish it in navigation or screenshots):

```text
https://rental-ai-lite.vercel.app/master-admin-login?key=YOUR_SECRET_KEY
```

A correct key creates a short-lived HttpOnly portal grant and removes the key from the visible address. Then sign in with `MASTER_ADMIN_EMAIL` and `MASTER_ADMIN_PASSWORD`. Success redirects to `/master-admin/dashboard`. Missing/wrong keys return the not-found page; users/admins are denied; direct unauthenticated dashboard access does not expose the portal.

## Password, key rotation, and recovery

- Change password: update `MASTER_ADMIN_PASSWORD`, redeploy/run `npm run db:seed`, or use the protected reset form with `MASTER_ADMIN_SETUP_KEY`.
- Rotate hidden URL: replace `MASTER_ADMIN_SECRET_KEY` in Vercel and redeploy. Existing portal grants expire after 15 minutes.
- Rotate recovery: replace `MASTER_ADMIN_SETUP_KEY` and redeploy.
- Locked out after repeated attempts: wait 15 minutes, verify the Vercel variables, then reseed through a trusted deployment environment.
- Lost database access: restore the database/credentials first; no frontend bypass exists.

Demo owner/tenant credentials seed sample rental data and use the normal public sign-in. They cannot become Master Admin, use the hidden API, or access the Master Admin dashboard.
