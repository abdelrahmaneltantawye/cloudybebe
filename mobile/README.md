# CloudyBebe mobile

English shopping app for iOS and Android using the CloudyBebe website design, products and customer data.

## Open the preview

You need Node.js and npm. In this folder, run:

```sh
npm ci
npm run web -- --port 8094
```

Open http://localhost:8094. For a preview without development refreshes:

```sh
npx expo export --platform all
npx expo serve --port 8095
```

Open http://localhost:8095. Export again and restart the preview server after changing the source.

## Connect accounts, registries and checkout

The public catalog works directly with the website. Install the companion CloudyBebe Mobile plugin from `../work/mobile-backend-v1/` on the same WordPress/WooCommerce site to enable customer accounts, orders, Baby Registry and bag checkout. Follow that package's installation guide. A missing adapter returns an unavailable-service message; the app does not substitute sample customer data.

Sign in with a website customer account. Administrative and store-management accounts cannot sign in through the shopping app. Native sign-in is saved securely on the device; browser-preview sign-in lasts until the page reloads. Password reset and account deletion requests use the website's email confirmation process.

You can browse categories, search, filter prices and availability, sort, view photos, select product options and save favourites. Saved items and the bag stay on this device. They do not sync between devices.

## Complete an order

Add products to the Bag and choose **Continue to checkout**. The website validates current prices, options, stock and quantities. Shipping, taxes, discounts and payment are calculated at checkout.

On iOS and Android, checkout opens inside the app. In the browser preview, **Open secure website** opens a separate tab. Return to the app and choose **Check order status** after completing checkout. The app removes only the purchased quantities after the store confirms the order. An order awaiting payment is shown as received without claiming that payment succeeded.

Checkout links expire after five minutes and work once. If checkout fails, your bag remains saved. If a payment page is still processing, check its result and order status before starting another order.

## Give a registry gift

Open **Registry** to create or manage the same Baby Registry used on the website, find a searchable registry by title, or open a shared link. Owners can edit the title, date, requested quantities, priority, private delivery address and sharing settings.

Add gifts from one registry to the bag and complete its checkout separately from regular shopping. The recipient's full address stays private. Password-protected registry passwords are kept only while the app is open; after restarting, reopen the protected registry and re-add the gifts before checkout.

## Check changes

```sh
npm run typecheck
npm run lint
npm test
npx expo export --platform all
```

See `docs/account-registry-v1.md` for the route inventory and integration details.

## Install a device build

`eas.json` contains Android APK, iOS simulator and production build profiles. Connect the intended Expo account and project before creating signed builds:

```sh
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest build --platform android --profile preview
```

An iPhone or store build also needs the appropriate Apple or Google developer account. This workspace has no authenticated Expo account or local Android/iOS simulator. JavaScript bundles have been exported for both platforms; signed device builds and device testing remain required.

Before release, exercise payment redirects, cancellation, interrupted networks, account persistence, registry privacy, large text and keyboard behavior on both operating systems. The website mark also needs a 1024px opaque store icon. Review the dependency audit before release: Expo CLI's dependency tree reports upstream high-severity advisories; do not force an incompatible Expo downgrade with `npm audit fix --force`.
