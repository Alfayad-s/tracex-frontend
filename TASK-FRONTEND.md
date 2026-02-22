# TraceX Frontend — Task List (Next.js)

Professional expense tracking web app. Use **Next.js** (App Router), **TypeScript**, and the packages below. API contract: **[API-FRONTEND.md](./API-FRONTEND.md)**.

---

## Recommended packages & libraries

### Core & tooling

| Package                                        | Purpose                                                |
| ---------------------------------------------- | ------------------------------------------------------ |
| **next** (14+)                                 | React framework, App Router, RSC, API routes if needed |
| **react** / **react-dom**                      | UI                                                     |
| **typescript**                                 | Type safety                                            |
| **tailwindcss**                                | Utility-first CSS                                      |
| **@tailwindcss/forms**                         | Form styling helpers                                   |
| **postcss** / **autoprefixer**                 | Tailwind pipeline                                      |
| **eslint** / **eslint-config-next**            | Linting                                                |
| **prettier** / **prettier-plugin-tailwindcss** | Formatting                                             |
| **env-cmd** or **dotenv**                      | Env per environment (e.g. `NEXT_PUBLIC_API_URL`)       |

### UI components & design

| Package                                                                  | Purpose                                                 |
| ------------------------------------------------------------------------ | ------------------------------------------------------- |
| **@radix-ui/react-\*** (Dialog, DropdownMenu, Select, Tabs, Toast, etc.) | Accessible primitives                                   |
| **class-variance-authority** (cva)                                       | Component variants                                      |
| **clsx** / **tailwind-merge**                                            | Class merging (e.g. `cn()`)                             |
| **lucide-react**                                                         | Icons (expense, category, chart, settings)              |
| **recharts** or **@tremor/react**                                        | Charts (spending trends, budget vs actual, by category) |
| **react-day-picker** + **date-fns**                                      | Date inputs (expense date, filters)                     |
| **@radix-ui/react-popover**                                              | Popover for date picker                                 |

_Optional: use **shadcn/ui** (copy-paste components built on Radix + Tailwind) for Dialog, Button, Input, Select, Table, Card, Skeleton, etc._

### Forms & validation

| Package                 | Purpose                                  |
| ----------------------- | ---------------------------------------- |
| **react-hook-form**     | Form state, minimal re-renders           |
| **zod**                 | Schema validation (align with API rules) |
| **@hookform/resolvers** | Zod resolver for RHF                     |

### Data & auth

| Package                                     | Purpose                                                                 |
| ------------------------------------------- | ----------------------------------------------------------------------- |
| **@tanstack/react-query**                   | Server state, caching, mutations, pagination                            |
| **jose** or **jwt-decode** (optional)       | Decode JWT for expiry/claims in client (never verify; backend verifies) |
| **js-cookie** or **next/headers** (cookies) | Store token (httpOnly cookie preferred; or secure localStorage)         |

### Tables & lists

| Package                                | Purpose                                                          |
| -------------------------------------- | ---------------------------------------------------------------- |
| **@tanstack/react-table**              | Sortable/filterable expense table, column visibility, pagination |
| **@tanstack/react-virtual** (optional) | Virtualized list for large expense lists                         |

### UX & feedback

| Package                                           | Purpose                                          |
| ------------------------------------------------- | ------------------------------------------------ |
| **sonner** or **react-hot-toast**                 | Toasts (success, error, 401 → “Session expired”) |
| **next/navigation**                               | Redirects (401 → login, 404 handling)            |
| **react-loading-skeleton** or **shadcn Skeleton** | Loading states                                   |

### Dates & numbers

| Package                                     | Purpose                                                          |
| ------------------------------------------- | ---------------------------------------------------------------- |
| **date-fns**                                | Format (dd MMM yyyy), parse, range (from/to), startOfMonth, etc. |
| **decimal.js** or use **Intl.NumberFormat** | Consistent money display and input (avoid float issues)          |

### Testing (optional but recommended)

