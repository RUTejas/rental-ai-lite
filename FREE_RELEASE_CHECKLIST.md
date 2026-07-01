# Release checklist

- [ ] Vercel migration, seed, and build succeeded.
- [ ] Homepage, signup, login, owner, tenant, and Master Admin flows work.
- [ ] `/manifest.json`, 192px icon, 512px icon, maskable icon, and service worker return 200.
- [ ] `/install`, `/download`, all policy/support pages, and refresh/deep links work without login.
- [ ] Android PWA install, iPhone Add to Home Screen (if available), and desktop install were tested.
- [ ] Mobile layouts have no page-level horizontal overflow; forms, modals, tables, cards, and touch targets are usable.
- [ ] No fake APK button/link, exposed secret, console error, missing image, or private response in Cache Storage.
- [ ] Real support email and legally reviewed policy/terms are published.
- [ ] If using TWA, final Play App Signing fingerprint has replaced the Asset Links placeholder.

Share: main app `https://rental-ai-lite.vercel.app/`, install page `https://rental-ai-lite.vercel.app/install`, optional download page `https://rental-ai-lite.vercel.app/download`.
