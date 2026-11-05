# Family Finance Management

Family Finance Management is a small internal family finance application.

## Project Structure

- `frontend/` - Angular 21 standalone frontend
- `backend/` - ASP.NET Core API for plans, expenses, and spending by jar
- `docs/` - Product requirements, design, development specifications, and test artifacts

## Frontend

The frontend uses Angular `21.2.24`, TypeScript `5.9`, and npm. It is configured with
standalone components, strict TypeScript settings, CSS, and Angular routing.

### Prerequisites

- Node.js 22.12+ (Angular 21 does not support older 22.x releases) and npm 10+
- .NET 8 SDK, for the included API

### API

The API base URL is `https://localhost:54535` (HTTP is also available at `http://localhost:54536`).
During `ng serve`, the frontend calls `/api` on `http://localhost:4400` and `proxy.conf.json`
forwards those requests to `https://localhost:54535`, so the browser does not need a trusted
development certificate. The API also allows direct browser calls from `http://localhost:4400`.

```bash
cd backend/FamilyFinance.Api
dotnet run
```

Trust the local HTTPS development certificate once if the browser blocks the API:

```bash
dotnet dev-certs https --trust
```

### Run the frontend

```bash
cd frontend
npm ci
npm start
```

Open `http://localhost:4400/` after the development server starts.

### Short demonstration

1. Open Monthly planning, choose a month, enter a positive whole-VND income, and create the plan.
2. Review the seven jar budgets on the allocation page. Amounts come from the API.
3. Add an expense for a date in that month.
4. Open Spending by jar and confirm the saved expense changed that jar's spent amount and percentage.

### Test and build

```bash
cd frontend
npm test
npm run build
```

`npm test` runs the Vitest unit suite. Coverage from the same command with `--coverage` is above 80%.

Build output is written to `frontend/dist/family-finance/`.

## Development Rules

This project follows spec-driven development. Before implementing business features,
read the relevant product brief, requirements, design, and development specification
under `docs/`. Financial calculations remain authoritative in the backend and use VND.
