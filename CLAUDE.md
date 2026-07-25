# smart-ac

## 1. What this project is

smart-ac is a Smart AC monitoring and optimization system, built as a learning /
portfolio project by a developer who is new to full-stack work. The stack is a
Node/Express backend and a React + Vite frontend. MongoDB Atlas and Socket.io are
planned but not yet added. The backend deploys to Render and the frontend to Vercel;
both are currently live and working.

## 2. Current state (what actually exists today)

This reflects what is in the repo right now, not what is planned.

- **Repo layout:** two independent packages side by side — `server/` (Express) and
  `client/` (React + Vite). There is **no root `package.json`** and no monorepo
  tooling; each side is installed and run on its own.
- **Backend (`server/src/index.js`):** a minimal Express 5 app. It loads `.env` via
  `dotenv`, enables `cors()`, parses JSON, exposes a single route
  `GET /api/hello` that returns `{ message: 'hello from the server' }`, and listens
  on `process.env.PORT || 4000`. That is the entire backend.
- **Frontend (`client/src/App.jsx`):** a single component that, on mount, fetches
  `${VITE_API_URL}/api/hello` and renders the returned message (or a fallback
  string on error) under an `<h1>Smart AC — coming soon</h1>`. Standard Vite entry
  in `client/src/main.jsx` (`StrictMode` + `createRoot`).
- **Config:** `server/.env` holds `PORT`; `client/.env` holds `VITE_API_URL`
  (points at `http://localhost:4000` locally, the Render URL in production). Both
  `.env` files are gitignored and untracked. There are **no `.env.example`
  files** — worth adding for onboarding.
- **What does NOT exist yet:**
  - **The simulation engine does not exist yet.** There is no `SimulationDriver`,
    no `DeviceDriver` interface, no physics code — nothing in `server/src`
    beyond the hello-world route.
  - No MongoDB / Atlas integration (no `mongoose`/`mongodb` dependency, no models).
  - No Socket.io (no dependency, no real-time channel).
  - No `HardwareDriver`, no MQTT.
  - No tests, no CI.

The project is at the "hello-world wired end to end" stage (see the two existing
commits: `Phase 0: hello-world front and back end`, then
`Phase 0: connect front-end to back-end`).

## 3. Core architectural rule (everything depends on this)

**All application logic sits above a `DeviceDriver` boundary.**

- A physics-based `SimulationDriver` sits behind that boundary now (to be built).
- A real-hardware `HardwareDriver` (MQTT) will replace it later.
- Application code must depend **only on the `DeviceDriver` interface** and must
  **never import a concrete driver directly**.
- Swapping to real hardware must mean **writing one new class** that implements
  `DeviceDriver` — **not editing anything above the boundary**.

If a change forces edits to application code in order to switch drivers, the
boundary has been violated. Treat that as a design error to fix, not to work around.

## 4. Conventions to follow

Match what the existing code already does; do not introduce a second style.

- **Module systems differ per side, intentionally:**
  - `server/` is **CommonJS** (`"type": "commonjs"`; `require`/`module.exports`).
  - `client/` is **ES modules** (`"type": "module"`; `import`/`export`).
- **File layout:** source lives under `src/` on each side. Keep new backend code in
  `server/src/`, new frontend code in `client/src/`.
- **Formatting (observed):** 2-space indentation, single quotes, semicolons,
  trailing-comma-free single-line objects. Short explanatory end-of-line comments
  are used liberally in the existing files — keep that teaching-oriented style.
- **Naming:** files are lowercase (`index.js`, `main.jsx`); React components are
  PascalCase (`App.jsx`).
- **Linting:** the client uses flat-config ESLint (`client/eslint.config.js`) with
  `@eslint/js` recommended + `react-hooks` + `react-refresh`. The server has no
  linter configured yet.
- **Scripts:** server `npm run dev` uses `node --watch src/index.js`; client
  `npm run dev` uses `vite`. Prefer these over ad-hoc invocations.
- **Config via env:** never hardcode ports or URLs — read them from `.env`
  (`process.env.*` on the server, `import.meta.env.VITE_*` on the client), as the
  existing code does.

## 5. Honesty rules (hard constraints)

These are non-negotiable for this project:

1. **Simulated sensor values must come from real physics equations.** Never
   `Math.random()`, never a hardcoded or pre-scripted curve to fake plausible data.
2. **Every assumed physical constant must carry a comment** giving its unit and
   stating explicitly that it is an *assumed* value, not a measured one.
3. **No savings, cost, or efficiency metric may be presented without being
   explicitly labeled as simulated.** This applies to UI, API responses, and logs.
4. **Any external data (e.g. electricity tariffs) must come from a real, cited
   source.** Never invent figures. Cite the source in a comment or the docs.
5. Simulated time is the project's only clock. Every piece of downstream code 
   charts, persistence, scheduling, pricing — reads reading.timestamp. Nothing anywhere calls Date.now() to reason about when something happened.

## 6. Workflow rules

- **Work only within the scope given in each prompt.** Do exactly what is asked.
- **Never build ahead into future phases.** No speculative scaffolding for work that
  hasn't been requested.
- **Stop and report at the end of every task.** Summarize what was read, changed,
  and found; do not continue past the stated scope.
- **Never commit or push.** The developer handles all git operations.
