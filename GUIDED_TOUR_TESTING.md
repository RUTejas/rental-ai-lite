# Guided tour verification

The tour stores guest progress under `rentwise_tour_v1_guest` and signed-in progress under a key containing the user ID and role. Remove the relevant key in browser developer tools when repeating a first-visit test.

## Guest checks

1. Open `/` with no saved tour key and confirm the welcome card appears after the loading screen.
2. Choose **Start Guide** and verify the spotlight moves through the landing hero, features, roles, account actions, and install link.
3. Use **Back**, **Next**, **Skip**, **Finish**, Escape, and keyboard Tab navigation.
4. Refresh after Skip or Finish and confirm the tour does not automatically reopen.
5. Choose **Start App Guide** in the footer and confirm the welcome card reopens.

## Signed-in role checks

1. Sign in as Tenant and verify only tenant overview, navigation, rent, bills, documents, and help steps appear.
2. Sign in as Admin and verify tenant management, rent, bills, analytics, and protected record-management steps.
3. Sign in as Master Admin and verify owners, all tenants, analytics, live usage, activity, and deleted-record steps.
4. On each dashboard, use the question-mark button in the top bar to replay the guide.
5. Confirm navigation changes automatically and missing or empty targets are skipped without an error.

## Responsive and persistence checks

1. Test desktop, tablet, and a 360px-wide phone viewport.
2. Confirm the mobile navigation opens for its guide step and closes before content steps.
3. Confirm tooltips remain inside the viewport and use the mobile bottom-sheet layout.
4. Confirm separate users and roles keep separate completion status.
5. In Master Admin live analytics, confirm Tour started, Tour completed, and Tour skipped counts update.
