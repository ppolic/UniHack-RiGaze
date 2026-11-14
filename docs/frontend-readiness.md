# FE2 Phase 4 readiness and integration notes

This frontend work does not establish production readiness. Backend source inspection
confirmed the following contracts; live connectivity, SQL durability and device/browser
runtime behavior still require testing. No backend contracts were changed.

## Implemented frontend paths

| Feature | Endpoint | Behavior |
| --- | --- | --- |
| Account balance / verified profile age | `GET /auth/me` | JWT required; checks account ID and numeric balance. Age is shown only for a valid, nonfuture server birth date. |
| Favorites read | `GET /favorites?userId=<authenticated ID>` | Verifies identity through `/auth/me` first; excludes ownerless/shared and foreign rows; validates own records. Does not assert provenance or SQL persistence. |
| Reward catalog | `GET /rewards` | Uses actual active DTOs; preserves empty lists; rejects malformed data; no mock fallback, invented partner, discount, category or expiry. |
| Redemption | `POST /rewards/{id}/redeem` | Uses strict numeric reward ID and JWT; requires matching reward ID, transaction ID, code, points spent and balance. No local code generation, automatic POST retry or local points subtraction. |
| Activation restoration | `GET /points?skip=<offset>&take=200` | Reads all pages of actual ledger entries; `Redeemed` records restore activation state. Rejects incomplete/unstable pages. Maximum 50 pages (10,000 transactions), then reports a limit error. |
| Trip history | `GET /trips` | Validates the authenticated user's summary and rows. Failed/malformed requests are errors, not demo trips. A valid empty array is empty history. |

Focus, retry and account changes reload screen resources. Async results are ignored
after screen cleanup or session change. Redemption has screen and service locks;
the service lock survives screen remounts. Shared user updates preserve unrelated
fields and points changed while a request is pending.

The points summary displays only the confirmed server balance. It no longer labels
local/default CO₂ and trip totals as verified account statistics; actual trip details
remain available through History.

Existing Challenges and Report Issue integrations from Phase 3 remain unchanged:
`GET /challenges/overview`, `POST /reports`, and `/auth/me` verification.

## Backend blockers

### Favorites: writes and provenance are unsafe

Evidence: `FavoriteRoutesController.cs` and
`Services/Community/CommunityIntelligenceService.cs`:

- Controller has no `[Authorize]`; GET trusts a query user ID, POST trusts a body
  user ID, and DELETE does not check ownership.
- GET also returns `userId:null` shared examples. The frontend excludes them and
  records belonging to another account, even if the server ignores its filter.
- `SeedInitialMemoryData` includes examples associated with user IDs. Returned DTOs
  have no provenance flag; the frontend cannot distinguish these from user-created
  records. It labels the list accordingly rather than calling it verified user history.
- `SaveFavoriteToDbAndMemoryAsync` swallows SQL failures and then stores the item
  in memory. DELETE also returns success after failed SQL synchronization.
- `EnsureSyncedWithDatabase` sets `_dbSynced` before attempting synchronization;
  a failed initial connection leaves the process using its snapshot/seeded data.

Consequently FE2 does **not** expose POST or DELETE actions. A successful HTTP
response/readback or a separate healthy database check cannot prove durable storage.
Backend work must enforce JWT-derived identity/ownership, propagate failed writes,
and expose reliable storage/provenance semantics before these controls can be enabled.

### Coupon restoration: codes are absent

Evidence: `RewardsController.cs`, `PointsController.cs`, `Dtos/UserDtos.cs`:

- The redemption POST returns `discountCode`, `transactionId`, `pointsSpent` and
  `newBalance`. `/points` returns transactions, reward IDs and timestamps, but no code.
- There is no implemented authenticated coupon/code-history endpoint. The frontend
  never reconstructs a code from reward/transaction IDs or asserts an expiry date.
- The server ledger restores activation records after navigation/re-authentication
  when those records remain available. Current-screen confirmed codes remain
  temporary. The UI explicitly explains this limitation.
