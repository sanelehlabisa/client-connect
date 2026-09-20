# ClientConnect

ClientConnect is a hackathon proof of concept that connects individual Clients
with financial-service providers and keeps the resulting work in one shared
workflow.

The priority demo lets a Client create an Investment Goal and submit a claim
against owned Insurance with preferred assessment and repair times. From the
same Product view, the Adviser reviews the claim and selects from three mock
Assessors followed by three mock Repairers. Each selection is accepted
immediately and is visible to both roles in one traceable workflow.

See [AGENTS.md](AGENTS.md) for the product and engineering guardrails and
[TASKS.md](TASKS.md) for the prioritized backlog.

## Technology

- React, TypeScript, Vite, and Material UI
- Python, FastAPI, SQLAlchemy, and Psycopg
- PostgreSQL
- JSON-backed demo users with backend-signed development tokens
- MailHog development email
- Docker Compose local runtime

The interface uses a simple white-and-blue theme. Backend functions use type
hints and docstrings, and the code favors explicit, junior-friendly modules.

## Project structure

~~~text
backend/                     FastAPI application and demo authentication
database/init/               PostgreSQL schema, migrations, and demo seed
frontend/src/                React application
AGENTS.md                    Product and implementation guardrails
TASKS.md                     Ordered hackathon backlog
dev.docker-compose.yaml      Local development environment
~~~

## Start development

1. Copy the example environment file, then set `APP_HOST` in `.env` to this
   computer's Wi-Fi or Ethernet IPv4 address (for example, `192.168.1.100`):

   ~~~powershell
   Copy-Item .env.example .env
   ~~~

2. Replace `DEMO_AUTH_SECRET` with a long random value. This secret signs local
   demo tokens and must not be used for a production deployment.

3. Build and start the services:

   ~~~powershell
   docker compose -f dev.docker-compose.yaml up --build
   ~~~

4. Open these URLs, replacing `<APP_HOST>` with the value from `.env`:

   - Frontend: `http://<APP_HOST>:5173`
   - Backend health: `http://<APP_HOST>:8000/health`
   - FastAPI docs: `http://<APP_HOST>:8000/docs`
   - MailHog: `http://<APP_HOST>:8025`

The frontend and API are available to devices on the same network. If another
device cannot connect, allow ports `5173` and `8000` on the host's private-network
firewall. Allow `8025` as well only when another device must view MailHog.
PostgreSQL remains bound to the host loopback interface and private Docker
network.

Source directories are mounted into the containers, so Vite and Uvicorn reload
application changes automatically.

## Development login

| Account | Email | Password | Access |
| --- | --- | --- | --- |
| Client | `hlabisasanele730@gmail.com` | `Password123!` | Own Client data |
| Adviser | `lozaicmasuku@gmail.com` | `Password123!` | Assigned Clients |

The login form sends the email and password to the API. The API validates the
seeded JSON user and returns a signed, short-lived development bearer token that
contains the user's identity and `client` or `adviser` role. There is no
self-registration in the hackathon demo.

This authentication is deliberately limited to the PoC. The seeded passwords,
JSON user store, HTTP transport, and token secret are not production security.

## Naming

Docker, PostgreSQL, and application identifiers use the `client-connect` name
consistently.

## Common commands

~~~powershell
docker compose -f dev.docker-compose.yaml up --build
docker compose -f dev.docker-compose.yaml logs --follow frontend backend
docker compose -f dev.docker-compose.yaml down
~~~