| Package                                                               | Purpose                                  |
| --------------------------------------------------------------------- | ---------------------------------------- |
| **jest** / **@testing-library/react** / **@testing-library/jest-dom** | Unit/component tests                     |
| **playwright** or **cypress**                                         | E2E (login, add expense, filter, export) |
| **msw**                                                               | Mock API in tests                        |

### DevEx

| Package                            | Purpose                |
| ---------------------------------- | ---------------------- |
| **@types/node** / **@types/react** | Types                  |
| **husky** + **lint-staged**        | Pre-commit lint/format |

---

## Phase 0: Project foundation

### 0.1 Next.js & repo

- [x] Create project: `npx create-next-app@latest` (TypeScript, ESLint, Tailwind, App Router, `src/`)
- [x] Add `.env.local` and `.env.example`: `NEXT_PUBLIC_API_URL=http://localhost:3000` (or backend origin)
- [x] Add to `.gitignore`: `.env*.local`, `.env`
- [x] README: how to run dev, build, and point to backend

### 0.2 Tooling & code style

- [x] Add Prettier + `prettier-plugin-tailwindcss`; scripts: `format`, `lint`, `typecheck`
- [ ] Optional: Husky + lint-staged for pre-commit

### 0.3 UI base

- [x] Install Radix primitives (or add shadcn/ui): Button, Input, Label, Card, Dialog, Select, Tabs, Toast
- [x] Add `cn()` helper (clsx + tailwind-merge); base styles (e.g. body, focus ring)
- [x] Install **lucide-react**; use icons consistently (Wallet, PieChart, Calendar, etc.)
- [x] Optional: theme (e.g. CSS variables for light/dark); ensure contrast for accessibility

### 0.4 API client & types

- [x] Create API client: base URL from `NEXT_PUBLIC_API_URL`, `Content-Type: application/json`, inject `Authorization: Bearer <token>` from auth store/cookie
- [x] Central error handling: parse `{ success: false, error }`; on 401 clear token and redirect to login; on 429 show “Too many requests”
- [x] Define TypeScript types (or generate from OpenAPI if available): `User`, `Category`, `Expense`, `Budget`, `Recurring`, pagination meta, API response wrappers
- [x] Optional: single `api.get/post/patch/delete` wrapper that returns `data` or throws with status + message

### 0.5 Data layer

- [x] Install **@tanstack/react-query**; add `QueryClientProvider` in layout
- [x] Default options: staleTime, retry, refetchOnWindowFocus (tune for your UX)
- [x] Create query hooks per resource (e.g. `useCategories`, `useExpenses`, `useBudgets`, `useRecurring`); mutation hooks (create/update/delete) with invalidateQueries

---

## Phase 1: Authentication

### 1.1 Auth state & token

- [x] Decide token storage: httpOnly cookie (backend sets via API) or localStorage; if localStorage, set in memory on load and add to API client header
- [x] Auth context or store: `user`, `token`, `setAuth(user, token)`, `logout()` (clear token + user, redirect to login)
- [x] On app load: if token exists, call `GET /api/v1/auth/me`; on 200 set user; on 401 logout

### 1.2 Sign up & sign in

- [x] Pages: `/signup`, `/signin` (or `/login`); redirect to dashboard if already logged in
- [x] Forms with **react-hook-form** + **zod**: email (email()), password (min 6); submit → `POST /api/v1/auth/signup` or `signin`
- [x] On success: save `user` + `token`; redirect to dashboard (e.g. `/dashboard` or `/expenses`)
- [x] Show API error in UI (e.g. “Email already registered”, “Invalid email or password”)
- [x] Rate limit: on 429 show “Too many attempts”; optional “Retry after” countdown

### 1.3 Protected layout

- [x] Protected layout (e.g. `/dashboard/*`): if no user, redirect to `/signin`; show nav (Expenses, Categories, Budgets, Recurring, Export, Logout)
- [x] Optional: “Me” or profile link using `GET /api/v1/auth/me` data (email, name if added later)

---

## Phase 2: Categories

### 2.1 List & display

- [x] Page: list categories (predefined + user); use `GET /api/v1/categories` (e.g. `useCategories()`)
- [x] Show name, color, icon; distinguish predefined (e.g. badge “Default”) vs user-owned; disable edit/delete for predefined
- [x] Empty state: “No custom categories yet”; CTA to create

