# SSD Failure Simulation (Option F + Option A)

A small React + Express app that demonstrates two failure modes:

- Interdependency failure (Option F): Currency Price Viewer simulates an upstream service (rates-service) returning a 500, which propagates through an aggregated endpoint.
- Hardware failure (Option A): Notes Editor simulates "disk full" (ENOSPC) when content length exceeds a threshold and the Failure Toggle is ON.

You can run this with a real backend or entirely frontend-only using Mock Service Worker (MSW).

---

## Prerequisites

- Node.js LTS (18+ recommended)
- Windows cmd examples below (PowerShell users: see Troubleshooting if scripts are blocked)

---

## Run Option A: Frontend-only (MSW, no backend)

This mode uses MSW to intercept `/api` requests in the browser and return realistic responses.

1) Install and run frontend:

```bat
cd /d "c:\Users\is809\OneDrive\Desktop\SSD_Assignment4\frontend"
npm install
npm run dev
```

2) Ensure MSW is enabled (default in this repo):

- File: `frontend/.env`
- Contains: `VITE_USE_MSW=true`

3) Open the printed URL (typically http://localhost:5173). All `/api` requests are mocked.

Notes:
- Notes data is held in-memory during the session.
- Backend is not required in this mode.

---

## Run Option B: Real backend + frontend dev

1) Start backend (Express on port 3000):

```bat
cd /d "c:\Users\is809\OneDrive\Desktop\SSD_Assignment4\backend"
npm install
npm start
```

2) Start frontend (Vite on port 5173 with `/api` proxy to 3000):

```bat
cd /d "c:\Users\is809\OneDrive\Desktop\SSD_Assignment4\frontend"
# Disable MSW if you want real backend: set VITE_USE_MSW=false in .env
npm install
npm run dev
```

3) Open the printed URL (typically http://localhost:5173). Requests to `/api` are proxied to Express.

---

## Production build (served by Express)

1) Build frontend:

```bat
cd /d "c:\Users\is809\OneDrive\Desktop\SSD_Assignment4\frontend"
npm run build
```

2) Start backend (it will serve `frontend/dist` if present):

```bat
cd /d "c:\Users\is809\OneDrive\Desktop\SSD_Assignment4\backend"
npm start
```

3) Visit http://localhost:3000

---

## How to trigger failures

### Interdependency failure (Currency Price Viewer)

In the UI:
- Toggle "Inject Failure" and click "Fetch Converted Price".
- You’ll see a red banner with a user-friendly message and a correlation ID.

What happens behind the scenes:
- When failure is ON, the mocked/real `/api/rate` responds with 500.
- The aggregated `/api/priceView` endpoint returns a 502 with structured error details.

Optional curl (real backend only):
```bat
curl -s "http://localhost:3000/api/rate?target=EUR&failure=true"
```

### Hardware failure (Notes Editor — ENOSPC)

In the UI:
- Toggle "Failure Toggle".
- Type more than 500 characters in the textarea.
- Click "Save" — you’ll get: "Save failed: ENOSPC (No space left on device)".

What happens behind the scenes:
- The mocked/real `/api/notes/save` returns HTTP 507 with `{ code: "ENOSPC" }` when toggle is ON and size > 500.

---

## Sample logs

### Client log (PriceViewer failure)
Emitted by the frontend when `/api/priceView` fails:
```json
{
  "timestamp": "2025-11-19T12:34:56.789Z",
  "chain": "A→B→C",
  "upstreamService": "rates-service",
  "statusOrReason": "HTTP_502",
  "correlationId": "d1b8d1d6-ef96-4b7b-8bb7-3b4c7e05e3dc",
  "errorCode": "INTERDEPENDENCY_FAIL",
  "uiContext": "priceViewFetchReact"
}
```

### Server log (Interdependency failure)
Printed by the backend when the upstream rates-service fails (real backend mode):
```json
{
  "timestamp": "2025-11-19T12:35:10.123Z",
  "chain": "A→B→C",
  "upstreamService": "rates-service",
  "statusOrReason": "500 internal failure",
  "correlationId": "3667022c-7c1b-4f21-8d49-8cf8a2e3d7a4",
  "errorCode": "INTERDEPENDENCY_FAIL"
}
```

### Notes log file (ENOSPC)
Appended to `backend/data/notes.log.ndjson` in real backend mode:
```json
{"timestamp":"2025-11-19T12:36:00.000Z","user":"alice","docId":"doc-1","size":612,"error":"ENOSPC","message":"No space left on device"}
```

---

## Feature map

- Currency Price Viewer
  - GET `/api/priceView` (aggregates `/api/basePrice` + `/api/rate`)
  - Failure toggle injects upstream errors.
- Notes Editor
  - POST `/api/notes/save` with ENOSPC simulation when Failure Toggle is ON and size > 500.
  - GET `/api/notes/:docId` to fetch saved content (real backend) or in-memory (MSW).

---

## Troubleshooting (Windows)

- PowerShell blocks npm:
  - Use cmd form: `npm.cmd install` or run via `cmd.exe /c npm install`
- Missing dependencies:
  - Backend: `cd backend && npm install`
  - Frontend: `cd frontend && npm install`
- Port already in use:
  - Change `PORT` env for backend or let Vite choose another port.
- MSW isn’t intercepting:
  - Ensure `frontend/.env` has `VITE_USE_MSW=true` and restart `npm run dev`.

---

## Notes

- Correlation IDs surface in UI and logs to help trace requests across services.
- In MSW mode, "server-side" logs only appear in the browser console; no files are written.
- In real backend mode, notes logs are appended to `backend/data/notes.log.ndjson`.
# SSD-Failure-Simulation