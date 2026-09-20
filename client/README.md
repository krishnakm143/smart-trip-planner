# Smart Trip Planner — client

React 18 + Vite front end for the Smart Trip Planner minor project. It talks to the
Express API described in [`../docs/design.md`](../docs/design.md) and follows that
contract's field names and response envelope.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
```

The dev server proxies `/api` to `http://localhost:4100`, so start the API first
(`cd ../server && npm run seed && npm run dev`). To point at an API on another port:

```bash
API_PROXY_TARGET=http://localhost:4199 npm run dev
```

Demo login after seeding: `demo@smarttrip.in` / `Demo@1234`.

| Script | Does |
|---|---|
| `npm run dev` | Vite dev server with the API proxy |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serves the production build |
| `npm run lint` | ESLint (React, hooks and refresh rules) |

## Layout

```
src/
├── main.jsx, App.jsx, routes.jsx
├── pages/          one folder per route; page-only components live beside the page
├── components/     shared UI: layout, ui (Button, Field, Chip, Stepper, Dialog…),
│                   states (error / empty / loader), DestinationCard, Itinerary,
│                   BudgetBreakdown, TripCard, DestinationImage
├── services/       apiClient.js + one module per API resource
├── context/        AuthContext (session), ToastContext (confirmations)
├── hooks/          useResource, useDebouncedCallback, useDocumentTitle
├── utils/          currency, dates, itinerary time helpers, validation, constants
└── styles/         tokens.css (design tokens), base.css (reset + helpers)
```

Styling is plain CSS: global tokens plus one CSS Module per component. There is no UI
kit and no chart library; the budget bar is a flex row whose segments grow by amount.

## Behaviour worth knowing

- **`services/apiClient.js`** prefixes `/api/v1`, attaches the bearer token, unwraps
  `data` and throws `ApiError { status, code, message, details }`. Endpoints that report
  a provider (`/planner/preview`, `/destinations/:slug/discover`) are called with
  `withMeta: true` to also receive `meta`. A 401 on a request that carried a token
  clears the session and redirects to `/login`; a 401 from the login form itself is
  shown as a form error.
- **`useResource(load)`** runs a memoised loader, aborts it on change, and exposes
  `data / error / loading / retry`. Every data view renders a skeleton, an empty state
  and an error state with a retry button from it.
- **Plan, then save while logged out:** the PlanInput is stored in `sessionStorage`
  under `stp.pendingPlan`. Login and Register both honour `state.from`, so the visitor
  returns to `/plan`, where the preview is regenerated and the key is cleared.
- **Server validation** `details[].path` is mapped onto the matching form field; a 409
  on registration lands on the email field.
- **Itinerary timeline:** travel legs come from `travelMinutesFromPrev` /
  `travelKmFromPrev`. The API does not return lunch as an item, so a break is drawn
  wherever the gap between two stops is longer than the drive explains
  (`utils/time.js`).
- **Images** live in `public/images/destinations/<slug>.jpg`; sources and licences are
  in `public/images/CREDITS.md`. A missing file falls back to a tinted name panel.
- **Fonts** (Eczar for display, Hind for UI) are bundled through `@fontsource`, so the
  demo works offline. Trip Details has a print stylesheet.
