# Problem 5 - Crude Server (Express + TypeScript + PostgreSQL)

This project implements a TypeScript backend service using Express and PostgreSQL (via Knex) with CRUD APIs for `resources`.

## Runtime Requirements

- Node.js 20+
- PostgreSQL instance (managed externally: local server, VM, RDS, Cloud SQL, etc.)

## Environment Configuration

1. Copy the template:

```bash
cp .env.example .env
```

2. Configure variables:

| Variable | Description |
|----------|-------------|
| `PORT` | HTTP port (default: `3000`) |
| `DATABASE_URL` | PostgreSQL connection string used by app and Knex migration CLI |
| `API_KEY` | Optional API key for `/api/resources` routes. If set, clients must send `X-API-Key` or `Authorization: Bearer <key>`. In production (`NODE_ENV=production`) this key is required. |

## Database Migrations

Migration files live in `database/migrations/`.

Run from `src/problem5`:

```bash
cd src/problem5
npm run migrate:latest
npm run migrate:rollback
npm run migrate:make -- add_new_change
npm run migrate:status
```

Notes:

- Migration files use `.mjs`; `knexfile.mjs` includes `loadExtensions: [".mjs"]` so Knex can detect them.
- If `migrate:latest` says "Already up to date" but table `resources` does not exist, you are likely pointing to a different database or have inconsistent `knex_migrations` history.

## Install and Run

```bash
cd src/problem5
npm install
npm run migrate:latest
npm run dev
```

Alternative commands:

```bash
npm start
npm run build
npm run start:dist
npm run debug:health
```

## Response Contract

All API responses follow this envelope:

```json
{
  "success": true,
  "data": {},
  "message": ""
}
```

Error responses use the same shape with `success: false`.

## API Endpoints

Base URL: `http://localhost:3000`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/api/resources` | Create one resource |
| POST | `/api/resources/bulk` | Create many resources |
| GET | `/api/resources` | List resources with filters and pagination |
| GET | `/api/resources/:id` | Get resource details |
| PUT | `/api/resources/:id` | Update resource (partial) |
| DELETE | `/api/resources/:id` | Delete resource |

### Create One Resource

`POST /api/resources`

Body:

- `name` (required, non-empty string)
- `description` (optional, string or null)
- `status` (optional: `active | archived | draft`, default `active`)

### Create Many Resources (Bulk)

`POST /api/resources/bulk`

Body:

```json
{
  "items": [
    { "name": "Resource A", "description": "Example", "status": "active" },
    { "name": "Resource B", "status": "draft" }
  ]
}
```

Behavior:

- Max `100` items per request.
- Per-item validation is identical to single create.
- Returns `201` if all items succeed.
- Returns `207` if some items fail validation.
- Response includes created records plus per-item errors with indexes.

### List Resources with Filters

`GET /api/resources`

Query params:

| Param | Meaning |
|-------|---------|
| `q` | Case-insensitive substring on `name` |
| `status` | Exact status (`active`, `archived`, `draft`) |
| `name_exact` | Exact `name` match |
| `description` | Case-insensitive substring on `description` |
| `id_from`, `id_to` | Inclusive ID range |
| `created_from`, `created_to` | Inclusive ISO date-time range for `created_at` |
| `updated_from`, `updated_to` | Inclusive ISO date-time range for `updated_at` |
| `sort` | `id`, `name`, `status`, `created_at`, `updated_at` |
| `order` | `asc` or `desc` |
| `limit` | Page size (1-100, default 20) |
| `offset` | Row offset (default 0) |

List response payload (`data`) contains:

- `items`: array of resources
- `pagination`: `{ total, limit, offset, page, hasMore }`

### Update Resource

`PUT /api/resources/:id`

Body can include one or more of:

- `name`
- `description`
- `status`

### Delete Resource

`DELETE /api/resources/:id`

Success payload:

```json
{
  "success": true,
  "data": { "deleted": true, "id": 1 },
  "message": "resource deleted"
}
```

## cURL Examples

When `API_KEY` is configured, include one of:

- `X-API-Key: <API_KEY>`
- `Authorization: Bearer <API_KEY>`

```bash
# Create one
curl -s -X POST http://localhost:3000/api/resources \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-key" \
  -d '{"name":"Demo","description":"Hello","status":"draft"}'

# Bulk create
curl -s -X POST http://localhost:3000/api/resources/bulk \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-key" \
  -d '{"items":[{"name":"Bulk 1","status":"active"},{"name":"Bulk 2","description":"hello","status":"draft"}]}'

# List with filters
curl -s -G "http://localhost:3000/api/resources" \
  -H "X-API-Key: your-secret-key" \
  --data-urlencode "q=demo" \
  --data-urlencode "status=active" \
  --data-urlencode "sort=created_at" \
  --data-urlencode "order=desc" \
  --data-urlencode "limit=20" \
  --data-urlencode "offset=0"

# Get one
curl -s http://localhost:3000/api/resources/1 \
  -H "X-API-Key: your-secret-key"

# Update
curl -s -X PUT http://localhost:3000/api/resources/1 \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-key" \
  -d '{"status":"active"}'

# Delete
curl -s -X DELETE http://localhost:3000/api/resources/1 \
  -H "X-API-Key: your-secret-key"
```

## Project Structure

- `src/services/` - HTTP layer (app setup, middleware, routes, entrypoint)
- `src/models/Resource.ts` - Knex data-access model for `resources`
- `src/types.ts` - Shared API/database mapping types
- `database/db.ts` - Knex singleton and DB connection setup
- `database/migrations/` - Schema migration files
- `knexfile.mjs` - Knex CLI configuration
- `src/tasks/debug/health-check.ts` - Debug helper script for `/health`