- Backend SQL failures can use `InMemoryFallbackStore`, so API acknowledgment alone
  does not guarantee survival after a backend restart. The source of the response is
  not declared by the current contract.
- Duplicate protection is only a 10-second backend window. Strong idempotency and
  atomic durable issuance are needed, including failure after database commit.

Backend work: persist coupon issuance and expose an authenticated read operation
returning actual codes and redemption status for the current user. Its endpoint/schema
must be agreed with the backend team; none was invented here. Clarify whether a reward
may be purchased repeatedly. The frontend retains its existing one-activation-per-reward
behavior and now also recognizes recorded activations.

`/auth/me` uses `Users.PointsBalance`, while SQL `/points` derives a balance by summing
transactions. The frontend displays `/auth/me` and POST balances, not an invented
reconciliation of those potentially different values. Backend must keep them consistent.

### Other production-data / authorization work

- Backend `/trips`, `/rewards`, `/points` and auth adapters can serve seeded or
  in-memory data without provenance metadata. Removing frontend mocks cannot fix this.
- Challenges can fabricate progress and claim success after database failure, and
  claim does not enforce completion. Progress/claim controls remain unavailable.
- Reports lack server authorization and can acknowledge memory-only storage / an
  unpersisted points award. Phase 3 confirms receipt only and does not award points locally.
- Existing auth mapping retains representative age/default birth-date fields used
  by the shared FE1 model. This phase leaves authentication and FE1 contracts intact;
  Profile no longer presents those defaults as verified age. Coordinate authoritative
  age-category handling with FE1/backend before production.

## FE1 future Save Favorite integration

Do not add a Map button until backend authorization and persistence are fixed.
FE1 retains the Map, route selection and origin/destination state. Reuse those
actual values; trip history labels alone are insufficient to infer coordinates.

The existing `CreateFavoriteRouteRequestDto` fields are:

- `name`, `originName`, `destinationName` (maximum 120 characters each).
- `originLat`, `originLng`, `destinationLat`, `destinationLng` from the actual
  selected endpoints, in decimal WGS84 coordinates.
- `preferredMode`: `Walk | Bike | Scooter | PublicTransport | Car | Carpool | Combined`.
- `weeklyFrequency`, `requiresStepFreeAccess`, optional `notes` (maximum 300 characters).
- Explicit `missingBikeLaneOnRoute: false` unless the user separately opts into
  reporting infrastructure demand. The backend DTO defaults this field to true
  and can otherwise create an unintended community report and points side effect.
- The existing DTO has `userId`, but the backend must replace caller-trusted identity
  with JWT ownership. FE1 must not pass arbitrary navigation/query user IDs.

After a verified durable mutation, refresh the Favorites list on focus. Do not alter
route geometry, route selection, trip completion or rewards to implement saving.

## Pre-deployment manual checklist

1. Real login/register land on Home; tabs remain Hartă, Favorite și istoric,
   Acasă, Puncte, Profil. Exercise every Home shortcut and back navigation.
2. Logged-out deep links to tabs, Challenges, Report Issue and Dashboard remain
   protected; logout clears access; no persistent session is fabricated.
3. Favorites: owned, foreign, shared, empty, malformed, offline and expired-JWT
   responses; focus/retry reload; writes remain disabled until backend fixes land.
4. Rewards: real empty/inactive catalog, malformed rows, unavailable catalog,
   balance and ledger independently; pagination including old activations.
5. Redeem: insufficient/exact balance, rapid taps, screen close/reopen during POST,
   server errors, uncertain timeout, invalid receipt, logout and points/profile
   updates during a pending request. Verify no automatic POST replay or lost fields.
6. Navigate/re-authenticate/restart and distinguish restored ledger activation from
   an unavailable historic coupon code. Test backend restart separately from app restart.
7. Profile: missing/invalid/future/leap-day birth dates; Save/Cancel, preferences,
   accessibility statement and logout remain functional.
8. Android gesture and three-button navigation, small screens, enlarged text,
   keyboard and screen reader; desktop web focus/scroll/wrapping. Exercise FE1 map,
   presets, route sheet, planning and trip completion unchanged.
