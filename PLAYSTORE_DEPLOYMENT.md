# RentWise Lite — Trusted Web Activity / Play Store deployment

The website remains the source of truth. Bubblewrap packages the HTTPS PWA as a Trusted Web Activity (TWA); it does not copy private application data into the Android bundle.

## 1. Deploy and verify the PWA

Deploy this repository to Vercel and confirm these return HTTP 200:

- `https://rental-ai-lite.vercel.app/manifest.json`
- `https://rental-ai-lite.vercel.app/icons/icon-192.png`
- `https://rental-ai-lite.vercel.app/icons/icon-512.png`
- `https://rental-ai-lite.vercel.app/.well-known/assetlinks.json`

The committed Asset Links file is a placeholder and does not verify ownership yet.

## 2. Install Bubblewrap

```powershell
npm install -g @bubblewrap/cli
```

Use a supported Java JDK and Android SDK. Let Bubblewrap download/configure compatible command-line dependencies when prompted.

## 3. Initialize the TWA

Run this outside the web repository or in a separately ignored packaging folder:

```powershell
bubblewrap init --manifest https://rental-ai-lite.vercel.app/manifest.json
```

Suggested answers:

- App name: `RentWise Lite`
- Short name / launcher name: `RentWise`
- Package name / application ID: `com.tejas.rentwiselite`
- Host: `rental-ai-lite.vercel.app`
- Start URL: `/`
- Display mode: `standalone`

Choose and securely back up a production keystore. Never commit the keystore, passwords, `keystore.properties`, APK, or AAB files.

## 4. Build the Android App Bundle

```powershell
bubblewrap build
```

Bubblewrap prints the output locations. The release bundle is normally named `app-release-bundle.aab` in the generated Android project root. A generated APK may also be present for local device testing. Only report either artifact as generated after this command succeeds.

## 5. Replace Digital Asset Links

1. Copy the statement/fingerprint produced for the Android package into `public/.well-known/assetlinks.json`, replacing the entire placeholder array.
2. Keep package name `com.tejas.rentwiselite` consistent everywhere.
3. After enabling Play App Signing, obtain the **App signing key certificate SHA-256 fingerprint** from Play Console. Play-distributed builds are signed with that certificate, which can differ from your upload/local key.
4. Add the Play app-signing fingerprint to `sha256_cert_fingerprints` (you may retain the local signing fingerprint as a second entry for local TWA tests).
5. Redeploy Vercel and verify the public JSON before testing again.

## 6. Upload to Google Play Console

1. Create the app in Play Console with package name `com.tejas.rentwiselite`.
2. Complete App access, Ads, Content rating, Target audience, Data safety, privacy policy, category, store listing, and contact details accurately.
3. Upload `app-release-bundle.aab` to an internal testing release first.
4. Resolve all automated checks, install from the Play test link, and confirm the address bar does not appear (Asset Links verified).
5. Continue through required closed testing, production access, and review steps shown for your developer account.

For personal developer accounts created after 13 November 2023, Google's current rule requires a closed test with at least 12 testers continuously opted in for 14 days before applying for production access. Record tester feedback and fixes because the production-access application asks about the test and launch readiness. Always follow the requirement displayed in your own Play Console if Google changes it.

Do not upload a debug APK. Google Play production releases use the `.aab` file.
