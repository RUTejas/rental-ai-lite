# Optional free APK build

PWA installation is preferred. APK sideloading is optional, should be generated locally, and must not be committed to Git.

Prerequisites: Node.js, Java JDK, Android Studio or Android command-line tools, and Bubblewrap CLI.

```powershell
npm install -g @bubblewrap/cli
bubblewrap init --manifest https://rental-ai-lite.vercel.app/manifest.json
bubblewrap build
```

Use app name `RentWise Lite`, short/launcher name `RentWise`, package `com.tejas.rentwiselite`, host `rental-ai-lite.vercel.app`, and start URL `/`. A successful build can produce an APK for local testing and an AAB for Play distribution. Do not claim either exists until the command succeeds.

Replace `public/.well-known/assetlinks.json` with the generated statement, redeploy, and verify `https://rental-ai-lite.vercel.app/.well-known/assetlinks.json`. Never hard-code signing passwords or commit `.apk`, `.aab`, `.jks`, `.keystore`, or signing configuration. If distributing a real signed APK for free, use an official GitHub Release and configure `ANDROID_APK_URL`.