### 2.2 Create & edit

- [x] Form: name (required), color (optional), icon (optional); validate with zod (name 1–100, etc.)
- [x] Create: `POST /api/v1/categories`; invalidate categories query; toast success
- [x] Edit (user categories only): `PATCH /api/v1/categories/:id`; same validation; handle 403/404
- [x] Delete: `DELETE /api/v1/categories/:id`; confirm dialog; handle 403 (e.g. “Cannot delete default category”)

### 2.3 Use in expenses

- [x] In expense create/edit: category **Select** or **Combobox** populated from categories list; allow only existing categories (no free text unless API supports it)

---

## Phase 3: Expenses

### 3.1 List & filters

- [x] Page: expense list with pagination; `GET /api/v1/expenses` with query params: `page`, `limit`, `from`, `to`, `category`, `minAmount`, `maxAmount`, `search`, `sort`, `order`
- [x] Use **@tanstack/react-query** for list (key includes filters + page); show `pagination.totalPages`, `hasNext`, `hasPrev`
- [x] Filter UI: date range (from/to), category select, amount min/max, search (description), sort (date/amount/category/createdAt), order (asc/desc)
- [x] Table: **@tanstack/react-table** (or simple table): date, amount, category, description; actions: Edit, Delete
- [x] Loading: skeletons or spinner; empty state: “No expenses”; optional “Add expense” / “Import” CTA

### 3.2 Create & edit

- [x] Form: date (required), amount (required, > 0), category (required, from categories), description (optional); zod schema aligned with API
- [x] Create: `POST /api/v1/expenses`; invalidate list + summary queries; toast; redirect or close modal
- [x] Edit: `PATCH /api/v1/expenses/:id`; same; handle 404
- [x] Delete: `DELETE /api/v1/expenses/:id`; confirm; invalidate list + summary; toast
- [ ] Optional: restore from trash (e.g. “Deleted” view with `POST /api/v1/expenses/:id/restore` if you expose deleted items later)

### 3.3 Bulk create

- [x] “Import” or “Bulk add”: form or CSV paste → body `{ expenses: [...] }`; `POST /api/v1/expenses/bulk` (max 100); show validation errors per row if API returns them; success: show count + invalidate list

---

## Phase 4: Summaries & charts

### 4.1 Summary API

- [x] `GET /api/v1/expenses/summary`: query params `from`, `to`, optional `groupBy` (day/week/month)
- [x] `GET /api/v1/expenses/summary/by-category`: query params `from`, `to`
- [x] Hooks: `useExpenseSummary(from, to, groupBy)`, `useExpenseSummaryByCategory(from, to)`; use in dashboard or “Reports” page

### 4.2 Dashboard / reports UI

- [x] Dashboard: total spent, count, date range selector; optional period comparison (this month vs last)
- [x] Chart: spending over time (use `byPeriod` from summary with `groupBy`); **recharts** line/bar or **Tremor** area/bar
- [x] Chart: spending by category (use `byCategory`); pie or bar; ensure labels and legend
- [x] Responsive charts; loading and empty states

---

## Phase 5: Budgets

### 5.1 List & CRUD

- [x] Page: list budgets; `GET /api/v1/budgets`; show category (or “Overall”), year, month (0 = yearly, 1–12 = month), limit
- [x] Create: form category (optional = overall), year, month (0 = yearly), limit; `POST /api/v1/budgets`; validate; handle duplicate period 400
- [x] Edit/delete: `PATCH` / `DELETE /api/v1/budgets/:id`; confirm delete

### 5.2 Compare (spending vs limit)

- [x] For each budget (or detail page): `GET /api/v1/budgets/:id/compare`; show spending, limit, remaining, percentUsed, expenseCount
- [x] UI: progress bar or gauge (e.g. percentUsed); color threshold (e.g. green &lt; 80%, red &gt; 100%)
- [ ] Optional: link to filtered expense list (same category + date range) for that budget

---

## Phase 6: Recurring expenses

