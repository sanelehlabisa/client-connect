# ClientConnect

ClientConnect is a hackathon proof of concept that connects individual Clients
with financial-service providers and keeps the resulting work in one shared
workflow.

The current application includes financial dashboards, product tracking,
Client-Adviser chat, notifications, claims, reminders, and service requests.
The refocused demo adds a seeded provider marketplace whose first priority is
matching a Client with a Financial Adviser and continuing in the existing chat.

See [AGENTS.md](AGENTS.md) for the product and engineering guardrails and
[TASKS.md](TASKS.md) for the prioritized backlog.

## Technology

- React, TypeScript, Vite, and Material UI
- Python, FastAPI, SQLAlchemy, and Psycopg
- PostgreSQL
- Keycloak with OpenID Connect and PKCE
- MailHog development email
- Docker Compose local runtime

The interface uses a simple white-and-blue theme. Backend functions use type
hints and docstrings, and the code favors explicit, junior-friendly modules.

## Project structure

~~~text
backend/                     FastAPI application
database/init/               PostgreSQL schema, migrations, and demo seed
frontend/src/                React application
keycloak/realm/              Importable development realm
AGENTS.md                    Product and implementation guardrails
TASKS.md                     Ordered hackathon backlog
dev.docker-compose.yaml      Local development environment
~~~

## Start development

1. Copy the example environment file:

   ~~~powershell
   Copy-Item .env.example .env
   ~~~

2. Build and start the services:

   ~~~powershell
   docker compose -f dev.docker-compose.yaml up --build
   ~~~

3. Open:

   - Frontend: http://localhost:5173
   - Backend health: http://localhost:8000/health
   - FastAPI docs: http://localhost:8000/docs
   - Keycloak: http://localhost:8080
   - MailHog: http://localhost:8025

Source directories are mounted into the containers, so Vite and Uvicorn reload
application changes automatically.

## Development accounts

| Account | Username | Password | Access |
| --- | --- | --- | --- |
| Client | `thabo.mokoena` | `Client123!` | `client` role |
| Adviser | `amina.daniels` | `Adviser123!` | Seeded Royal Square Adviser |
| Keycloak administrator | `admin` | `admin` | Development only |

Self-registration grants the `client` role. Adviser access remains controlled
through the Keycloak `advisers` group. These credentials and the imported realm
are development data only.

## Compatibility note

Some internal database, Keycloak, and Docker identifiers still use `rsf-*` so
the existing development environment and tokens continue to work. The product
and repository name is ClientConnect; those internal identifiers can be
migrated after the hackathon demo.

## Common commands

~~~powershell
docker compose -f dev.docker-compose.yaml up --build
docker compose -f dev.docker-compose.yaml logs --follow frontend backend keycloak
docker compose -f dev.docker-compose.yaml down
~~~
