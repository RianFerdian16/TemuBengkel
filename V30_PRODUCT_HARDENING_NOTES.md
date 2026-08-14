# TEMUBENGKEL V30 — Production Hardening Sprint

V30 implements the eight production improvements identified after the V29 audit without changing the core product direction.

## 1. Accurate owner opening status across Indonesia
- `workshops.time_zone` is persisted.
- New/edited owner listings infer WIB/WITA/WIT from province/address first, coordinates second.
- `isWorkshopOpenNow()` now evaluates owner schedules with the listing time zone.
- Existing rows are backfilled during migration.

## 2. Geocoding reliability
- Public search geocoding is optional enrichment with a hard ~1.8s timeout.
- Owner forward/reverse geocoding has bounded timeouts and cached upstream responses.
- Google Places requests also have a bounded timeout.
- A slow Nominatim response no longer blocks Google/TemuBengkel text results indefinitely.

## 3. Scalable approved-owner search
- Removed the old `take: 100` before in-memory filtering.
- PostgreSQL now pre-filters by text, Google Place ID, and/or geographic bounding box first.
- A post-filter safety cap remains after relevant rows have already been selected.

## 4. Search directly from Home
- Home hero now includes `Cari bengkel, area, atau alamat…`.
- `Cari` routes directly to `/search?q=...`.
- `Gunakan lokasi saya` routes directly to `/search?lat=...&lng=...`.

## 5. Owner GPS → address
- `Gunakan lokasi saya` in the owner form now uses the same reverse-geocode path as manual map movement.
- GPS coordinates and visible address stay aligned while the address remains editable.

## 6. Trust wording
- Generic `Terverifikasi` wording was replaced with `Listing telah diverifikasi` / `data pemilik yang telah ditinjau`.
- This avoids implying a guarantee of workshop service quality.

## 7. Auth hardening
- Persistent database-backed throttling for owner login, admin login, registration, password reset, and geocoding.
- Password reset tokens are hashed, one-time, and expire after 1 hour.
- Email verification tokens are hashed and expire after 24 hours.
- Password reset revokes all existing sessions.
- Existing accounts are marked verified by migration so current owners/admins are not locked out.

### Optional email delivery configuration
Full email verification/password-reset delivery uses Resend's HTTP API without adding an npm dependency.
Set these production environment variables in Vercel:

```text
RESEND_API_KEY=...
EMAIL_FROM=TemuBengkel <sender@your-verified-domain.example>
APP_URL=https://temubengkel.vercel.app
```

If email delivery variables are not configured, V30 remains backward compatible: newly registered owners are auto-verified so registration/login do not break. In development, forgot-password may return a debug reset link. For full production recovery/verification, configure the email variables above.

## 8. CSS/dead-code cleanup
- Large owner/admin/current-quality overrides were split from `app/globals.css` into:
  - `app/styles/owner.css`
  - `app/styles/console.css`
  - `app/styles/quality.css`
- Obsolete V9/V10 photo/review CSS was removed from the active stylesheet.
- Obsolete photo/review components and API routes are no longer part of the V30 source tree.
- Google Places integration was simplified to fields actually rendered by the current product.

## Database migration
V30 adds:
- `users.email_verified_at`
- `workshops.time_zone`
- `auth_tokens`
- `rate_limit_buckets`

Run before starting/deploying V30:

```powershell
npm run db:generate
npm run db:deploy
```

No new npm dependency is required.

## Recommended smoke test
1. Home → search by `Bengkel Suka Ria`.
2. Home → `Gunakan lokasi saya`.
3. Search text while Nominatim is unavailable/slow: Google/TemuBengkel results should still be usable.
4. Approved owner listing remains searchable.
5. Owner form → `Gunakan lokasi saya`: address should populate/adjust automatically.
6. Create/edit a WITA/WIT listing and verify its open/closed status follows local time.
7. Repeated invalid login attempts eventually return HTTP 429.
8. Forgot-password sends a generic success response; with email env configured, the email link resets the password and revokes old sessions.
9. With email env configured, new owner registration requires email verification before login.
10. Owner/Admin desktop and mobile layouts remain aligned after CSS split.
