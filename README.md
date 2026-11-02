# Smart Trip Planner

A production-ready full-stack intelligent travel platform that turns a destination, travel dates, group size, and target budget into a day-wise itinerary, budget breakdown, interactive map, expense splitting, packing list, and document vault.

| Layer | Technology |
|---|---|
| Client | React 18, Vite, React Router, CSS Modules, Leaflet Maps, Lucide Icons |
| API | Node.js, Express, Zod, JWT, bcrypt, Brevo Email SDK |
| Primary Database | **Supabase (PostgreSQL with Row Level Security)** |
| Alternative Storage | MongoDB 7 with Mongoose |
| Authentication | Supabase Auth (or Passwordless Email OTP via Brevo / Local JWT) |
| Transactional Email | Brevo REST API (Passwordless OTP login & trip plan delivery) |
| External Maps & Places | OpenStreetMap (Overpass & OSRM) + Google Places / Distance Matrix (optional) |
| Testing & Quality | Vitest, Supertest, ESLint |

---

## Architecture & Database Setup

Smart Trip Planner is configured to use **Supabase** (PostgreSQL + Supabase Auth) as its primary database.

### 1. Setting up Supabase Database

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** -> **New Query**.
3. Paste the contents of [`supabase/schema.sql`](supabase/schema.sql) and click **Run**.
   - This sets up all 5 tables: `profiles`, `trips`, `expenses`, `destinations`, and `activities`.
   - Enables Row Level Security (RLS) ensuring strict multi-tenant isolation (`auth.uid() = user_id`).
   - Configures the automatic profile creation trigger on user registration.
   - Pre-seeds all 12 Indian destinations and 120 curated activities with stable IDs.

### 2. Environment Configuration

In `server/.env`:
```env
AUTH_PROVIDER=supabase
TRIP_STORAGE=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key

# Transactional Email (Brevo) for Passwordless OTP Login & Itinerary Dispatch
BREVO_API_KEY=your-brevo-api-key
BREVO_SENDER_EMAIL=notifications@smarttripplanner.com
BREVO_SENDER_NAME=Smart Trip Planner
```

In `client/.env`:
```env
VITE_API_URL=/api/v1
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key
```

---

## Running Locally

Requirements: Node.js 20 or newer.

```sh
# 1. Start Backend API -> http://localhost:4100
cd server
npm install
npm run dev

# 2. Start Frontend Client -> http://localhost:5173
cd ../client
npm install
npm run dev
```

---

## Key Features

1. **Intelligent Budget Planner**: Enter a target budget (e.g. ₹25,000) or choose presets. The system deterministically derives the optimal budget tier (Economy, Standard, Luxury), computes daily per-person allocation, intercity travel, and contingency buffers.
2. **Interactive Day-Wise Itinerary**: Nearest-neighbor heuristic sequencing minimizing transit time, time-slotted morning/afternoon/evening activities, and drag-and-drop reordering.
3. **Interactive Destination Maps**: Leaflet map integration with custom markers, coordinates, and nearby attraction discovery.
4. **Expense Tracker & Minimum-Cash-Flow Debt Settlement**: Category spending breakdown, payment methods, equal/custom splitting, and minimum-transaction settlement calculation ("Who owes whom").
5. **Smart Packing Checklist Generator**: Automated checklist suggestions based on destination category (beach, mountains, desert), trip duration, and group mode.
6. **Travel Reservations Vault**: Secure storage for flight, train, hotel, and restaurant booking details and confirmation numbers.
7. **Passwordless OTP Login & Email Delivery**: Instant one-time passcode login and one-click trip itinerary emailing powered by Brevo.

---

## Automated Verification

```sh
cd server && npm test        # 16 test files, 163 tests passing
cd server && npm run lint    # 0 errors, 0 warnings
cd client && npm run lint    # 0 errors, 0 warnings
cd client && npm run build   # Production Vite bundle built in <300ms
```

---

## Repository Structure

```
client/     React 18 frontend, context, pages, components, Leaflet map
server/     Express REST API, Supabase services, Brevo email service, tests
supabase/   schema.sql (Consolidated complete schema + RLS + seed) and migrations
docs/       design.md, architecture diagrams, and system specifications
```
