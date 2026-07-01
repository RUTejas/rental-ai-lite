# Unified login manual test checklist

1. Open `/`, choose **Sign in**, and confirm the same email/password form is used for every role.
2. Sign in as the Master Admin and confirm redirect to `/master-admin/dashboard`.
3. Sign in as an active Admin and confirm redirect to `/admin/dashboard`.
4. Sign in as a Tenant and confirm redirect to `/user/dashboard`.
5. Confirm an unauthenticated visit to each dashboard returns to `/`.
6. Confirm a Tenant or Admin cannot open `/master-admin/dashboard` and reaches `/unauthorized`.
7. Submit public signup with an edited request containing `role: "MASTER_ADMIN"`; expect HTTP 400.
8. Confirm a pending or blocked Admin cannot sign in.
9. Log out from each role and confirm protected pages are no longer accessible.
10. Refresh each permitted dashboard route and confirm it renders without a 404.
11. Confirm the repository has no active hidden-key login route or Master Admin setup/reset API.
