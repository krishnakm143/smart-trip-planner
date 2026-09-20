# Smart Trip Planner — API server

Express + MongoDB REST API that serves destinations, generates day-wise
itineraries with a budget estimate, and stores saved trips per user. The full
contract lives in [`../docs/design.md`](../docs/design.md).

## Setup

Requires Node.js 20+ and MongoDB on `localhost:27017` (`docker compose up -d`
from the repository root).

```bash
cd server
npm install
cp .env.example .env      # then set JWT_SECRET to a long random string
npm run seed              # 12 destinations, 120 activities, demo user
npm run dev               # http://localhost:4100/api/v1
```

Demo account: `demo@smarttrip.in` / `Demo@1234`

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start with nodemon (restarts on change) |
| `npm start` | Start with plain node |
| `npm run seed` | Upsert destinations, activities and the demo user (safe to re-run) |
| `npm test` | Unit, API and provider tests (uses an in-memory MongoDB, never the real one) |
| `npm run lint` | ESLint |

## Environment

Validated at boot by `src/config/env.js`; the server exits with a readable
message if a value is missing or invalid.

| Variable | Default | Notes |
|---|---|---|
| `NODE_ENV` | `development` | `development`, `test` or `production` |
| `PORT` | `4100` | |
| `MONGODB_URI` | — | e.g. `mongodb://localhost:27017/smart_trip_planner` |
| `JWT_SECRET` | — | At least 32 characters |
| `JWT_EXPIRES_IN` | `7d` | |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Allowed CORS origins, comma separated |
| `TRUST_PROXY` | `0` | Reverse proxies in front of the API; `1` on Railway or Render so rate limiting sees the visitor's address |
| `MAPS_PROVIDER` | `local` (or `google` when a key is set) | `local`, `osm` (Overpass + OSRM, free, no key) or `google`. Remote providers fall back to local on any failure |
| `GOOGLE_MAPS_API_KEY` | empty | Needed only for `MAPS_PROVIDER=google` (Distance Matrix and Places API (New)) |

## Endpoints

Base path `/api/v1`. Every response uses the envelope
`{ success, data, meta? }` or `{ success: false, error: { code, message, details? } }`.

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | | Service, database and provider status |
| POST | `/auth/register` | | Create account → `{ user, token }` |
| POST | `/auth/login` | | Log in → `{ user, token }` |
| GET | `/auth/me` | Bearer | Current user |
| GET | `/destinations` | | List; query `search`, `category`, `page`, `limit` |
| GET | `/destinations/:slug` | | Destination with its activities |
| GET | `/destinations/:slug/discover` | | Nearby places from the places provider; query `type` |
| POST | `/planner/preview` | | Itinerary + budget for a plan input, nothing is saved |
| POST | `/budget/estimate` | | Budget only |
| POST | `/trips` | Bearer | Save a trip (itinerary and budget are regenerated on the server) |
| GET | `/trips` | Bearer | Own trips, newest first; query `status` |
| GET | `/trips/:id` | Bearer | Trip details |
| PATCH | `/trips/:id` | Bearer | Update `title`, `notes`, `status` |
| DELETE | `/trips/:id` | Bearer | Delete |

`/auth/*` is rate limited to 20 requests per 15 minutes per IP.

## Folder structure

```
src/
  app.js            express app factory (no listen), used by tests
  server.js         connects to MongoDB and starts listening
  config/           env validation, database connection
  models/           User, Destination, Activity, Trip (+ shared toJSON plugin)
  routes/           one router per resource, mounted in routes/index.js
  controllers/      HTTP only: read validated input, call a service, send the envelope
  services/         auth, destination, itinerary, budget, planner, trip
  providers/        route + places adapters: local/ and google/, chosen in index.js
  middleware/       auth, validate, rateLimiter, notFound, errorHandler
  validators/       zod schemas per route
  utils/            ApiError, asyncHandler, respond, geo, time
  seed/             destinations.js, activities.js, seed.js
tests/
  unit/             budget, itinerary, geo, time
  api/              auth, destinations, planner, trips, error envelope
  providers/        Google providers with mocked fetch
  helpers/          test env, in-memory MongoDB, fixtures
```

## How a plan is built

`plannerService.buildPlan` loads the destination's activities, asks the route
provider for one distance matrix, and passes both to
`itineraryService.generateItinerary`, which scores activities by rating and
interests, fills each day up to the pace's hour limit by nearest-neighbour
selection, orders morning and evening stops, and schedules from 09:00 with a
lunch break. `budgetService.estimateBudget` then prices stay, food, transport
and the entry fees of the scheduled stops.
