# TravelMate AI — Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants

1. **Default-Deny Catch-All**: All paths not explicitly matched (`/{document=**}`) deny all read and write access (`if false`).
2. **PII Isolation (`users/{userId}`)**: User profiles contain PII (`email`) and personal travel preferences. Only the authenticated owner (`request.auth.uid == userId`) or a verified admin (`isAdmin()`) may `get` or mutate a user profile. Blanket `list` access is restricted strictly to `isAdmin()`.
3. **Identity Integrity (`ownerId` / `uid`)**: Every document created in `users`, `trips`, `bookings`, and `supportTickets` must bind its `uid` or `ownerId` strictly to `request.auth.uid` and require `request.auth.token.email_verified == true`.
4. **Path Variable Hardening (`isValidId`)**: All single-document operations (`get`, `create`, `update`, `delete`) validate document IDs against `^[a-zA-Z0-9_\-]+$` with `size() <= 128`.
5. **Action-Based Updates & Terminal State Locking**: Updates must pass the full `isValid[Entity](incoming())` blueprint, enforce `incoming().ownerId == existing().ownerId` and `incoming().createdAt == existing().createdAt`, require `incoming().updatedAt == request.time`, and restrict mutated keys via `affectedKeys().hasOnly(...)`. Once a `booking` reaches `status == 'cancelled'`, non-admin updates are locked.
6. **Secure List Queries**: Every `allow list` rule evaluates `resource.data.ownerId == request.auth.uid || isAdmin()` without delegating query security to the client or invoking `get()`/`exists()` per document.

## 2. The "Dirty Dozen" Payloads

1. **Identity Spoofing on Trip Creation**: Authenticated user `user_A` creates `/trips/trip_1` with `ownerId: "user_B"`. -> `PERMISSION_DENIED`
2. **Shadow Field Injection on Booking Create**: Payload includes extra key `isComp: true` not in `hasOnly` allowlist. -> `PERMISSION_DENIED`
3. **Unverified Email Write**: User with `email_verified: false` attempts to create `/trips/trip_2`. -> `PERMISSION_DENIED`
4. **Admin Email Spoofing**: User with `email: "hariomsingh6288@gmail.com"` but `email_verified: false` attempts to list all `/users`. -> `PERMISSION_DENIED`
5. **PII Cross-User Read**: Authenticated `user_A` attempts `get(/users/user_B)`. -> `PERMISSION_DENIED`
6. **Terminal State Bypass on Cancelled Booking**: User attempts to update `/bookings/book_1` when `existing().status == 'cancelled'`. -> `PERMISSION_DENIED`
7. **Owner Reassignment on Trip Update**: User updates `/trips/trip_1` changing `ownerId` to `"user_B"`. -> `PERMISSION_DENIED`
8. **CreatedAt Tampering on Update**: User updates `/trips/trip_1` with a modified `createdAt` timestamp. -> `PERMISSION_DENIED`
9. **Client Timestamp Forgery**: User creates `/bookings/book_1` with `createdAt` not matching `request.time`. -> `PERMISSION_DENIED`
10. **Oversized String Resource Poisoning**: User submits a 5,000-character `summary` in `/trips/trip_1` (`maxLength: 1000`). -> `PERMISSION_DENIED`
11. **Unbounded Array Overflow**: User submits 50 items in `savedDestinationIds` on `/users/user_A` (limit 20). -> `PERMISSION_DENIED`
12. **Unscoped List Scraping**: Authenticated `user_A` runs an unconstrained `list` query on `/bookings` without `where('ownerId', '==', 'user_A')`. -> `PERMISSION_DENIED`
