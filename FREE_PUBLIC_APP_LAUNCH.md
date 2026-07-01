# Free public PWA launch

RentWise Lite remains publicly available at `https://rental-ai-lite.vercel.app/`. Users can install the live HTTPS app from `https://rental-ai-lite.vercel.app/install` without a Play Store or paid conversion service. Android, iPhone/iPad, and desktop instructions are included on that page.

## Recommended method

- Android: open the site in Chrome/Edge/Samsung Internet → browser menu → Install app/Add to Home screen.
- iPhone/iPad: open in Safari → Share → Add to Home Screen.
- Desktop: use the install icon/menu in Chrome or Edge.

The service worker caches only the offline explanation, manifest, and icons. It does not cache authentication, API data, dashboards, uploaded files, bills, rent, or user records.

## Optional APK distribution

Build an APK locally only if needed, publish it as a real GitHub Release asset, set `ANDROID_APK_URL` in Vercel, optionally set `NEXT_PUBLIC_ANDROID_APK_VERSION`, and redeploy. `/download` exposes an active button only when the server-side HTTPS URL is configured. Never commit APKs or signing material.

For a GitHub Release: build locally, create a version tag such as `v1.0.0`, attach the signed APK, publish, copy the direct asset URL into `ANDROID_APK_URL`, and redeploy. Sideloading is less trusted than browser installation; users should disable unknown-app permission afterward.

## Test before sharing

Check `/manifest.json`, all icon paths, `/install`, `/download`, `/privacy-policy`, `/terms`, `/contact-support`, `/delete-account`, offline fallback, Android installability, iOS Add to Home Screen, desktop install, refresh/deep routes, console errors, Vercel build, HTTPS, and that private APIs never appear in Cache Storage.

Free QR options: use a browser's built-in “Create QR code” feature or an audited open-source local QR tool for `https://rental-ai-lite.vercel.app/install`. No paid QR service is required.
