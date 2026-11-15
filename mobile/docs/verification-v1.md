# CloudyBebe v1 implementation review — 2026-10-25

## Passed

- Full TypeScript and ESLint checks, with no errors or warnings.
- 17 Node tests for account/API transport, session expiry, registry option validation, cart contexts, password redaction, variation identities, checkout headers and authoritative receipt handling.
- Expo exports for iOS, Android and server-rendered web. These are JavaScript/Hermes bundles, not signed installable apps.
- Companion WordPress adapter: 61 isolated REST/security checks and 33 real HTTP checkout checks. See `../../work/mobile-backend-v1/VERIFICATION.md` for fixtures, cleanup and exact limitations.
- Browser review of the actual app: Home, live catalog/categories, Product, Bag and signed-out Registry. Added two Grey Rabbit Richie products, verified $60 subtotal, reloaded and confirmed the bag persisted. An unavailable checkout adapter returned an error while keeping the bag.
- Product options were verified against actual WooCommerce Store API data and the browser UI. Selected 0–6 months on Lavender Ruffle Bamboo Bloomer Headband Set, confirmed live stock/$20 price, added it and verified the same size label in Bag. Temporary browser test items were removed. Public catalog lists exclude hidden products.

## Production connection

The app reads the live catalog. Account, order, registry and cart-to-checkout endpoints require installation and activation of the separate CloudyBebe Mobile API plugin. The production namespace returned404 during verification.

The reviewed plugin ZIP is `../../work/mobile-backend-v1/dist/cloudybebe-mobile-1.0.0.zip`, SHA256 `d546c202a53533b67628bad99812e73f84cc1a41dafa3ea41b851226a103b1b9`. Production installation was not performed: automatic approval review rejected selecting the ZIP in the live WordPress upload form, requiring explicit user authorization for that production upload. No production customer, registry, payment, deletion request or order was created.

## Device and release work

There is no authenticated Expo/EAS project, Android SDK/emulator or iOS runtime available in this workspace. Signed APK/TestFlight builds, payment redirects, SecureStore restoration, safe areas, keyboard behavior, sharing and OS link delivery need device verification.

Registry products require a fixed variation. An option with unspecified attributes cannot be added to Registry because the existing registry stores the variation ID rather than a separate custom option selection. Ordinary shopping preserves distinct choices in separate bag lines.

Account deletion is a password-confirmed, email-confirmed request fulfilled by store support. Private registry buyers do not receive tracking numbers or links that could expose the recipient's destination. Universal/App Links still need the signed application identities and website association files. The 1024px store icon and upstream dependency advisories remain release tasks.
