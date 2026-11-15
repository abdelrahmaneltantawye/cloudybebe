# Account, orders and Baby Registry V1

Implemented screens use the approved CloudyBebe website palette, Cabin/Lexend typography and English copy. Tab pages include the real wordmark and manual top/bottom safe-area padding; stack pages use navigation headers and automatic content insets. Form content scrolls with keyboard adjustment.

| Route | Behavior |
| --- | --- |
| `/account` | Website account sign-in gate, customer overview, account links and sign-out |
| `/account/sign-in` | Email/password sign-in with return to the requested screen |
| `/account/register` | Website account creation, registration availability and password rules from store configuration |
| `/account/reset-password` | Server-provided reset email result |
| `/account/profile` | Edit name/display name/email; changing email requires current password |
| `/account/addresses` | Country/state-aware delivery and billing forms; save the edited section independently |
| `/account/settings` | Reset-password/privacy links and confirmed account-erasure request |
| `/account/help` | Verified store email/phone actions and website delivery/returns/privacy links |
| `/orders` | Paginated website/app order history with empty, loading, failure and retry states |
| `/orders/[id]` | Authoritative order status/items/total/address; carrier tracking only when supplied by server |
| `/registry` | Public registry introduction, create/find actions and signed-in owner lists |
| `/registry/create` | Title, display name, optional date/note, visibility and private delivery address |
| `/registry/edit?id=…` | Edit registry details and private delivery address |
| `/registry/[id]` | Requested/purchased/needed summary, quantity/priority updates and confirmed gift removal |
| `/registry/add?productId=…&variationId=…&quantity=…` | Choose an owned registry and add the selected store product/variation |
| `/registry/share?id=…` | Link-only, searchable, password protected or private visibility; copy/native share |
| `/registry/find` | Registry-title search, showing searchable registries only |
| `/registry/public/[token]` | Guest registry access, password gate, gift quantity selection and attributed bag items |

## Integration

`SessionProvider` wraps the app. `useSession()` exposes `ready`, `token`, `user`, `error`, `signIn`, `signOut`, `refresh`, `setUser` and authenticated `request<T>`. Native bearer credentials use Expo SecureStore; the browser preview keeps sign-in in memory. Stored sessions require a future ISO 8601 `expires_at`. Restore/save/logout races are guarded and storage writes are serialized.

`mobileRequest<T>` uses `/wp-json/cloudybebe-mobile/v1/` on native and the allowlisted `/api/mobile?path=…` web proxy. Responses are direct JSON DTOs; WordPress error codes/status are preserved. Checkout status secrets use `X-Checkout-Token`, independently from customer bearer authorization. Passwords are sent in request bodies and never included in URLs.

Guest gifts call `shop.add(product, quantity, {registry_id,registry_item_id,registry_token,registry_password?,registry_title})`. The selected live product/variation is checked before addition and its maximum is capped to the registry quantity still needed. The bag rejects mixed shopping/registry contexts. Registry passwords stay in memory and are redacted by the bag persistence layer.

Registry additions require fixed variation options. Variations with an “Any” attribute are blocked because the current website registry item format cannot retain a separate selected size/colour. Direct links are checked against the live parent variation payload, including links that supply a variation ID as `productId`. Regular shopping still supports those options through its selected-attribute checkout payload.

The existing website sharing URL is `https://cloudybebe.com/baby-registry/?gift=<48-hex-token>`; incoming URL handling maps it to `/registry/public/[token]`. A password-protected registry returns `cbr_password` with HTTP 401. Private, paused, missing and rate-limited responses remain distinct server errors.

## Scope and verification

No sample account, orders, registries or successful mutation responses are inserted. Each network screen has loading/error/empty/content behavior; mutation drafts remain available after failures. Account deletion submits a password-confirmed erasure request, requires the website email confirmation and signs out after the request is accepted. It does not claim immediate data deletion.

Cash/group contributions, external gifts, registry partners, checklists, rewards, push notifications and cross-device saved-item sync are outside V1.

Automated checks: `npx tsc --noEmit`, scoped ESLint and `npm test`. API tests cover transport/auth headers, password placement, real password-gate errors, unavailable/unreadable/offline responses, checkout receipt headers and stored-session expiry. Checkout/bag tests cover registry attribution, password redaction, conflicting bags and receipt confirmation.

Successful customer/registry flows require the adapter deployed to the website and a real test account. Native device safe areas, keyboard behavior, secure-storage persistence, carrier-browser presentation and OS sharing still require iOS/Android device verification. No production account creation, password reset, deletion request or order was submitted during frontend implementation.
