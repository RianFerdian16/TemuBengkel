# V28 — Public search apply fix

## Root cause found
V27 contained the correct public-search code, but `apply-redesign.bat` was accidentally still the V26 copy manifest. As a result, applying V27 did **not** copy the two files that actually implemented the fix:

- `components/search-experience.tsx`
- `lib/workshop-data.ts`

The visual clue is the old search attribution text still showing only Google Maps after V27 was supposedly applied.

## V28 fix
- Explicitly copies both V27 public-search files into the main project.
- Keeps the approved owner listing search behavior from V27.
- Approved owner listings can be matched by workshop name, address/area, description, and services.
- No database migration added in V28.

## Expected verification
After applying V28 and clearing `.next`, the search summary should say:

`Data publik dari Google Maps + listing terverifikasi TemuBengkel`

Searching the exact approved listing name should surface the owner listing even if Google Places itself does not return it.
