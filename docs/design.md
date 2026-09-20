# Smart Trip Planner — System Design & API Contract

This document is the single source of truth for the project. The backend, the
frontend, the UML diagrams and the data dictionary are all derived from it. If
code and this document disagree, fix one of them in the same commit.

- **Course:** MC03094171 Research Work (Phase-1) / Minor Project — MCA Sem III, SVIT Vasad
- **Team:** Udit Mishra (backend / database / API), Hardik Vaghela (frontend / UI), Vraj (documentation / UML / system design)
- **Stack:** React.js (Vite), Node.js, Express.js, MongoDB (Mongoose), JavaScript, HTML5, CSS3, Places API, Route/Distance API, Git

## 1. Product summary

A web application where a traveller picks an Indian destination, enters dates,
number of travellers, budget tier, interests and pace, and receives:

1. a **day-wise itinerary** built from the destination's activities, ordered to
   minimise travel between stops, and
2. an **estimated budget** broken into stay, food, transport and activities.

The plan can be previewed without an account and saved to **My Trips** after
login.

### Pages (frontend routes)

| Route | Page | Auth |
|---|---|---|
| `/` | Home — hero, how it works, popular destinations | public |
| `/destinations` | Destinations — search + category filter grid | public |
| `/destinations/:slug` | Destination details — overview, cost table, activities, "discover nearby" | public |
| `/plan` | Plan Trip — form → generated plan preview → Save (accepts `?destination=<slug>` prefill) | public (save needs login) |
| `/trips` | My Trips — saved trips list | required |
| `/trips/:id` | Trip Details — day-wise itinerary, budget planner, notes, status, delete | required |
| `/login`, `/register` | Auth | public |
| `*` | Not found | public |

## 2. Repository layout

```
smart-trip-planner/
├── docker-compose.yml          # mongo:7 on localhost:27017
├── README.md
├── docs/                       # this file, diagrams, project document, presentation
├── server/                     # Express API (ES modules, Node >= 20)
│   ├── src/
│   │   ├── app.js              # express app factory (no listen) — used by tests
│   │   ├── server.js           # connects DB, starts listening
│   │   ├── config/env.js       # reads + validates env once, exports frozen config
│   │   ├── config/db.js
│   │   ├── models/             # User, Destination, Activity, Trip
│   │   ├── routes/             # one router per resource, mounted in routes/index.js
│   │   ├── controllers/        # HTTP only: parse req, call service, send envelope
│   │   ├── services/           # business logic: auth, destination, itinerary, budget, trip
│   │   ├── providers/          # places + route adapters (local, google)
│   │   ├── middleware/         # auth, validate, errorHandler, notFound
│   │   ├── validators/         # zod schemas per route
│   │   ├── utils/              # ApiError, asyncHandler, geo (haversine), time helpers
│   │   └── seed/               # destinations.js, activities.js, seed.js (idempotent)
│   └── tests/                  # vitest + supertest + mongodb-memory-server
└── client/                     # React 18 + Vite + React Router (JavaScript, plain CSS)
    ├── public/images/destinations/<slug>.jpg
    └── src/
        ├── main.jsx, App.jsx, routes.jsx
        ├── pages/              # one folder per page
        ├── components/         # shared UI (layout, DestinationCard, ItineraryDay, BudgetBreakdown, states)
        ├── services/           # apiClient.js + one module per resource
        ├── context/AuthContext.jsx
        ├── hooks/
        ├── utils/              # formatCurrency, formatDate
        └── styles/             # tokens.css (design tokens), base.css
```

### Ports and environment

| Thing | Value |
|---|---|
| API | `http://localhost:4100`, base path `/api/v1` |
| Client (Vite) | `http://localhost:5173`, dev proxy `/api` → `http://localhost:4100` |
| MongoDB | `mongodb://localhost:27017/smart_trip_planner` |

`server/.env` (committed as `.env.example`, real `.env` is git-ignored):

```
NODE_ENV=development
PORT=4100
MONGODB_URI=mongodb://localhost:27017/smart_trip_planner
JWT_SECRET=change-me-to-a-long-random-string
JWT_EXPIRES_IN=7d
CLIENT_ORIGIN=http://localhost:5173
GOOGLE_MAPS_API_KEY=
```

`GOOGLE_MAPS_API_KEY` empty → local providers. Present → Google providers with
automatic fallback to local on any upstream failure.

## 3. Data model (MongoDB collections)

