# Deployment Guide

This document covers production deployment for both the Django backend and
the React frontend.

## Architecture

```
[Browser]
   │
   │ HTTPS
   ▼
[Frontend (Netlify / Nginx)]   →   /api/*   →   [Backend (Django + Gunicorn)]
                                                       │
                                                       ▼
                                                 [PostgreSQL]
```

- The browser only ever talks to one origin: the frontend.
- The frontend proxies `/api/*` to the backend; this avoids CORS in production.
- The backend is stateless; horizontal scale by adding gunicorn replicas.
- PostgreSQL is the system of record. UsageRecord is append-only and
  indexed for analytic queries.

## Pre-deploy checklist

- [ ] Generate a strong `SECRET_KEY` (e.g. `python -c "import secrets; print(secrets.token_urlsafe(64))"`).
- [ ] Generate a strong `JWT_SIGNING_KEY` (same approach).
- [ ] Generate a `FERNET_KEY`:
      `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`.
- [ ] Set `DEBUG=False` and a tight `ALLOWED_HOSTS` allowlist.
- [ ] Set `CORS_ALLOWED_ORIGINS` to the exact frontend origin(s).
- [ ] Provision PostgreSQL 15+ and set `DATABASE_URL`.
- [ ] Configure SMTP (`EMAIL_HOST`, `EMAIL_PORT`, etc.) so budget alerts can email.
- [ ] Run `python manage.py migrate` against the production database.
- [ ] Run `python manage.py createsuperuser` to bootstrap an admin.
- [ ] Apply schema-and-seed migrations: `0002_seed_default_plans` ships the
      FREE/PRO/TEAM/ENTERPRISE plan rows.

## Backend (Docker)

The bundled Dockerfile produces a Python 3.12-slim image that runs Gunicorn
with three workers as a non-root user.

```bash
docker build -t aitc-backend ./backend
docker run --rm -p 8000:8000 \
  -e SECRET_KEY=... \
  -e JWT_SIGNING_KEY=... \
  -e FERNET_KEY=... \
  -e DATABASE_URL=postgres://user:pass@host:5432/db \
  -e ALLOWED_HOSTS=api.example.com \
  -e CORS_ALLOWED_ORIGINS=https://app.example.com \
  aitc-backend
```

Run migrations on first boot (one-shot job):

```bash
docker run --rm aitc-backend python manage.py migrate --noinput
```

## Backend (managed platforms)

- **Render / Railway / Fly.io**: point at `backend/` as the build context.
  Set the same env vars as above. The Dockerfile is the build target.
- **Heroku**: add `heroku/python` buildpack. The release phase should
  run `python manage.py migrate`.
- **AWS ECS / Cloud Run**: use the bundled Dockerfile; mount secrets via
  the platform's secret manager. Requests go through the platform's load
  balancer, which terminates TLS and sets `X-Forwarded-Proto: https` —
  the bundled `core/settings.py` honours this header in production.

## Frontend (Netlify)

- A `frontend/netlify.toml` is bundled. Edit the `BACKEND_URL` redirect
  to point at your deployed API origin.
- Set `VITE_API_BASE_URL=/api/v1` in the Netlify site environment.
- Connect the repo and Netlify will run `npm ci && npm run build` and
  serve `dist/` automatically.

## Frontend (Docker / nginx)

The bundled `frontend/Dockerfile` builds a static SPA and serves it with
nginx, with `/api/` reverse-proxied to a service named `backend`. This
matches `docker-compose.yml`. For other hosting, override
`frontend/nginx.conf` with your backend URL.

## docker-compose (single host)

```bash
cp backend/.env.example backend/.env       # then edit secrets
cp frontend/.env.example frontend/.env
docker compose up --build -d
```

Services:

| Service  | Port (host) | Notes                                  |
|----------|-------------|----------------------------------------|
| db       | 5432        | postgres:16-alpine, named volume       |
| backend  | 8000        | gunicorn, runs `migrate` on startup    |
| frontend | 8080        | nginx, proxies `/api/` → backend:8000  |

## Observability

- All Gunicorn access/error logs go to stdout (collected by the platform).
- Django log level is controlled by `LOG_LEVEL` (default INFO).
- Health probe: `GET /api/v1/health/` (200 OK, `{"status":"ok"}`).

## Backups

- Postgres: take regular logical (`pg_dump`) and physical backups.
- Test restore at least quarterly.
- Treat `FERNET_KEY` rotation as a privileged data-migration: re-encrypt
  every `ProviderCredential.encrypted_key` row before retiring the old key.

## Security notes

- `FERNET_KEY` *must* be set in production. `apps.proxy.encryption` raises
  `ImproperlyConfigured` if it is missing — by design.
- Vendor API keys are returned to the client only as `last4`. Decryption is
  server-internal; the admin UI surfaces only the last four characters.
- JWT access tokens live 15 minutes; refresh rotates and blacklists on use.
- Rate limits are configured in `REST_FRAMEWORK.DEFAULT_THROTTLE_RATES`:
  `auth_login` 10/min, `auth_register` 5/min, `tokenizer_estimate` 60/min,
  `proxy_chat` 30/min — tune to taste.
- Production sets `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`,
  HSTS (1 year), `X-Frame-Options: DENY`, `Referrer-Policy: same-origin`.
- Trust the proxy's `X-Forwarded-Proto: https` header (set in
  `core/settings.py`). Make sure your edge sets it.
