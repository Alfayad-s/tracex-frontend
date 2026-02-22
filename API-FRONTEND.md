# TraceX API — Full frontend reference

Use this document to integrate the frontend with the TraceX backend. All endpoints use the same response shape unless noted.

---

## Overview

| Item                 | Value                                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Base URL**         | Backend origin (e.g. `http://localhost:3000` or `https://api.example.com`)                                    |
| **API prefix**       | Use **`/api/v1`** for all routes (e.g. `POST /api/v1/auth/signup`). `/api` without version is also supported. |
| **Content-Type**     | `application/json` for request bodies.                                                                        |
| **Success response** | `{ "success": true, "data": ... }` or auth: `{ "success": true, "user": ..., "token": ... }`.                 |
| **Error response**   | `{ "success": false, "error": "<string>" }`. Use HTTP status + `error` for UI messages.                       |
| **Auth**             | Send JWT in header: `Authorization: Bearer <token>`.                                                          |
| **Rate limits**      | Global: 200 req / 15 min per IP. Auth routes: 20 req / 15 min per IP. 429 on exceed.                          |
| **Swagger UI**       | `GET /api-docs` for interactive docs.                                                                         |

---

## Health

| Method | Path      | Auth | Description   |
| ------ | --------- | ---- | ------------- |
| GET    | `/health` | No   | Server status |

**Response 200**

```json
{ "status": "ok", "timestamp": "2025-02-21T12:00:00.000Z" }
```

---

## Authentication

Base path: `/api/v1/auth`. Rate limit: 20 req / 15 min per IP.

### POST /api/v1/auth/signup

Register a new user.

**Request body**

| Field    | Type   | Required | Rules            |
| -------- | ------ | -------- | ---------------- |
| email    | string | Yes      | Valid email      |
| password | string | Yes      | Min 6 characters |

**Response 201**

```json
{
  "success": true,
  "user": { "id": "uuid", "email": "user@example.com", "name": null },
  "token": "eyJ..."
}
```

**Errors**

| Status | When                            | error example                                                 |
| ------ | ------------------------------- | ------------------------------------------------------------- |
| 400    | Invalid email or short password | `"Invalid email"`, `"Password must be at least 6 characters"` |
| 400    | Email already registered        | `"Email already registered"`                                  |

---

### POST /api/v1/auth/signin

Sign in.

**Request body**

| Field    | Type   | Required |
| -------- | ------ | -------- |
| email    | string | Yes      |
| password | string | Yes      |

**Response 200** — Same shape as signup: `{ "success": true, "user": { "id", "email", "name" }, "token": "..." }`.

**Errors**

| Status | When              | error example                               |
| ------ | ----------------- | ------------------------------------------- |
| 400    | Validation        | `"Invalid email"`, `"Password is required"` |
| 401    | Wrong credentials | `"Invalid email or password"`               |

---

### GET /api/v1/auth/me

Current user. Requires `Authorization: Bearer <token>`.

**Response 200**

```json
{
  "success": true,
  "user": { "id": "uuid", "email": "user@example.com", "name": "Optional Name" }
}
```

**Errors**

| Status | When                  | error example                                                      |
| ------ | --------------------- | ------------------------------------------------------------------ |
| 401    | Missing/invalid token | `"Missing or invalid authorization"`, `"Invalid or expired token"` |
| 404    | User not found        | `"User not found"`                                                 |

---

## Categories

Base path: `/api/v1/categories`. All require auth. Predefined categories have `userId: null` and are read-only; only user categories can be updated/deleted.

### GET /api/v1/categories

List predefined + current user’s categories.