All collections have `_id: ObjectId`, `createdAt`, `updatedAt` (Mongoose
timestamps). Money is INR, stored as integer rupees.

### 3.1 `users`

| Field | Type | Constraints | Description |
|---|---|---|---|
| name | String | required, 2–60 chars, trimmed | Display name |
| email | String | required, unique, lowercase, valid email | Login identifier |
| passwordHash | String | required, `select: false` | bcrypt hash (cost 10) |
| role | String | enum `traveler` \| `admin`, default `traveler` | Authorisation role |

JSON output never contains `passwordHash`.

### 3.2 `destinations`

| Field | Type | Constraints | Description |
|---|---|---|---|
| name | String | required | e.g. "Manali" |
| slug | String | required, unique, lowercase | URL identifier, e.g. `manali` |
| state | String | required | Indian state / UT |
| country | String | default `India` | |
| category | String | enum `hill-station` \| `beach` \| `heritage` \| `spiritual` \| `nature` \| `desert` \| `adventure` | Primary category |
| tagline | String | required, ≤ 90 chars | One-line hook for cards |
| description | String | required | 2–4 sentence overview |
| heroImage | String | required | `/images/destinations/<slug>.jpg` (served by client) |
| location | `{ lat: Number, lng: Number }` | required | City centre |
| bestSeason | String | required | e.g. "October – February" |
| idealDays | `{ min: Number, max: Number }` | required | Suggested trip length |
| dailyCost | `{ economy, standard, luxury }` each `{ stay, food, transport }` | required, integers ≥ 0 | `stay` = per room per night; `food`, `transport` = per person per day |
| rating | Number | 0–5 | Editorial rating |
| tags | [String] | | Search keywords |

Seeded slugs (exactly these 12): `manali`, `goa`, `jaipur`, `udaipur`,
`munnar`, `alleppey`, `rishikesh`, `varanasi`, `darjeeling`, `jaisalmer`,
`kutch`, `leh-ladakh`.

### 3.3 `activities`

A place to visit or thing to do at a destination.

| Field | Type | Constraints | Description |
|---|---|---|---|
| destination | ObjectId → destinations | required, indexed | Parent destination |
| name | String | required | e.g. "Solang Valley" |
| type | String | enum `sightseeing` \| `adventure` \| `culture` \| `nature` \| `spiritual` \| `food` \| `shopping` | Used for interest matching |
| description | String | required | 1–2 sentences |
| location | `{ lat, lng }` | required | Real-world coordinates |
| durationHours | Number | required, 0.5–8 | Typical visit time |
| entryFee | Number | integer ≥ 0, default 0 | Per person, INR |
| rating | Number | 0–5 | |
| bestTime | String | enum `morning` \| `afternoon` \| `evening` \| `any`, default `any` | Scheduling hint |
| source | String | enum `seed` \| `google`, default `seed` | Where the record came from |
| externalId | String | optional | Google place id when `source = google` |

Unique compound index: `{ destination, name }`. Seed: 8–10 activities per
destination with real coordinates and realistic fees.

### 3.4 `trips`

| Field | Type | Constraints | Description |
|---|---|---|---|
| user | ObjectId → users | required, indexed | Owner |
| destination | ObjectId → destinations | required | |
| title | String | required, ≤ 80 chars | Default: "`<days>` days in `<destination>`" |
| startDate | Date | required | |
| endDate | Date | required, ≥ startDate | |
| days | Number | 1–14 | Inclusive day count |
| travelers | Number | 1–12 | |
| budgetTier | String | enum `economy` \| `standard` \| `luxury` | |
| interests | [String] | subset of activity `type` enum | |
| pace | String | enum `relaxed` \| `balanced` \| `packed`, default `balanced` | |
| itinerary | [ItineraryDay] | embedded | See below |
| budget | Budget | embedded | See below |
| status | String | enum `planned` \| `completed` \| `cancelled`, default `planned` | |
| notes | String | ≤ 1000 chars, default `""` | |

**ItineraryDay** `{ day: Number, date: Date, items: [ItineraryItem], totalVisitHours: Number, totalTravelKm: Number, note: String }`

**ItineraryItem** (snapshot, so a trip stays stable if activities change later)
`{ activity: ObjectId, name, type, location: {lat,lng}, startTime: "HH:mm", endTime: "HH:mm", durationHours, entryFee, travelKmFromPrev: Number, travelMinutesFromPrev: Number }`

**Budget** `{ tier, currency: "INR", rooms, nights, breakdown: { stay, food, transport, activities }, total, perPerson }`

