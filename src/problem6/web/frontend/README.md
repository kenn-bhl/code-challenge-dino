# Frontend Mock UI

This mock UI is intentionally minimal. It demonstrates end-to-end behavior for Problem 6 with a 3-page flow:

- `pages/start.html`: login page with a link to register.
- `pages/register.html`: register page with confirm-password validation.
- `pages/scoreboard.html`: live scoreboard page shown after login (Start Mission / Complete Mission).

## Files

- `index.html`: redirects to `pages/start.html`
- `server.mjs`: serves static files and injects `BASE_URL` from env
- `.env`: frontend runtime config (copy from `.env.example`)
- `scripts/common.js`: shared storage and validation helpers
- `scripts/start.js`: login flow
- `scripts/register.js`: register flow
- `scripts/scoreboard.js`: scoreboard and action flow
- `style.css`: basic styling

## Usage

1. Start backend (`../backend`) or from workspace root with `npm run dev -w web/backend`.
2. Create `.env` from `.env.example` and set `BASE_URL`.
3. Start frontend server via `npm run dev -w web/frontend`.
4. Open in browser (root redirects to start page).
5. Login with username/password.
6. Trigger actions and observe live updates.
