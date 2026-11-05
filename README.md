# Family Finance Management

Assignment submission for a family budgeting application. A household plans one month of income across seven fixed jars, records spending against a jar, and reviews how the month is going. Amounts are whole Vietnamese dong (VND). The API calculates jar budgets, spent totals, and remaining balances. The Angular app displays those values and does not recalculate them.

## What is included

| ID | Feature | What the user can do |
| --- | --- | --- |
| F1 | Monthly planning | Choose a month, enter a positive income, and create one plan. The API creates the seven default jars. |
| F2 | Income allocation | Open that plan and see each jar's name, rate, and budget in VND. |
| F3 | Add an expense | Record one expense against a jar in that month: date, jar, amount, and description. |
| F5 | Dashboard | Review income, total spent, remaining balance, overall progress, and each jar's budget, spent amount, remaining amount, and progress. |

Spending by jar (`/monthly-plans/:year/:month/spending`) is the detail view of the same jar totals used by the dashboard.

Editing or deleting an expense (F4) is not part of this submission. Jar names and allocation rates are fixed. There is no sign-in and no support for other currencies.

Default allocation, totaling 100%:

| Jar | Rate |
| --- | ---: |
| Living Expenses | 35% |
| Food | 20% |
| Children | 10% |
| Emergency Fund | 10% |
| Savings | 10% |
| Investment | 10% |
| Entertainment & Travel | 5% |

## Tech stack

- Frontend: Angular 21, standalone components, TypeScript 5.9, Vitest
- Backend: ASP.NET Core 8, Entity Framework Core, SQLite
- API docs: Swagger, opened by `dotnet run`

## Prerequisites

- Node.js 22.12 or newer, and npm 10 or newer. Angular 21 does not run on earlier Node.js 22 releases.
- .NET 8 SDK

## Run the application

Start the API first, then the frontend. Use two terminals.

### 1. API

```bash
cd backend/FamilyFinance.Api
dotnet run
```

The API listens on `https://localhost:54535` and `http://localhost:54536`. Swagger is printed in the terminal, normally `/swagger`.

If the browser blocks the local HTTPS certificate, trust it once:

```bash
dotnet dev-certs https --trust
```

### 2. Frontend

```bash
cd frontend
npm ci
npm start
```

Open [http://localhost:4400/](http://localhost:4400/).

During `ng serve`, the app calls `/api` on that same origin. `frontend/proxy.conf.json` forwards those calls to `https://localhost:54535`, so the browser does not need a trusted development certificate for normal use. The API also allows direct calls from `http://localhost:4400`.

## Suggested walkthrough

1. Open **Planning**, choose a month that does not already have a plan, enter a positive whole-VND income, and create the plan.
2. On the allocation page, confirm the seven jar budgets. Those amounts come from the API.
3. Open **Add Expense**, pick a date inside that month, choose a jar, and save a positive amount with a description.
4. Open the dashboard or **Spending by jar** for that month and confirm the jar's spent amount and progress changed.

Creating a second plan for the same month is rejected. An expense dated outside the selected month is rejected. A month with no plan cannot accept an expense.

## Test and build

Frontend unit tests, with coverage:

```bash
cd frontend
npm test
```

Production build:

```bash
cd frontend
npm run build
```

Build output is written to `frontend/dist/family-finance/`.

## Project layout

- `frontend/` — Angular application
- `backend/FamilyFinance.Api/` — ASP.NET Core API and SQLite database
- `docs/` — product brief, requirements, design specs, and test cases

Main screens:

| Route | Screen |
| --- | --- |
| `/dashboard` | Monthly dashboard |
| `/monthly-planning` | Create a monthly plan |
| `/monthly-plans/:year/:month` | Jar allocation for that month |
| `/monthly-plans/:year/:month/spending` | Spending by jar |
| `/expenses/new` | Add an expense |

## Notes for review

- Only one plan exists for a given year and month.
- Income and expense amounts must be positive whole VND.
- Each new plan contains exactly seven jars, and their rates total 100%.
- Spent and remaining amounts are returned by the API. The UI formats them for display.
- Requirements, design notes, and manual test cases are under `docs/`.
