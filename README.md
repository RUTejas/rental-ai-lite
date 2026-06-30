# RentWise Lite

RentWise Lite is a Vercel-ready rental utility-bill tracker built with Next.js, TypeScript, Tailwind CSS, Prisma, and PostgreSQL.

It provides a deliberately simple two-stage record:

1. A tenant self-reports whether an electricity or water bill has been paid.
2. Their owner/admin reviews that claim and records the final verification status.

Master Admin can monitor bills across all owners without overriding an owner’s verification workflow. RentWise Lite does **not** process payments, connect to banks, or generate receipts.

Created and Developed by Tejas R U.

## Features

- Premium public landing page with an original optimized rental hero image.
- Separate Master Admin secure access at `/master-admin`; public signup remains limited to Tenant and Owner/Admin.
- One-time Master Admin setup and protected password recovery use a server-held setup key and close after the first Master Admin is created.
- Working owner/tenant login and signup flows with password visibility controls and role-aware redirects.
- Reusable responsive sidebar navigation, stats cards, status badges, data tables, empty states, modals, loading indicators, and toasts.
- Admins create electricity and water bills for tenants assigned to their account.
- Admins can add, edit, and remove only tenants assigned to their account, with confirmation before deletion.
- Tenants mark their own bills as paid or not paid and add or edit a note.
- Admins verify paid claims, mark bills unpaid or overdue, reject claims, waive bills, and add a note.
- Master Admin sees all owners, tenants, statuses, timestamps, notes, and global bill metrics.
- Master Admin can approve, block, and unblock owners; blocked owners lose session and login access immediately.
- Support reports have lifecycle status and Master Admin notes, and activity logs cover authentication, registrations, payment claims, document verification, and account controls.
- Server-side role and ownership checks protect every bill read and update.
- Passwords are hashed with bcrypt and login sessions use signed, HTTP-only cookies.
- PostgreSQL provides durable storage suitable for Vercel.
- Invalid URLs render a branded 404 page.
- Monthly rent records use the same tenant self-report and owner verification separation as utility bills.
- Tenants can upload signed agreements and ID proofs (PDF/JPG/PNG, 2 MB maximum) for their linked owner to verify or reject with a reason.
- Master Admin and Owner analytics use real scoped PostgreSQL data with rent, utility, verification, owner ranking, and document metrics.
- Account recovery and sign-in/create-account issue forms create trackable support requests without exposing whether an email exists.
- A role-scoped RentWise AI assistant answers rent, bill, document, complaint, receipt, owner, and live-usage questions without an external API key.
- Privacy-conscious user sessions track app page, device family, browser, operating system, activity time, and online presence without raw IP addresses.
- Master Admin live analytics include active users, device/browser/OS/role/age distributions, pages, peak hours, session duration, and new-versus-returning users.
- Tenants raise maintenance complaints; owners resolve them; Master Admin sees the global complaint queue and analytics.
- Verified rent payments create protected downloadable receipts, while notices, notifications, agreement expiry dates, and the rental calendar keep users informed.

## Status model

Tenant self-status:

- Not Marked
- Tenant Marked Paid
- Tenant Marked Not Paid

Admin verified-status:

- Pending
- Verified Paid
- Unpaid
- Overdue
- Waived
- Rejected Claim

Tenant payment status is self-reported. Admin verification is the final record status.

## Local setup

Requirements: Node.js 20.19 or newer (Node.js 22 recommended) and a PostgreSQL database.

```bash
copy .env.example .env
npm install
npm run db:push
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Set these values in `.env` before running the database commands:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
SESSION_SECRET="a-long-random-secret"
MASTER_ADMIN_ALLOWED_EMAIL="master-admin@example.com"
MASTER_ADMIN_PASSWORD="a-unique-strong-password"
MASTER_ADMIN_SETUP_KEY="a-separate-random-setup-and-recovery-key"
MASTER_ADMIN_INVITE_CODE="an-optional-separate-one-time-invite-code"
MASTER_ADMIN_CREATION_ENABLED="false"
```

