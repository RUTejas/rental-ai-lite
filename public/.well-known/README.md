# Digital Asset Links placeholder

`assetlinks.json` is intentionally a valid placeholder, not a verified production association. After Bubblewrap creates the Android signing key, replace the entire JSON file with Bubblewrap's generated statement containing the real package name and SHA-256 certificate fingerprint. Redeploy and verify `https://rental-ai-lite.vercel.app/.well-known/assetlinks.json` before submitting or testing the Trusted Web Activity.
