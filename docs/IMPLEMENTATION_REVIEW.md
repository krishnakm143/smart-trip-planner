# Smart Trip Planner — implementation review

Reviewed against the repository's API contract and the REA project's approach
to explicit contracts, repeatable verification and evidence-backed findings.

## What works well

- The planning path is genuinely end-to-end: destination catalogue, server-side
  itinerary generation, budget calculation, authentication and per-user saved
  trips are separate layers with an explicit REST envelope.
- The location provider has a useful no-key default. Local data guarantees an
  offline fallback; OSM/OSRM enhance results when their public services respond.
- Existing API and provider tests cover the core planning algorithm, validation,
  ownership isolation and third-party-provider fallbacks.

## Improvements delivered

- Added optional Supabase Auth and Postgres trip persistence. The migration
  creates user profiles and saved trips with RLS policies on every table and
  ownership checks on every trip operation.
- Added a `Near me` destination experience backed by `GET /locations/nearest`.
  Browser coordinates are requested only after a click and are never stored.
- Added API coverage for coordinate validation and nearest-destination sorting.
- Upgraded production dependencies until both client and server have zero
  production `npm audit` findings.
- Added a reviewable Supabase configuration path and environment examples.
- Added user-entered trip caps, return-travel cost, and contingency so the budget
  reflects common planning inputs rather than only on-destination estimates.
- Added an authenticated expense data model and RLS-protected Supabase table;
  the server API is being wired into the trip-detail experience.

## Remaining product limitations

1. The catalogue is deliberately curated: 12 Indian destinations and seeded
   activities. It is not a nationwide destination search or real-time booking
   inventory.
2. Itinerary ordering is a deterministic heuristic, not traffic-aware route
   optimisation. OSM/OSRM public endpoints can rate-limit or be unavailable;
   the product falls back to local estimates.
3. Costs are estimates. Users may enter their own return-travel and contingency
   amounts, but the product does not price live hotels, transport, availability,
   cancellations or payments.
4. Supabase is configured but not deployed into Railway/GitHub Pages by this
   change. Production needs the documented server and Vite environment values,
   plus Supabase Auth redirect URLs for its final domains.
5. Docker is unavailable in this workspace, so the local MongoDB container
   could not be started here. The API suite uses an isolated in-memory MongoDB,
   and the client was browser-tested in its contract-compatible demo mode.