Generate a suitable session secret in PowerShell with:

```powershell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }))
```

## Demo accounts

After `npm run db:seed`, use:

| Role | Email | Password |
| --- | --- | --- |
| Admin / Owner | `aarav.owner@rentwise.ai` | `Owner@12345` |
| Admin / Owner | `meera.owner@rentwise.ai` | `Owner@22345` |
| Tenant | `priya.tenant@rentwise.ai` | `Tenant@12345` |
| Tenant | `kabir.tenant@rentwise.ai` | `Tenant@22345` |
| Tenant | `anaya.tenant@rentwise.ai` | `Tenant@32345` |

The seed creates or updates the single Master Admin only when `MASTER_ADMIN_ALLOWED_EMAIL` and `MASTER_ADMIN_PASSWORD` are configured. The private `/master-admin` route accepts only that allowlisted email. For first-time web setup, temporarily set `MASTER_ADMIN_CREATION_ENABLED=true`; setup permanently closes after the account exists, then set the flag back to `false`. Never expose these values in client code.

## Test the complete bill flow

1. Run the setup and seed commands above.
2. Sign in as `aarav.owner@rentwise.ai`.
3. Add an electricity or water bill for Priya Tenant.
4. Sign out, then sign in as `priya.tenant@rentwise.ai`.
5. Open **My Bills**, add a note, and choose **Mark as Paid** or **Mark as Not Paid**.
6. Sign back in as Aarav Owner. Confirm the tenant status, marked date, and note are visible.
7. Add an admin note and choose **Verify as Paid**, **Mark Unpaid**, **Mark Overdue**, **Reject Claim**, or **Waive Bill**.
8. Sign back in as Priya and confirm the final owner status and note are visible.
9. Open `/master-admin`, sign in with the protected Master Admin credentials, and confirm the record appears in **All Utility Bills** and the global metrics.
10. Sign in as Meera Owner and confirm Aarav’s tenants and bills are not visible.

The API independently checks these boundaries; hiding controls in the interface is not the security mechanism.

## Deploy on Vercel

1. Create a PostgreSQL database with a Vercel-compatible provider such as Neon, Supabase, or Vercel Marketplace Postgres.
2. Copy the production `DATABASE_URL` into a local `.env` and run:

   ```bash
   npm install
   npm run db:push
   npm run db:seed
   ```

3. Push this project to GitHub.
4. Go to Vercel and click **Add New Project**.
5. Import the GitHub repository. Keep the repository root as the Root Directory.
6. Confirm the Framework Preset is **Next.js**.
7. Add `DATABASE_URL`, `SESSION_SECRET`, `MASTER_ADMIN_ALLOWED_EMAIL`, `MASTER_ADMIN_PASSWORD`, `MASTER_ADMIN_SETUP_KEY`, and `MASTER_ADMIN_CREATION_ENABLED=false` in **Project Settings → Environment Variables**. Use different high-entropy values for the password and setup key.
8. Click **Deploy**.

`vercel.json` supplies the install, development, and build commands. After deployment, no long-running backend service is required: authentication and bill operations run as Next.js route handlers on Vercel.

## Verification commands

```bash
npm run lint
npm run build
npm run start
```

`npm run start` serves the completed production build at [http://localhost:3000](http://localhost:3000).

## Master Admin security notes

- General `/api/auth/login` rejects Master Admin accounts; they can authenticate only through `/api/auth/master/login`.
- `/master-admin/dashboard` performs a server-side role check before rendering, and every Master API repeats the role check.
- Owner signup creates a `PENDING` account. Master Admin approval changes it to `ACTIVE`; `BLOCKED` accounts cannot establish or retain a valid session.
- The setup key or invite code is compared server-side and is never returned by an API.
- Usage analytics intentionally exclude raw IP addresses, passwords, document contents, and unrelated browsing activity.