## 4. Algorithms

### 4.1 Budget estimation — `services/budgetService.js`

Pure function `estimateBudget({ dailyCost, tier, days, travelers, activityFeesPerPerson })`.

```
nights     = max(days − 1, 1)
rooms      = ceil(travelers / 2)
stay       = dailyCost[tier].stay      × rooms     × nights
food       = dailyCost[tier].food      × travelers × days
transport  = dailyCost[tier].transport × travelers × days
activities = activityFeesPerPerson     × travelers
total      = stay + food + transport + activities
perPerson  = round(total / travelers)
```

### 4.2 Itinerary generation — `services/itineraryService.js`

Input: destination activities, `days`, `pace`, `interests`, `startDate`, a `RouteProvider`.
Deterministic: same input → same output (ties broken by name ascending).

1. **Score** each activity: `score = rating + (interests.includes(type) ? 1.5 : 0)`.
2. **Capacity**: `hoursPerDay = { relaxed: 6, balanced: 8, packed: 10 }[pace]`.
3. **Build each day** (day 1 … N) from the unassigned pool:
   a. Seed the day with the highest-scored unassigned activity.
   b. Repeatedly pick the **nearest unassigned** activity (RouteProvider distance
      from the last stop) among the top-scored half of the remaining pool, and add
      it if `visitHours + travelHours` stays ≤ `hoursPerDay`. If nothing in the top
      half fits, the lower half is tried before the day closes. An activity longer
      than `hoursPerDay` never seeds a day.
   c. Move `bestTime = evening` items to the end and `morning` items to the front
      (stable), then recompute leg distances.
4. **Schedule** each day from 09:00: `startTime = previous endTime + travelMinutes`
   (rounded up to 5 min); a 60-minute lunch gap is inserted before the first item
   that would start after 13:00. `evening` items never start before 17:00.
5. Days left with no activities get `items: []` and `note: "Free day — explore at your own pace"`.

### 4.3 Providers — `providers/`

```
RouteProvider.getMatrix(points)            → { provider, leg(i, j) → { km, minutes } }
RouteProvider.getLeg(from, to)             → { km, minutes }        (wrapper over getMatrix)
PlacesProvider.discover(destination, type) → { provider, items: [{ name, type, location, rating, address, externalId, source }] }
```

The itinerary service asks for one matrix per generation, so the Google
provider makes a single Distance Matrix request instead of one per leg.

| Provider | Route | Places |
|---|---|---|
| **local** (default) | haversine × 1.3 road factor, 25 km/h average | reads `activities` collection |
| **google** (key set) | Distance Matrix API | Places API (New) `places:searchText` — "tourist attractions in `<name>, <state>`" |

`providers/index.js` picks the implementation from config. Google providers wrap
every call in try/catch with a 4 s timeout and fall back to local, logging a
warning. Responses carry `meta.provider` so the UI can label the source.

## 5. REST API contract

Base: `/api/v1`. JSON only. Auth: `Authorization: Bearer <jwt>`.

**Envelope**

```
success → { "success": true,  "data": <payload>, "meta"?: {...} }
failure → { "success": false, "error": { "code": "VALIDATION_ERROR", "message": "...", "details"?: [{ "path": "email", "message": "..." }] } }
```

Error codes ↔ status: `VALIDATION_ERROR` 400, `UNAUTHORIZED` 401, `FORBIDDEN` 403,
`NOT_FOUND` 404, `CONFLICT` 409, `RATE_LIMITED` 429, `INTERNAL_ERROR` 500.
Invalid ObjectId in a path → 400 `VALIDATION_ERROR`. A trip owned by someone else → 404.

### Health
| Method | Path | Response `data` |
|---|---|---|
| GET | `/health` | `{ status: "ok", db: "connected", provider: "local" \| "google" }` |

### Auth
| Method | Path | Body | Response `data` |
|---|---|---|---|
| POST | `/auth/register` | `{ name, email, password }` (password ≥ 8 chars) | 201 `{ user, token }`; duplicate email → 409 |
| POST | `/auth/login` | `{ email, password }` | `{ user, token }`; bad credentials → 401 |
| GET | `/auth/me` 🔒 | — | `{ user }` |

`user` = `{ id, name, email, role, createdAt }`.

