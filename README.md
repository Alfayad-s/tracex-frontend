# TraceX Frontend

Professional expense tracking web app built with Next.js (App Router), TypeScript, and Tailwind CSS.

## Prerequisites

- Node.js 18+
- npm (or yarn/pnpm)

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment**

   Copy the example env file and set your backend URL:

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` and set `NEXT_PUBLIC_API_URL` to your TraceX backend origin (e.g. `http://localhost:3000` or `https://api.example.com`). Use the same origin as your backend; no trailing slash.

## Scripts

| Script              | Description                                                                                           |
| ------------------- | ----------------------------------------------------------------------------------------------------- |
| `npm run dev`       | Start development server (default: [http://localhost:3001](http://localhost:3001) if 3000 is backend) |
| `npm run build`     | Production build                                                                                      |
| `npm run start`     | Start production server                                                                               |
| `npm run lint`      | Run ESLint                                                                                            |
| `npm run format`    | Format with Prettier                                                                                  |
| `npm run typecheck` | Run TypeScript check                                                                                  |

## Pointing to the backend

- Set `NEXT_PUBLIC_API_URL` in `.env.local` to your backend base URL (e.g. `http://localhost:3000`).
- All API requests use this base URL with the `/api/v1` prefix.
- See [API-FRONTEND.md](./API-FRONTEND.md) for the full API contract.

## Build

Run `npm run build` to create a production build. Fix any type or lint errors before deploying.

## Security

- All API calls use the base URL from `NEXT_PUBLIC_API_URL`; the auth token is sent only in the `Authorization` header (never in URLs or logs).

## Project structure

- `src/app/` — App Router pages and layouts
- `src/components/` — Reusable UI components
- `src/lib/` — API client, utils, types, React Query hooks
