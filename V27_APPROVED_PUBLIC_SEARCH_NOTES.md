# V27 — Approved owner listing public-search fix

## Fixed
- Approved owner-created workshops can now be found from the public Search page by workshop name, address/area, description, or service text.
- Manual searches no longer use owner rows only as Google Place enrichment.
- Nearby search with device coordinates still only appends approved owner listings within the radius.
- Linked Google Place owner listings still enrich matching Google results without duplication.
- Manual name matches are ranked ahead of unrelated Google results when possible.
- Search result attribution now makes it clear results can include Google Maps and verified TemuBengkel listings.

## No database migration
V27 changes search/merge behavior only.
