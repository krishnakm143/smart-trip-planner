# Smart Trip Planner

A web application that turns a destination, travel dates, group size and budget
tier into a day-wise itinerary and a cost estimate. Built as the Semester III
minor project (MC03094171) for the MCA programme at SVIT, Vasad.

| Layer | Technology |
|---|---|
| Client | React 18, Vite, React Router, CSS Modules |
| API | Node.js, Express, Zod, JWT, bcrypt |
| Database | MongoDB 7 with Mongoose |
| External (optional) | Google Places API, Google Distance Matrix API |
| Tests | Vitest, Supertest, mongodb-memory-server |

## Running it locally

Requirements: Node.js 20 or newer, Docker Desktop.

```sh
# 1. database
docker compose up -d

# 2. API  -> http://localhost:4100
cd server
cp .env.example .env        # then set JWT_SECRET to a long random string
npm install
npm run seed                # 12 destinations, 120 activities, one demo user
npm run dev

# 3. client -> http://localhost:5173
cd ../client
npm install
npm run dev
```

Demo login: `demo@smarttrip.in` / `Demo@1234`

Leaving `GOOGLE_MAPS_API_KEY` empty in `server/.env` keeps the app on its local
providers (seeded places, haversine distances), so it runs without internet.
Setting the key switches route legs and "discover nearby" to Google, with an
automatic fallback to the local providers if a request fails.

## How a plan is computed

**Itinerary.** Activities are scored by rating, with a bonus when their type
matches a chosen interest. Each day starts from the best remaining activity and
keeps adding the nearest one that still fits the day's hours (6, 8 or 10
depending on pace). Morning places go first and evening places last; the day is
then scheduled from 09:00 with travel time between stops and a lunch break.

**Budget.**

```
nights     = max(days - 1, 1)          rooms = ceil(travellers / 2)
stay       = rate.stay      x rooms      x nights
food       = rate.food      x travellers x days
transport  = rate.transport x travellers x days
activities = entry fees     x travellers
```

The full design, data model and API contract are in [`docs/design.md`](docs/design.md).

## Tests

```sh
cd server && npm test        # unit, API and provider tests
cd server && npm run lint
cd client && npm run lint && npm run build
```

## Repository layout

```
client/   React application                       (see client/README.md)
server/   Express API, seed data and tests        (see server/README.md)
docs/     design.md, UML diagrams, project document, Presentation-1 deck
```

The project document and the slide deck are generated from `docs/tools/`.
Team details live in `docs/tools/team.json`; after editing it run:

```sh
cd docs/tools
npm install
node build-document.js       # .docx + .pdf
./render-preview.sh          # .pptx + .pdf
```

## Team

| Member | Role |
|---|---|
| Udit Mishra | Backend, database, API |
| Hardik Vaghela | Frontend, UI |
| Vraj | Documentation, UML, system design |

Destination photographs are from Wikimedia Commons; authors and licences are
listed in [`client/public/images/CREDITS.md`](client/public/images/CREDITS.md).
