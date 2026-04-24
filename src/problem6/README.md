# Problem 6 - Scoreboard Module Specification

This module provides a secure, live-updating scoreboard with top-10 users.

## Runtime Requirements

- Node.js 20+
- PostgreSQL instance (local server, container, or managed service)

## Environment Configuration

### 1) Backend environment

From `src/problem6/web/backend`:

```bash
cp .env.example .env
```

Required backend variables:

| Variable | Description |
|----------|-------------|
| `PORT` | Backend HTTP port (default: `4000`) |
| `DATABASE_URL` | PostgreSQL connection string used by app and Knex migrations |
| `CORS_ORIGIN` | Allowed frontend origin for browser requests |
| `ACTION_EXPIRY_SECONDS` | Mission validity duration (seconds) |
| `ACTION_RATE_WINDOW_MINUTES` | Rate limit window size (minutes) |
| `ACTION_RATE_MAX_REQUESTS` | Max mission-start requests per rate window |
| `ACTION_START_COOLDOWN_SECONDS` | Minimum delay between mission starts |

### 2) Frontend environment

From `src/problem6/web/frontend`:

```bash
cp .env.example .env
```

Required frontend variables:

| Variable | Description |
|----------|-------------|
| `BASE_URL` | Backend base URL (example: `http://localhost:4000`) |
| `FRONTEND_PORT` | Frontend local port (default: `5173`) |

## Install and Run (Step by Step)

Run from `src/problem6`:

1. Install dependencies for all workspaces:

```bash
npm install
```

2. Run database migrations:

```bash
npm run migrate:latest -w web/backend
```

3. Start backend:

```bash
npm run dev -w web/backend
```

4. Start frontend (new terminal):

```bash
npm run dev -w web/frontend
```

5. Open frontend in browser:

```text
http://localhost:5173
```

Useful alternatives:

```bash
npm run start -w web/backend
npm run start -w web/frontend
npm run build -w web/backend
npm run migrate:rollback -w web/backend
npm run migrate:make -w web/backend -- add_new_change
```

## Top-level Structure

- `web/backend/` - API service, auth/session, score logic, realtime stream.
- `web/frontend/` - mock UI for register/login, action completion, and live scoreboard.

## Security Model

### Database Tables (PostgreSQL)

This module now uses real PostgreSQL tables managed by Knex migrations:

- `users` (`id`, `username`, `password_hash`, `created_at`)
- `sessions` (`token`, `user_id`, `created_at`)
- `user_scores` (`user_id`, `score`, `updated_at`)
- `applied_actions` (`action_id`, `user_id`, `delta`, `created_at`)

### Session Token Authentication

- Registration endpoint: `POST /api/v1/auth/register`
- Login endpoint: `POST /api/v1/auth/login`
- Logout endpoint: `POST /api/v1/auth/logout`

On successful login, backend returns a session token.
Client stores the token (frontend uses `sessionStorage`) and sends:

- `Authorization: Bearer <token>`

All protected endpoints require this session token.

### Action Integrity

Mission flow uses server-side lifecycle states (`pending`, `success`, `expired`)
with server timestamps and expiration checks.

### Anti-Cheat Solutions In Use

Current anti-abuse protections:

1. Session authentication is required for all mission and leaderboard endpoints.
2. Mission IDs are server-generated UUIDs (`action_id`) and never trusted from client-generated start flow.
3. Mission expiration uses server time only (`expires_at`) to avoid client clock/timezone manipulation.
4. Single active mission enforcement: only one `pending` mission per user at a time.
5. Expiration state transition: stale pending missions are moved to `expired`.
6. Completion validation: complete without a valid pending mission returns `Mission Failed`.
7. Rate limiting for mission start:
   - `ACTION_RATE_WINDOW_MINUTES`
   - `ACTION_RATE_MAX_REQUESTS`
8. Cooldown enforcement between mission starts:
   - `ACTION_START_COOLDOWN_SECONDS`
9. Mission success transition (`pending` -> `success`) is persisted before score update response.
10. Scoreboard updates are server-authoritative and broadcast only after backend validation.

### Important Practical Note

For real game/business scenarios, add another guard in the product flow:

- verify mission completion on the frontend experience (UI/game state) before allowing users to press complete.

This improves UX and blocks naive misuse, but it is only an additional layer.
The backend validation remains the source of truth and final protection.

## API Endpoints

Base URL: `http://localhost:4000`

Public:

- `GET /health`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`

Protected (session token required):

- `POST /api/v1/auth/logout`
- `GET /api/v1/leaderboard?limit=10`
- `POST /api/v1/missions/start`
- `POST /api/v1/missions/complete`
- `GET /api/v1/leaderboard/stream` (SSE)

## Migrations (Knex)

From `src/problem6`:

- `npm run migrate:latest`
- `npm run migrate:rollback`
- `npm run migrate:make -w web/backend -- <migration_name>`

Required env:

- `DATABASE_URL`
- `ACTION_EXPIRY_SECONDS`
- `ACTION_RATE_WINDOW_MINUTES`
- `ACTION_RATE_MAX_REQUESTS`
- `ACTION_START_COOLDOWN_SECONDS`

## Response Contract

All responses use:

```json
{
  "success": true,
  "data": {},
  "message": ""
}
```

## Frontend Mock

The mock UI provides:

- frontend validation for register/login input,
- backend validation through auth endpoints,
- session-token login flow,
- action completion call,
- leaderboard snapshot fetch,
- live leaderboard updates via SSE.

## Workspace CLI

Run from `src/problem6` with npm workspaces:

- Backend dev: `npm run dev -w web/backend`
- Backend start: `npm run start -w web/backend`
- Frontend dev: `npm run dev -w web/frontend`
- Frontend start: `npm run start -w web/frontend`

Frontend base URL is configured via `web/frontend/.env`:

- `BASE_URL=http://localhost:4000`

## Diagram

See `diagram.mmd` for execution flow.

## Improvements

1. Add mission-specific business checks (objective proof, telemetry, anti-bot signals).
2. Add secure cookie session strategy or signed JWT with rotation.
3. Add observability and audit trail for mission lifecycle and score updates.
4. Add anomaly detection dashboards for abuse patterns.
