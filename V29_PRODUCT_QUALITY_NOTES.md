# TEMUBENGKEL V29 — Product Quality Sprint

V29 focuses on trust, search clarity, mobile readability, performance, and owner-location accuracy based on the product audit.

## Public search
- Search field is now universal: workshop name, area, street, or address.
- Removed the misleading `Resmi` filter. Owner-submitted data is no longer treated as proof of authorized/dealer status.
- Manual area/address search attempts one lightweight geocode so distance can be calculated and the distance filter can work honestly.
- Distance filter disables itself when no reliable search origin exists.
- Service and mobile-mechanic filters only appear when the result set contains verified owner-supplied coverage.
- Search results now report `hasil teratas` when Google returns its current 20-result cap.
- Partial-source failures degrade gracefully: Google results can still show if DB is unavailable and approved owner results can still show if Google fails.
- Search result session keeps location/filter convenience but refreshes result freshness after a short 3-minute TTL.
- Added source badges for TemuBengkel owner listings / linked data.
- Added a `Posisi saya` map recenter control.
- Selecting a map marker no longer refits the whole map bounds on every click.

## Performance
- Google Maps browser loader no longer loads the unused client-side Places library.
- Search Places field mask no longer requests phone, photos, regular hours, or attributions that result cards do not render.
- Detail Places field mask no longer requests photos/reviews.
- Removed the extra Legacy Place Details fallback from the normal detail flow.
- Google Places, approved-owner DB lookup, and lightweight query geocode are executed concurrently where possible.
- Added route-level detail skeleton so navigation does not feel frozen while external data loads.

## Data trust
- Owner-only detail pages no longer display a fake/empty `Rating Google Maps` card.
- Owner-only detail pages show `Listing TemuBengkel — Terverifikasi` after moderation.
- Detail source footer distinguishes Google Maps, TemuBengkel, and linked Google + owner data.
- Public footer only exposes Admin Console when an admin session is already active.
- Mobile bottom navigation label changed from ambiguous `Bengkel` to `Pemilik`.

## Owner location UX
- When the owner manually moves/clicks the map location, the address is reverse-geocoded after the movement settles.
- The address field updates automatically when a nearby address can be resolved, while remaining manually editable.
- If reverse geocoding fails, coordinates remain valid and the previous address is retained.

## Mobile readability
- Raised critical search/card/map typography so key information is no longer rendered around 7–9px on small screens.

## Database / env
- No database migration.
- No new npm dependency.
- No new required environment variable.
