# AI Token & Cost Intelligence Platform

A full-stack monorepo for token estimation, multi-provider LLM cost
calculation, an AI API proxy, subscription tracking, usage analytics,
budget alerts, and prompt cost prediction.

## Stack

- **Frontend:** React 18 (JSX) · Vite · Tailwind CSS · React Router · Axios · Recharts
- **Backend:** Django 5 · Django REST Framework · SimpleJWT · django-filter · drf-spectacular
- **Database:** PostgreSQL 16
- **Auth:** JWT (rotating refresh + blacklist)
- **Encryption:** Fernet (AES-128 + HMAC) for vendor API keys
- **Tokenization:** tiktoken (OpenAI-family) + calibrated heuristics for others
- **Deployment:** Docker + docker-compose; Netlify config for frontend

## Features

| Area | Features |
|---|---|
| Auth | Email + password, JWT login/refresh, password change, profile |
| Providers | Provider/AIModel catalog (admin write, user read), capabilities, filtering, pagination |
| Estimator | tiktoken + heuristic strategies, cost calculation, save-to-history, history list |
| Billing | Plan catalog, lazy-create FREE subscription, plan switching, cancel, invoices, quota status |
| Usage | Append-only `UsageRecord` ledger; summary, by-day, by-model, CSV export, filters |
| Budgets | Period-aware (daily / weekly / monthly), per-model scoping, 50/80/100% thresholds |
| Notifications | In-app, mark-read, mark-all-read, unread filter |
| Proxy | OpenAI / Anthropic / Gemini service classes with retry + timeout, encrypted credentials, usage logging, budget re-evaluation |
| Admin | User management, plan override, system stats, provider/model CRUD, feedback triage |
| Frontend | Dashboard (stat cards, donut, line, bar, recent activity, alerts, skeletons); Estimator (debounced live estimate, history); Subscription (plan cards, quota bars, invoices); Usage (filters, pagination, CSV); Budgets (CRUD, alerts, notifications); Credentials (encrypted at rest); Admin pages (overview, users, providers, models, feedback); monochromatic light + dark mode; mobile bottom nav; desktop sidebar |

## Repository Layout

```
.
├── backend/                        # Django + DRF service
│   ├── core/                       # settings, urls, pagination, wsgi/asgi
│   └── apps/
│       ├── accounts/               # custom User, JWT auth, profile
│       ├── providers/              # Provider, AIModel, capabilities
│       ├── tokenizer/              # estimation strategies + history
│       ├── billing/                # Plan, Subscription, Invoice, quota
│       ├── usage/                  # UsageRecord, analytics, CSV export
│       ├── budgets/                # Budget, BudgetAlert, Notification
│       ├── proxy/                  # encrypted credentials, vendor services
│       └── admin_panel/            # admin endpoints, Feedback
├── frontend/                       # React + Vite + Tailwind SPA
│   └── src/
│       ├── api/                    # axios client, endpoint modules
│       ├── context/                # Auth, Theme, Toast
│       ├── hooks/                  # useDebounce
│       ├── components/             # ui primitives + charts
│       ├── layouts/                # AppLayout (sidebar + bottom nav), AuthLayout
│       ├── pages/                  # Dashboard, Estimator, Usage, Budgets, ...
│       └── routes/                 # ProtectedRoute, AdminRoute, GuestOnly
├── docker-compose.yml              # db + backend + frontend
├── docs/DEPLOYMENT.md              # production deployment guide
└── README.md
```

## Quick start

### Docker Compose (recommended for first run)

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Generate secrets and paste them into backend/.env:
python -c "import secrets; print('SECRET_KEY=' + secrets.token_urlsafe(64))"
python -c "from cryptography.fernet import Fernet; print('FERNET_KEY=' + Fernet.generate_key().decode())"

docker compose up --build
```

| URL                              | Description                |
|----------------------------------|----------------------------|
| http://localhost:8080/           | React SPA                  |
| http://localhost:8000/api/v1/    | API root                   |
| http://localhost:8000/api/v1/docs/ | Swagger UI               |
| http://localhost:8000/admin/     | Django admin               |

Bootstrap an admin user:

```bash
docker compose exec backend python manage.py createsuperuser
```

### Native dev

```bash
# --- backend ---
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver

# --- frontend ---
cd ../frontend
npm install
cp .env.example .env
npm run dev
```

The Vite dev server proxies `/api/*` to `http://localhost:8000`.

## API surface (`/api/v1`)

```
auth/        register, login, logout, refresh, verify, me, profile, change-password
catalog/     providers/ (slug-lookup) · models/ (CRUD) · models/capabilities/
tokenizer/   estimate · history · history/{id}
billing/     plans · subscription · subscription/change · subscription/cancel · invoices · quota
usage/       records · summary · by-day · by-model · export
budgets/     budgets/ (CRUD) · budgets/{id}/alerts · notifications · notifications/{id}/read · notifications/read-all
proxy/       credentials/ (CRUD) · chat
admin-panel/ users · users/{id}/assign-plan · stats · feedback
feedback/    submit
```

Full schema available at `/api/v1/schema/` and Swagger UI at `/api/v1/docs/`.

## Key engineering choices

- **Append-only usage ledger.** `UsageRecord` is the system of record for
  billing and analytics. Every estimator call (when `save_history=true`) and
  every proxy call writes one row. Aggregations (`by-day`, `by-model`,
  `summary`) run on indexed columns.
- **Pricing snapshot in history.** `Estimate` rows store
  `input_price_at_estimate` / `output_price_at_estimate` so reported costs
  remain stable after a model's prices change.
- **Quota gating before vendor call.** The proxy refuses up front with
  `402 Payment Required` if the user's plan limits would be exceeded.
- **Budget evaluation is idempotent per period.**
  `(budget, threshold_pct, period_start)` is a unique constraint, so
  duplicate evaluations within a period don't fire duplicate alerts.
- **Vendor key encryption.** Keys are encrypted at rest with
  `cryptography.Fernet`. Only the last 4 characters are surfaced in API
  responses or admin views.
- **Portable JSON-list-element filter.** `?capability=vision` works on
  PostgreSQL and SQLite by casting the JSONField to text and matching the
  JSON-quoted value.

## Deployment

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for production deployment
across Docker, Render, Heroku, Cloud Run, and Netlify.

## License

Internal — adjust before publishing.
