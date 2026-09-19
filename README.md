# RSF ClientConnect

A small one-day proof of concept for a Client and Adviser financial-product workflow.

## Technology

- frontend/: React, TypeScript, Vite, and Material UI
- backend/: Python, FastAPI, SQLAlchemy, and Psycopg
- database/: PostgreSQL with a simple development schema and seed
- keycloak/: Realm, clients, roles, group, and development users
- Authentication: Keycloak with OpenID Connect and PKCE
- Email: MailHog
- Local runtime: Docker Compose

The interface uses a simple white-and-blue Material UI theme. Backend functions use type hints and docstrings, and the code favors explicit names and small modules so it remains junior-friendly.

## Structure

~~~text
backend/
  app/          FastAPI application code
database/
  init/         PostgreSQL schema and deterministic demo seed
frontend/
  src/          React application and Material UI theme
keycloak/
  realm/        Importable development realm JSON
dev.docker-compose.yaml    Local development environment
~~~

## Start development

1. Copy the example environment file:

   ~~~powershell
   Copy-Item .env.example .env
   ~~~

2. Build and start all services:

   ~~~powershell
   docker compose -f dev.docker-compose.yaml up --build
   ~~~

3. Open:

   - Frontend: http://localhost:5173
   - Backend health: http://localhost:8000/health
   - FastAPI docs: http://localhost:8000/docs
   - Keycloak: http://localhost:8080
   - Keycloak administration: http://localhost:8080/admin
   - MailHog: http://localhost:8025

Source directories are mounted into the containers. Vite refreshes React changes, and Uvicorn reloads FastAPI changes automatically.

## Development authentication

Keycloak imports `keycloak/realm/rsf-clientconnect-realm.json` the first time its development database starts.

| Account | Username | Password | Access |
| --- | --- | --- | --- |
| Client | `thabo.mokoena` | `Client123!` | `client` role |
| Adviser | `amina.daniels` | `Adviser123!` | Member of `advisers`; receives `adviser` role |
| Keycloak administrator | `admin` | `admin` | Development administration only |

Self-registration is enabled. Every new account receives the `client` realm role. Adviser access cannot be selected during registration; a Keycloak administrator must add the user to the `advisers` group.

The React app uses the public `rsf-frontend` client with Authorization Code flow and PKCE. FastAPI validates the token issuer, signature, expiry, and `rsf-api` audience before trusting its realm roles.

The imported users and passwords are development data only. Do not use this realm file or these credentials in production. Keycloak skips startup import when the realm already exists, so realm JSON changes require a fresh Keycloak development database or a manual administration change.

## Common commands

~~~powershell
# Stop the environment
docker compose -f dev.docker-compose.yaml down

# Rebuild after dependency changes
docker compose -f dev.docker-compose.yaml up --build

# Follow application logs
docker compose -f dev.docker-compose.yaml logs --follow frontend backend keycloak
~~~

## Scope

See [TASKS.md](TASKS.md). Complete the Insurance submission and approval demo before adding deferred features.
