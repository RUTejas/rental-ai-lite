# Master Admin setup and access

RentWise Lite uses one public sign-in form for tenants, admins, and the Master Admin. The server reads the authenticated account's database role and sends it to the correct dashboard. There is no hidden login URL, query-string key, or browser-visible Master Admin secret.

## Required environment variables

Set these in Vercel Production (and Preview only when you intentionally test there):

```text
DATABASE_URL=postgresql://...
SESSION_SECRET=<at least 32 random characters>
MASTER_ADMIN_EMAIL=<real owner email>
MASTER_ADMIN_INITIAL_PASSWORD=<12+ characters with upper/lowercase, number, symbol>
```

Never prefix secrets with `NEXT_PUBLIC_`.

## Create or update the single Master Admin

Run:

```powershell
npm run db:seed
```

The seed creates the Master Admin when none exists, or updates the existing Master Admin's email and password. It stops with an error if the database already contains more than one Master Admin or the configured email belongs to another account. A database unique index also prevents a second Master Admin.

For compatibility during migration, the seed accepts the old `MASTER_ADMIN_PASSWORD` variable only when `MASTER_ADMIN_INITIAL_PASSWORD` is absent. Add the new variable and remove the old one after a successful deployment.

## Sign in

Open:

```text
https://rental-ai-lite.vercel.app/
```

Choose **Sign in**, then enter the Master Admin email and password. Successful authentication redirects to `/master-admin/dashboard`. Admins go to `/admin/dashboard`; tenants go to `/user/dashboard`.

Public signup can create only Admin or Tenant accounts. It cannot create or promote a Master Admin.

## Password recovery and rotation

Update `MASTER_ADMIN_INITIAL_PASSWORD` in Vercel and redeploy. The build seed hashes the new value and updates the one Master Admin record. After confirming the new password works, keep the value private and rotate it whenever access may have been exposed.

The retired variables `MASTER_ADMIN_SECRET_KEY`, `MASTER_ADMIN_SETUP_KEY`, `MASTER_ADMIN_INVITE_CODE`, and `MASTER_ADMIN_CREATION_ENABLED` are no longer used and can be deleted from Vercel after this version is deployed successfully.
