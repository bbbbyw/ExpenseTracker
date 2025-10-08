# Expense Tracker (Microservices)

Production-style microservices expense tracker showcasing service-per-DB, JWT auth, RabbitMQ events, Redis caching, and an NGINX API gateway. Ready to run locally with Docker Compose.

## Overview
- Auth: register/login, JWT access + refresh, profile
- Expense: CRUD, filters/pagination, stats, emits `expense.*` events
- Category: default + custom categories, budgets, spending vs budget
- Report: monthly/category/trend/export/dashboard; consumes events to invalidate caches

## Services & Ports
- API Gateway (NGINX): `http://localhost:8080`
- Auth Service: `http://localhost:3001`
- Expense Service: `http://localhost:3002`
- Category Service: `http://localhost:3003`
- Report Service: `http://localhost:3004`
- Postgres (per service): `5432`..`5435`
- Redis: `6379`
- RabbitMQ AMQP/UI: `5672` / `http://localhost:15672` (ui)

## Prerequisites
- Docker Desktop (Windows/macOS/Linux)
- Node.js 18+ (optional, for running services standalone)
- PowerShell / bash terminal

Note (Windows): If the project lives in OneDrive, Docker bind mounts can be slow or blocked. If you encounter volume/permission issues, move the project to a non-OneDrive folder or allow the folder in Docker Desktop → Resources → File sharing.

## Quick Start (Local)
```bash
# from project root
docker-compose up -d --build

# check health
curl http://localhost:8080/health
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health
curl http://localhost:3004/health

# logs (follow)
docker-compose logs -f
```
RabbitMQ UI: `http://localhost:15672` (user: `expense_user`, pass: `expense_pass`).

## First-Time Usage (through API Gateway)
1) Register
```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"YourPassw0rd!","firstName":"You","lastName":"User"}'
```
2) Login (copy accessToken)
```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"YourPassw0rd!"}'
```
3) Use token
```bash
$TOKEN="Bearer <paste_access_token_here>"

# list categories (defaults are auto-seeded)
curl -H "Authorization: $TOKEN" http://localhost:8080/api/v1/categories

# create an expense
curl -X POST http://localhost:8080/api/v1/expenses \
  -H "Authorization: $TOKEN" -H "Content-Type: application/json" \
  -d '{"categoryId":1,"amount":25.50,"description":"Lunch","expenseDate":"2025-10-08"}'

# expense stats (date range)
curl -H "Authorization: $TOKEN" \
  "http://localhost:8080/api/v1/expenses/stats?startDate=2025-10-01&endDate=2025-10-31"

# category spending for a month
curl -H "Authorization: $TOKEN" \
  "http://localhost:8080/api/v1/categories/1/spending?month=2025-10"

# reports
curl -H "Authorization: $TOKEN" \
  "http://localhost:8080/api/v1/reports/monthly?year=2025&month=10"

curl -H "Authorization: $TOKEN" \
  "http://localhost:8080/api/v1/reports/dashboard"
```

## Configuration (docker-compose)
This repo is pre-wired to run without .env files. To strengthen secrets for real use, edit `docker-compose.yml`:
- JWT: `JWT_SECRET`
- Database passwords: `POSTGRES_PASSWORD` (all four DBs)
- RabbitMQ: `RABBITMQ_DEFAULT_PASS`

Inter-service URLs used inside containers (already set):
- Auth: `http://auth-service:3000`
- Expense: `http://expense-service:3000`
- Category: `http://category-service:3000`
- Report: `http://report-service:3000`
- Redis: `redis://redis:6379`
- RabbitMQ: `amqp://expense_user:expense_pass@rabbitmq:5672`

## Run Services Standalone (optional)
If you prefer running a single service locally (not via compose), copy its `.env.example` to `.env` and set values. For example (Auth):
```
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=auth_db
DB_USER=expense_user
DB_PASSWORD=expense_pass
JWT_SECRET=change-me
JWT_EXPIRE=15m
REFRESH_TOKEN_EXPIRE=7d
REDIS_URL=redis://localhost:6379
```
Then:
```bash
cd services/auth-service
npm install
npm run dev
```
Make sure Postgres/Redis/RabbitMQ are available (from compose or your own instances).

## API Map (via API Gateway)
- Auth
  - POST `/api/v1/auth/register`
  - POST `/api/v1/auth/login`
  - POST `/api/v1/auth/refresh`
  - POST `/api/v1/auth/logout`
  - GET `/api/v1/auth/me`
- Expenses
  - POST `/api/v1/expenses`
  - GET `/api/v1/expenses` (filters + pagination)
  - GET `/api/v1/expenses/:id`
  - PUT `/api/v1/expenses/:id`
  - DELETE `/api/v1/expenses/:id`
  - GET `/api/v1/expenses/stats`
- Categories
  - GET `/api/v1/categories`
  - GET `/api/v1/categories/:id`
  - POST `/api/v1/categories`
  - PUT `/api/v1/categories/:id`
  - DELETE `/api/v1/categories/:id`
  - PUT `/api/v1/categories/:id/budget`
  - GET `/api/v1/categories/:id/spending?month=YYYY-MM`
- Reports
  - GET `/api/v1/reports/monthly?year=YYYY&month=MM`
  - GET `/api/v1/reports/category?startDate=&endDate=`
  - GET `/api/v1/reports/trend?startDate=&endDate=&interval=daily|weekly|monthly`
  - POST `/api/v1/reports/export` (body: `{ startDate, endDate, format: 'csv' }`)
  - GET `/api/v1/reports/dashboard`

## Troubleshooting
- Port conflicts: Ensure 8080, 3001–3004, 5432–5435, 6379, 5672, 15672 are free
- Slow or failing binds on Windows/OneDrive: move project to non-OneDrive path or allow in Docker settings
- Recreate from scratch (wipe volumes):
```bash
docker-compose down -v
docker-compose up -d --build
```

## Useful Commands
```bash
# view logs
docker-compose logs -f

# restart a single service
docker-compose restart expense-service

# stop all
docker-compose down

# stop and remove volumes
docker-compose down -v
```

## Next Steps (Production)
- Kubernetes manifests (EKS), Ingress + TLS, HPA, Flagger canary (see `expense_tracker_guide.md`)
- CI/CD with GitHub Actions → build & push → deploy
- Centralized logging/metrics (Prometheus + Grafana)
- Harden secrets (K8s Secrets / external secret managers)

---
If you hit any setup issue, open logs (`docker-compose logs -f`) and share the error to debug.
