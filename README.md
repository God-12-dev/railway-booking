# RailConnect

RailConnect is an academic railway reservation demonstration. Sample schedules, availability, bookings, payments, PNRs, refunds, tracking, and food orders are simulated. It is not connected to IRCTC and does not create valid railway reservations.

## Requirements

- Node.js 24 or newer
- PostgreSQL 15 or newer
- npm

## Local setup

1. Copy `.env.example` to `.env` and set `DATABASE_URL` to a PostgreSQL database you control.
2. Install packages: `npm install`.
3. Generate the Prisma client: `npm run db:generate`.
4. Apply local migrations: `npm run db:migrate`.
5. Optionally set both `RAILCONNECT_ADMIN_EMAIL` and `RAILCONNECT_ADMIN_PASSWORD` to create/update an administrator, then load the sample catalog: `npm run db:seed`.
6. Start the development server: `npm run dev` and open `http://localhost:3000`.

The seed is repeatable and upserts sample stations, routes, timetables, coaches, seats, and food items; it does not reset the database. Create an administrator password with at least 12 characters and keep `.env` out of source control.

## Available commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local development server |
| `npm run build` | Create the production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Check TypeScript types |
| `npm test` | Run unit tests |
| `npm run test:e2e` | Run browser tests (requires Playwright Chromium) |
| `npm run db:generate` | Generate Prisma Client |
| `npm run db:migrate` | Create/apply a development migration |
| `npm run db:deploy` | Apply committed migrations in a deployment |
| `npm run db:seed` | Upsert sample content and optional admin |
| `npm run db:studio` | Open Prisma Studio |

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL URL used by Prisma's `pg` adapter. |
| `RAILCONNECT_ADMIN_EMAIL` | No | Email for the optional administrator seeded by the script. |
| `RAILCONNECT_ADMIN_PASSWORD` | No | Password for that account; stored as an Argon2id hash. |

## Implemented areas

- Responsive landing page, English/Hindi/Kannada language selection, persisted theme, registration, login, logout, and protected user sessions.
- Admin catalog, schedule, coach/seat, user, booking, food, analytics, and audit-log tools with role checks and soft archival.
- Route/date/class search, schedule details, seat holds, passenger entry, server-priced draft bookings, simulated payment success/failure, PNR, and confirmation.
- Booking history and cancellation/refund simulation, downloadable demo ticket PDF, PNR lookup, seeded route tracking, and sample food orders.
- Unit tests and browser tests for public landing-page interactions.

## Deployment

Provision PostgreSQL and a Node.js 24 runtime. Configure `DATABASE_URL` and a strong administrator credential through the hosting provider's secret store. Install dependencies, run `npm run db:generate`, then `npm run db:deploy`; run `npm run db:seed` only if the deployment needs the demonstration catalog. Build with `npm run build` and launch with `npm run start`. Put the app behind HTTPS and configure backups and monitoring for PostgreSQL. Never expose admin credentials in client variables.

## Demonstration limits

No live railway schedule, reservation provider, GPS feed, or payment gateway is connected. Payment outcomes, refunds, tickets, route positions, and PNR records are simulations. The generated PDF and PNR page explicitly state that they are not railway travel documents. Database-backed flows need a reachable PostgreSQL service and a migrated/seeded database before runtime verification.
