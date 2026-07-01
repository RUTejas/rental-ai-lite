# Master Admin analytics and deletion manual tests

1. Open `/` as a guest; confirm `session_start`, `app_open`, and `page_view` rows persist.
2. Navigate to a public page; confirm the same visitor/session IDs and updated path/page count.
3. Sign in as tenant; confirm later events receive server-derived `TENANT` role.
4. Install/open as PWA; confirm standalone mode records `standalone_launch` once per browser session.
5. Open `/install`; test prompt available, accepted/dismissed, and unsupported/manual paths without fake failure counts.
6. Open `/download`; without `ANDROID_APK_URL`, confirm no active download button. With a trusted HTTPS URL, confirm click and redirect events.
7. Sign in as Master Admin through the common sign-in form at `/`; confirm redirect to `/master-admin/dashboard`, then verify Website & app analytics.
8. Call summary/realtime while signed out, as tenant, and as admin; expect 401/403 and no data.
9. Confirm active sessions disappear five minutes after heartbeats stop.
10. Delete each eligible entity from its owning role; confirm typed confirmation, reason, UI removal, soft-delete fields, and audit log.
11. Attempt tenant/admin deletion against another owner's ID and protected states; expect 403/404.
12. Restore deleted records as Master Admin; confirm list recovery and restore audit entry.
13. Confirm the sole Master Admin and audit logs have no normal delete action.
14. Logout/re-login and verify sessions, restricted routes, and Deleted Records remain correct.
15. Deploy to Vercel and repeat public route, HTTPS, manifest, service-worker, unified sign-in, and role-redirect checks.