**Response 200**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Food",
      "userId": null,
      "color": null,
      "icon": null
    },
    {
      "id": "uuid",
      "name": "My Category",
      "userId": "user-uuid",
      "color": "#ff0000",
      "icon": "tag"
    }
  ]
}
```

**Category object:** `id`, `name`, `userId` (null = predefined), `color?`, `icon?`.

---

### GET /api/v1/categories/:id

Get one category. **Params:** `id` (UUID).

**Response 200** — `{ "success": true, "data": <category> }`.

**Errors:** 400 (invalid UUID), 401, 404.

---

### POST /api/v1/categories

Create a user category.

**Request body**

| Field | Type   | Required | Rules       |
| ----- | ------ | -------- | ----------- |
| name  | string | Yes      | 1–100 chars |
| color | string | No       | Max 20      |
| icon  | string | No       | Max 50      |

**Response 201** — `{ "success": true, "data": <category> }`.

**Errors:** 400 (validation, duplicate name), 401.

---

### PATCH /api/v1/categories/:id

Update a user category. **Params:** `id` (UUID). **Body:** all optional — `name`, `color`, `icon` (same rules as create).

**Response 200** — `{ "success": true, "data": <category> }`.

**Errors:** 400, 401, 403 (not your category), 404.

---

### DELETE /api/v1/categories/:id

Delete a user category. **Params:** `id` (UUID).

**Response 204** — No body.

**Errors:** 400, 401, 403, 404.

---

## Expenses

Base path: `/api/v1/expenses`. All require auth. Soft-deleted expenses are excluded from list, summary, and export.

**Expense object:** `id`, `date` (YYYY-MM-DD), `amount` (number), `category`, `description?`, `userId`, `deletedAt?`, `createdAt`, `updatedAt`.

### GET /api/v1/expenses

List expenses with pagination and filters.

**Query params**

| Param     | Type   | Default | Description                                     |
| --------- | ------ | ------- | ----------------------------------------------- |
| page      | number | 1       | Page number                                     |
| limit     | number | 20      | Page size (1–100)                               |
| from      | string | —       | Start date YYYY-MM-DD                           |
| to        | string | —       | End date YYYY-MM-DD                             |
| category  | string | —       | Exact category name                             |
| minAmount | number | —       | Min amount                                      |
| maxAmount | number | —       | Max amount                                      |
| search    | string | —       | Substring in description (case-insensitive)     |
| sort      | string | date    | `date` \| `amount` \| `category` \| `createdAt` |
| order     | string | desc    | `asc` \| `desc`                                 |

**Response 200**

```json
{
  "success": true,
  "data": [ "<expense>", ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

**Errors:** 401.

---

### GET /api/v1/expenses/:id

Get one expense. **Params:** `id` (UUID).

**Response 200** — `{ "success": true, "data": <expense> }`.

**Errors:** 400, 401, 404.

---

### POST /api/v1/expenses

Create an expense. Category must exist (predefined or user’s).

**Request body**

| Field       | Type   | Required | Rules                   |
| ----------- | ------ | -------- | ----------------------- |
| date        | string | Yes      | YYYY-MM-DD              |
| amount      | number | Yes      | > 0                     |
| category    | string | Yes      | 1–100 chars; must exist |
| description | string | No       | Max 5000                |

**Response 201** — `{ "success": true, "data": <expense> }`.

**Errors:** 400 (validation, category not found), 401.

---

### PATCH /api/v1/expenses/:id

Partial update. **Params:** `id` (UUID). **Body:** all optional — `date`, `amount`, `category`, `description` (same rules as create).

**Response 200** — `{ "success": true, "data": <expense> }`.

**Errors:** 400, 401, 404.

---

### DELETE /api/v1/expenses/:id

Soft delete. **Params:** `id` (UUID).

**Response 204** — No body.

**Errors:** 400, 401, 404.

---

### POST /api/v1/expenses/:id/restore

Restore a soft-deleted expense. **Params:** `id` (UUID).

**Response 200** — `{ "success": true, "data": <expense> }`.

**Errors:** 400, 401, 404.

---

### POST /api/v1/expenses/bulk

Create up to 100 expenses. Each category must exist.

**Request body**

```json
{
  "expenses": [
    {
      "date": "2025-02-21",
      "amount": 10.5,
      "category": "Food",
      "description": "Snack"
    }
  ]
}
```

Each item: `date` (YYYY-MM-DD), `amount` (> 0), `category`, `description?` (optional).

**Response 201**

```json
{ "success": true, "data": [ "<expense>", ... ], "count": N }
```

**Errors:** 400 (validation, category not found, or > 100 items), 401.

---

### GET /api/v1/expenses/summary

Aggregate total and count; optional grouping.

**Query params:** `from`, `to` (YYYY-MM-DD, optional), `groupBy` (optional: `day` \| `week` \| `month`).

**Response 200 (no groupBy)**

```json
{ "success": true, "data": { "total": 150.5, "count": 12 } }
```

**Response 200 (with groupBy)**

```json
{
  "success": true,
  "data": {
    "total": 150.5,
    "count": 12,
    "byPeriod": [{ "period": "2025-02-01", "total": 80, "count": 5 }]
  }
}
```

**Errors:** 401.

---

### GET /api/v1/expenses/summary/by-category

Totals per category.

**Query params:** `from`, `to` (optional, YYYY-MM-DD).

**Response 200**

```json
{
  "success": true,
  "data": {
    "total": 150.5,
    "count": 12,
    "byCategory": [
      { "category": "Food", "total": 80, "count": 5 },
      { "category": "Transport", "total": 70.5, "count": 7 }
    ]
  }
}
```

**Errors:** 401.

---

### GET /api/v1/expenses/export

Export as CSV.

**Query params:** `format=csv` (required), `from`, `to` (optional).

**Response 200** — Body is CSV file. Header: `Content-Disposition: attachment; filename="expenses.csv"`. Columns: date, amount, category, description.

**Errors:** 400 (missing/invalid format), 401.

---

## Budgets

Base path: `/api/v1/budgets`. All require auth. Use `category: ""` or omit for “overall” budget. **month:** 0 = yearly, 1–12 = specific month.

**Budget object:** `id`, `userId`, `category?` (undefined = overall), `year`, `month?` (undefined = yearly), `limit` (number).

### GET /api/v1/budgets

List current user’s budgets.

**Response 200** — `{ "success": true, "data": [ "<budget>", ... ] }`.

**Errors:** 401.

---

### GET /api/v1/budgets/:id

Get one budget. **Params:** `id` (UUID).

**Response 200** — `{ "success": true, "data": <budget> }`.

**Errors:** 400, 401, 404.

---

### POST /api/v1/budgets

Create a budget. Duplicate (user, category, year, month) returns 400.

**Request body**

| Field    | Type   | Required | Rules                           |
| -------- | ------ | -------- | ------------------------------- |
| category | string | No       | Default `""` = overall; max 100 |
| year     | number | Yes      | 2000–2100                       |
| month    | number | No       | 0 = yearly, 1–12; default 0     |
| limit    | number | Yes      | > 0                             |

**Response 201** — `{ "success": true, "data": <budget> }`.

**Errors:** 400 (validation, duplicate period), 401.

---

### PATCH /api/v1/budgets/:id

Update a budget. **Params:** `id` (UUID). **Body:** all optional — `category`, `year`, `month`, `limit`.

**Response 200** — `{ "success": true, "data": <budget> }`.

**Errors:** 400, 401, 404.

---

### DELETE /api/v1/budgets/:id

Delete a budget. **Params:** `id` (UUID).

**Response 204** — No body.

**Errors:** 400, 401, 404.

---

### GET /api/v1/budgets/:id/compare

Spending vs limit for the budget’s period. **Params:** `id` (UUID).

**Response 200**

```json
{
  "success": true,
  "data": {
    "budget": "<budget>",
    "spending": 120.5,
    "limit": 300,
    "remaining": 179.5,
    "percentUsed": 40,
    "expenseCount": 8
  }
}
```

**Errors:** 400, 401, 404.

---

## Recurring expenses

Base path: `/api/v1/recurring`. All require auth. **frequency:** `day` \| `week` \| `month`.

**Recurring object:** `id`, `userId`, `category`, `amount` (number), `description?`, `frequency`, `startDate` (YYYY-MM-DD), `nextRunAt` (YYYY-MM-DD), `lastRunAt?` (YYYY-MM-DD).

### GET /api/v1/recurring

List current user’s recurring expenses.

**Response 200** — `{ "success": true, "data": [ "<recurring>", ... ] }`.

**Errors:** 401.

---

### GET /api/v1/recurring/:id

Get one. **Params:** `id` (UUID).

**Response 200** — `{ "success": true, "data": <recurring> }`.

**Errors:** 400, 401, 404.

---

### POST /api/v1/recurring

Create a recurring expense. Category must exist.

**Request body**

| Field       | Type   | Required | Rules                      |
| ----------- | ------ | -------- | -------------------------- |
| category    | string | Yes      | 1–100 chars; must exist    |
| amount      | number | Yes      | > 0                        |
| description | string | No       | Max 5000                   |
| frequency   | string | Yes      | `day` \| `week` \| `month` |
| startDate   | string | Yes      | YYYY-MM-DD                 |

**Response 201** — `{ "success": true, "data": <recurring> }`.

**Errors:** 400 (validation, category not found), 401.

---

### PATCH /api/v1/recurring/:id

Update. **Params:** `id` (UUID). **Body:** all optional — `category`, `amount`, `description`, `frequency`, `startDate`. If `startDate` is updated, `nextRunAt` is set to the new start date.

**Response 200** — `{ "success": true, "data": <recurring> }`.

**Errors:** 400, 401, 404.

---

### DELETE /api/v1/recurring/:id

Delete. **Params:** `id` (UUID).

**Response 204** — No body.

**Errors:** 400, 401, 404.

---

### POST /api/v1/recurring/run

Create expense entries for all recurring items whose `nextRunAt` ≤ today; then advance `nextRunAt` and set `lastRunAt`. Call from cron (e.g. daily) or manually.

**Response 200**

```json
{
  "success": true,
  "data": {
    "processed": 2,
    "created": [
      {
        "id": "recurring-uuid",
        "date": "2025-02-24",
        "amount": 15,
        "category": "Food"
      }
    ]
  }
}
```

**Errors:** 401.

---

## Error handling (frontend)

- **4xx/5xx** — Response body is `{ "success": false, "error": "<message>" }`. Use `error` for toast/alert; use status for logic (e.g. 401 → redirect to login).
- **401** — Missing or invalid token; clear stored token and redirect to login.
- **404** — Not found; show “Not found” or redirect.
- **429** — Rate limit; show “Too many requests” and optionally retry after delay (check `Retry-After` header if present).
- **Network errors** — Handle timeout and offline; show a generic “Network error” message.

---

## Quick reference table

| Method | Path                                 | Auth | Description                        |
| ------ | ------------------------------------ | ---- | ---------------------------------- |
| GET    | /health                              | No   | Health check                       |
| POST   | /api/v1/auth/signup                  | No   | Register                           |
| POST   | /api/v1/auth/signin                  | No   | Sign in                            |
| GET    | /api/v1/auth/me                      | Yes  | Current user                       |
| GET    | /api/v1/categories                   | Yes  | List categories                    |
| GET    | /api/v1/categories/:id               | Yes  | Get category                       |
| POST   | /api/v1/categories                   | Yes  | Create category                    |
| PATCH  | /api/v1/categories/:id               | Yes  | Update category                    |
| DELETE | /api/v1/categories/:id               | Yes  | Delete category                    |
| GET    | /api/v1/expenses                     | Yes  | List expenses (paginated, filters) |
| GET    | /api/v1/expenses/:id                 | Yes  | Get expense                        |
| POST   | /api/v1/expenses                     | Yes  | Create expense                     |
| PATCH  | /api/v1/expenses/:id                 | Yes  | Update expense                     |
| DELETE | /api/v1/expenses/:id                 | Yes  | Soft delete expense                |
| POST   | /api/v1/expenses/:id/restore         | Yes  | Restore expense                    |
| POST   | /api/v1/expenses/bulk                | Yes  | Bulk create expenses               |
| GET    | /api/v1/expenses/summary             | Yes  | Summary (optional groupBy)         |
| GET    | /api/v1/expenses/summary/by-category | Yes  | Summary by category                |
| GET    | /api/v1/expenses/export              | Yes  | Export CSV                         |
| GET    | /api/v1/budgets                      | Yes  | List budgets                       |
| GET    | /api/v1/budgets/:id                  | Yes  | Get budget                         |
| POST   | /api/v1/budgets                      | Yes  | Create budget                      |
| PATCH  | /api/v1/budgets/:id                  | Yes  | Update budget                      |
| DELETE | /api/v1/budgets/:id                  | Yes  | Delete budget                      |
| GET    | /api/v1/budgets/:id/compare          | Yes  | Budget vs spending                 |
| GET    | /api/v1/recurring                    | Yes  | List recurring                     |
| GET    | /api/v1/recurring/:id                | Yes  | Get recurring                      |
| POST   | /api/v1/recurring                    | Yes  | Create recurring                   |
| PATCH  | /api/v1/recurring/:id                | Yes  | Update recurring                   |
| DELETE | /api/v1/recurring/:id                | Yes  | Delete recurring                   |
| POST   | /api/v1/recurring/run                | Yes  | Create expenses from due recurring |