### Destinations
| Method | Path | Query | Response `data` |
|---|---|---|---|
| GET | `/destinations` | `search`, `category`, `page` (1), `limit` (12, max 50) | `{ items: [Destination], total, page, limit }` |
| GET | `/destinations/:slug` | — | `{ destination, activities: [Activity] }` |
| GET | `/destinations/:slug/discover` | `type` optional | `{ items: [DiscoveredPlace] }`, `meta: { provider }` |

`Destination` / `Activity` JSON = schema fields with `id` instead of `_id`, no `__v`.

### Planner (public)
| Method | Path | Body | Response `data` |
|---|---|---|---|
| POST | `/planner/preview` | **PlanInput** | `{ destination: {id,name,slug,state,heroImage}, days, itinerary, budget }`, `meta: { provider }` |
| POST | `/budget/estimate` | `{ destinationId, days, travelers, budgetTier }` | `{ budget }` (activities = 0) |

**PlanInput** = `{ destinationId, startDate: "YYYY-MM-DD", endDate: "YYYY-MM-DD", travelers, budgetTier, interests?: [], pace?: "balanced" }`.
Rules: `endDate ≥ startDate`, `days = diff + 1 ≤ 14`, `startDate` not in the past.

### Trips 🔒
| Method | Path | Body | Response `data` |
|---|---|---|---|
| POST | `/trips` | PlanInput + `title?` | 201 `{ trip }` — server regenerates itinerary + budget; never trusts client-computed numbers |
| GET | `/trips` | `status?` | `{ items: [TripSummary] }` newest first |
| GET | `/trips/:id` | — | `{ trip }` with `destination` populated (`id,name,slug,state,heroImage,location`) |
| PATCH | `/trips/:id` | `{ title?, notes?, status? }` | `{ trip }` |
| DELETE | `/trips/:id` | — | `{ id }` |

`TripSummary` = `{ id, title, destination: {id,name,slug,state,heroImage}, startDate, endDate, days, travelers, budgetTier, status, budget: { total, perPerson } }`.

### Cross-cutting
- `helmet`, `cors` (origin = `CLIENT_ORIGIN`), `express.json({ limit: "100kb" })`, `morgan` in dev.
- `express-rate-limit` on `/auth/*`: 20 requests / 15 min / IP.
- Zod validation via `validate(schema)` middleware → `VALIDATION_ERROR` with `details`.
- Central `errorHandler`: maps `ApiError`, Zod, Mongoose `CastError`/`ValidationError`, duplicate key 11000, JWT errors. Stack traces never leave the server.

## 6. Frontend behaviour

- `services/apiClient.js` — thin `fetch` wrapper: prefixes `/api/v1`, attaches token, unwraps `data`, throws `ApiError { status, code, message, details }`. On 401 for an authenticated call → logout + redirect to `/login`.
- `AuthContext` — token in `localStorage`, restores session via `/auth/me` on load.
- `ProtectedRoute` — redirects to `/login` with `state.from`; login returns the user there.
- **Plan → Save while logged out:** the PlanInput is kept in `sessionStorage` (`stp.pendingPlan`); after login the user lands back on `/plan` with the preview restored and can save.
- Every data view has explicit **loading** (skeleton), **empty** and **error (retry)** states.
- Currency via `Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })`.
- Responsive from 360 px; keyboard-accessible forms with visible focus and labelled inputs; `prefers-reduced-motion` respected.
- No UI kit, no Tailwind — hand-written CSS with design tokens (`styles/tokens.css`). Fonts self-hosted via `@fontsource` so the demo works offline.

## 7. Testing

| Layer | Tool | Scope |
|---|---|---|
| Unit | vitest | `budgetService`, `itineraryService` (determinism, capacity, free days, evening ordering), `geo` |
| API | vitest + supertest + mongodb-memory-server | auth flow, destinations list/filter/detail, planner preview validation, trips CRUD + ownership isolation, error envelope |
| Provider | vitest with mocked `fetch` | google → success mapping, google failure → local fallback |
| UI | manual browser walkthrough of the demo flow | Home → Destinations → Plan → Preview → Login → Save → My Trips → Trip Details |

## 8. Demo flow (Presentation-1)

1. `docker compose up -d` → `npm run seed` → `npm run dev` (server) → `npm run dev` (client).
2. Home → browse Destinations → open **Manali**.
3. "Plan a trip here" → 4 days, 2 travellers, Standard, interests Adventure + Nature → **Generate plan**.
4. Walk through the day-wise itinerary and the budget breakdown.
5. Save → prompted to log in → register → plan restored → Save → Trip Details.
6. My Trips shows the saved trip; mark as completed / add notes / delete.