### 6.1 List & CRUD

- [x] Page: list recurring; `GET /api/v1/recurring`; show category, amount, frequency, startDate, nextRunAt, lastRunAt
- [x] Create: category, amount, description (optional), frequency (day/week/month), startDate; `POST /api/v1/recurring`; category must exist
- [x] Edit: `PATCH /api/v1/recurring/:id`; note: changing startDate can reset nextRunAt
- [x] Delete: `DELETE /api/v1/recurring/:id`; confirm

### 6.2 Run (optional in UI)

- [x] Backend usually runs `POST /api/v1/recurring/run` via cron; optional “Run now” button for admin/testing that calls same endpoint; show result (processed count, created expenses) in toast or modal

---

## Phase 7: Export & polish

### 7.1 Export

- [x] “Export” action: `GET /api/v1/expenses/export?format=csv&from=...&to=...`; receive blob; trigger download (e.g. `expenses.csv`); optional date range in UI
- [x] Handle 400 (e.g. missing format) with toast

### 7.2 Error & loading UX

- [x] Global: 401 → clear token, redirect to signin, toast “Session expired”
- [x] 429 → toast “Too many requests”; optional retry-after
- [x] Network errors → toast “Something went wrong” or “Check your connection”
- [x] Form errors: show API `error` under form or in toast
- [x] Loading: skeletons on lists/tables; disabled buttons + spinner on submit
- [x] Empty states: friendly copy + primary CTA per page

### 7.3 Responsive & a11y

- [x] Layout works on mobile (stack filters, collapsible nav, touch-friendly targets)
- [x] Focus management in modals/dialogs; aria-labels where needed
- [x] Color contrast and focus rings (Tailwind `ring-2`); avoid “click here” only
- [x] Optional: skip link, landmark roles

### 7.4 Final checks

- [x] All API calls use base URL from env; token attached for protected routes
- [x] No token in client-side URLs or logs
- [x] Build: `next build`; fix any type or lint errors
- [ ] Optional: E2E (Playwright/Cypress) — signin, add expense, filter, export CSV
- [x] Document in README: env vars, how to run against local backend, main scripts

---

## Suggested tasks (beyond Phase 0–7)

### Extra features & polish

- [x] **Profile / account**: Edit name, change password (if API supports); show “Me” from `GET /auth/me`
- [x] **Expense search**: Debounced search in expense list; highlight match in description
- [x] **Category filter in export**: Optional filter by category when exporting CSV
- [x] **Date presets on expenses**: “This week”, “Last 7 days”, “This year” next to from/to
- [x] **Bulk delete expenses**: Select multiple rows; “Delete selected” with confirm
- [x] **Dark/light theme toggle**: Persist preference (e.g. localStorage) and apply class or data-theme
- [x] **Keyboard shortcuts**: e.g. `N` for new expense, `?` for shortcuts help
- [x] **PWA / offline**: Service worker, manifest; show “Offline” banner when `navigator.onLine` is false
- [x] **Retry-after for 429**: Parse `Retry-After` header and show countdown or “Retry in Xs” in toast
- [ ] **E2E tests**: Playwright or Cypress — signin, add expense, filter, export CSV (as in Phase 7 optional)

### DevEx & quality

- [x] **Husky + lint-staged**: Pre-commit run `lint` and `format` (Phase 0 optional)
- [ ] **Unit tests**: Jest + React Testing Library for critical hooks or components (e.g. auth, category select)
- [ ] **MSW**: Mock API in tests with handlers from API-FRONTEND.md
- [x] **Error boundary**: React error boundary with “Something went wrong” and reload CTA
- [ ] **Strict nulls**: Tighten `tsconfig` (e.g. `strictNullChecks`) and fix types

---

## Mobile-first design checklist

_Start from small viewport (e.g. 320px), then add `sm:`, `md:`, `lg:` for larger screens. Base styles = mobile._

### Layout & structure

