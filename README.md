# RentWise Lite

RentWise Lite is a Vercel-ready rental utility-bill tracker built with Next.js, TypeScript, Tailwind CSS, Prisma, and PostgreSQL.

It provides a deliberately simple two-stage record:

1. A tenant self-reports whether an electricity or water bill has been paid.
2. Their owner/admin reviews that claim and records the final verification status.

Master Admin can monitor bills across all owners without overriding an owner’s verification workflow. RentWise Lite does **not** process payments, connect to banks, or generate receipts.

Created and Developed by Tejas R U.

## Features

- Admins create electricity and water bills for tenants assigned to their account.
- Tenants mark their own bills as paid or not paid and add or edit a note.
- Admins verify paid claims, mark bills unpaid or overdue, reject claims, waive bills, and add a note.
- Master Admin sees all owners, tenants, statuses, timestamps, notes, and global bill metrics.
- Server-side role and ownership checks protect every bill read and update.
- Passwords are hashed with bcrypt and login sessions use signed, HTTP-only cookies.
- PostgreSQL provides durable storage suitable for Vercel.

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
```

Generate a suitable session secret in PowerShell with:

```powershell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }))
```

## Demo accounts

After `npm run db:seed`, use:

| Role | Email | Password |
| --- | --- | --- |
| Master Admin | `master@rentwise.ai` | `Master@12345` |
| Admin / Owner | `aarav.owner@rentwise.ai` | `Owner@12345` |
| Admin / Owner | `meera.owner@rentwise.ai` | `Owner@22345` |
| Tenant | `priya.tenant@rentwise.ai` | `Tenant@12345` |
| Tenant | `kabir.tenant@rentwise.ai` | `Tenant@22345` |
| Tenant | `anaya.tenant@rentwise.ai` | `Tenant@32345` |

Change or remove demo credentials before using the app with real data.

## Test the complete bill flow

1. Run the setup and seed commands above.
2. Sign in as `aarav.owner@rentwise.ai`.
3. Add an electricity or water bill for Priya Tenant.
4. Sign out, then sign in as `priya.tenant@rentwise.ai`.
5. Open **My Bills**, add a note, and choose **Mark as Paid** or **Mark as Not Paid**.
6. Sign back in as Aarav Owner. Confirm the tenant status, marked date, and note are visible.
7. Add an admin note and choose **Verify as Paid**, **Mark Unpaid**, **Mark Overdue**, **Reject Claim**, or **Waive Bill**.
8. Sign back in as Priya and confirm the final owner status and note are visible.
9. Sign in as `master@rentwise.ai` and confirm the record appears in **All Utility Bills** and the global metrics.
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
7. Add `DATABASE_URL` and `SESSION_SECRET` in **Project Settings → Environment Variables** for Production, Preview, and Development as appropriate.
8. Click **Deploy**.

`vercel.json` supplies the install, development, and build commands. After deployment, no long-running backend service is required: authentication and bill operations run as Next.js route handlers on Vercel.

## Verification commands

```bash
npm run lint
npm run build
npm run start
```

`npm run start` serves the completed production build at [http://localhost:3000](http://localhost:3000).

## Current scope

This migration intentionally focuses the former Python prototype into the utility-bill workflow requested here. Account creation, property agreements, document uploads, rent ledgers, and password recovery from the earlier prototype are not included. A production operator should add an invitation/account-management flow and replace the seeded passwords before onboarding real users.