- [x] **Single column on mobile**: Stack filters, cards, and tables vertically; no side-by-side on &lt; 640px
- [x] **Nav**: Hamburger or bottom nav on mobile; horizontal top nav from `sm:` or `md:` up
- [x] **Dashboard**: One card per row on mobile; 2–4 columns from `sm:` / `lg:` with grid
- [x] **Tables**: Card list or horizontal scroll on mobile; full table from `md:` up (or keep cards)
- [x] **Charts**: Full width on mobile; same or constrained max-width on desktop
- [x] **Modals/dialogs**: Full-screen or near full-screen on mobile; centered box from `sm:` up

### Touch & spacing

- [x] **Touch targets**: Buttons and links ≥ 44×44px (e.g. `min-h-[44px] min-w-[44px]` or `py-3`)
- [x] **Tap spacing**: Enough gap between links/buttons to avoid mis-taps (e.g. `gap-3`, `p-3`)
- [x] **No hover-only actions**: Important actions visible without hover (e.g. show Edit/Delete on mobile)
- [x] **Form fields**: Large enough inputs and labels; full-width on mobile

### Typography & density

- [x] **Readable base**: `text-base` (16px) minimum on mobile to reduce zoom
- [x] **Headings**: Scale up on larger screens if desired (e.g. `text-xl md:text-2xl`)
- [x] **Line length**: Constrain max-width for text blocks on desktop (e.g. `max-w-prose`)

### Performance & UX

- [x] **Reduce motion**: Respect `prefers-reduced-motion` for animations (e.g. `@media (prefers-reduced-motion: reduce)`)
- [x] **Loading**: Skeleton or spinner on slow lists; avoid layout shift (reserve min-height where possible)

---

## Desktop-first design checklist

_Start from large viewport (e.g. 1280px), then use `max-sm:`, `md:`, `lg:` (or Tailwind’s approach: base = desktop, then override with `max-md:` etc. for smaller)._

### Layout & structure

- [x] **Multi-column by default**: Dashboard grid, side nav, table with many columns as default
- [x] **Break down for small**: Use `max-md:flex-col`, `max-sm:block` so layout stacks below a breakpoint
- [x] **Nav**: Full horizontal nav by default; collapse to drawer or bottom nav with `max-md:` / `max-sm:`
- [x] **Tables**: Full table by default; below `md:` switch to card list or horizontal scroll
- [x] **Filters**: Inline or sidebar on desktop; collapsible “Filters” panel or sheet on mobile (`max-md:`)

### Density & space

- [x] **Compact tables**: Dense rows and multiple columns on large screens
- [x] **Sidebar**: Optional persistent sidebar for nav or filters; hide or overlay with `max-lg:`
- [x] **Wider content**: `max-w-7xl` or similar for main content on desktop; full width on small

### Interaction

- [x] **Hover states**: Tooltips, row hover, dropdowns on hover where appropriate; ensure keyboard + touch fallbacks
- [x] **Keyboard**: Tab order and focus styles tuned for desktop (same as mobile-first, but tested on big viewport first)

### Choosing an approach

- **Mobile-first** is recommended for TraceX if most users might use phones; ensures core flows work on small screens first.
- **Desktop-first** can be used if the app is mainly for desktop; then add `max-*` overrides so mobile still works.
- **Hybrid**: Design key flows (e.g. add expense, view list) mobile-first; dashboards and reports can be desktop-first, then made responsive with the checklists above.

---

## Quick reference

| Phase | Focus                                                              |
| ----- | ------------------------------------------------------------------ |
| 0     | Next.js, Tailwind, API client, React Query, UI primitives, types   |
| 1     | Auth (signup, signin, me, token, protected layout)                 |
| 2     | Categories (list, create, edit, delete; use in expenses)           |
| 3     | Expenses (list + filters + pagination, create, edit, delete, bulk) |
| 4     | Summaries + charts (dashboard, by period, by category)             |
| 5     | Budgets (list, create, edit, delete, compare)                      |
| 6     | Recurring (list, create, edit, delete; optional run)               |
| 7     | Export CSV, error/loading UX, responsive, a11y, build & E2E        |

Use **[API-FRONTEND.md](./API-FRONTEND.md)** for exact endpoints, request/response shapes, and error handling.
