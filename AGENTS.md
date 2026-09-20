# ClientConnect Agent Guide

## Product direction

ClientConnect is a provider marketplace and workflow platform for individual
Clients seeking financial services. It connects Clients with Financial
Advisers, Financial Institutions, Assessors, and Repairers.

Royal Square Financial is the seeded brokerage and Adviser example used in the
hackathon demo. It is not the name or boundary of the software product.

The relationship is:

`ClientConnect -> Clients -> matched service providers`

The current PoC already includes a Client page, an Adviser dashboard, products,
chat, notifications, claims, reminders, service requests, and deterministic
provider matching. Preserve the backend capabilities while keeping the primary
Client experience intentionally small.

## Hackathon priority

The must-win demo is one shared product workflow used by the Client and Adviser:

1. The Client creates an Investment Goal and sees its progress.
2. The Client opens owned Insurance and submits a claim form.
3. Every message, status change, appointment, document, provider request, and
   decision appears in the chat/activity timeline for that Product.
4. The Adviser reviews the claim and selects one of three seeded Assessors.
5. The Client chooses an assessment date and time. Do not add real scheduling
   or artificial waiting; a simple state transition is enough for the demo.
6. The Adviser uploads the mock Assessor report on the same Product view.
7. The system emails claim and assessment information to three matched seeded
   service providers through MailHog, then exposes mock quotes to the Adviser.
8. The Adviser selects a quote and records the excess, approved amount, and
   final claim balance.
9. The Adviser generates one claim-summary PDF and manually emails it to the
   seeded Financial Institution through MailHog.

`Admin` in demo language means the authenticated `Adviser`; do not add another
role. Assessors, repairers, and Financial Institutions remain seeded external
records without logins or dashboards. Reuse one Product-by-ID interface with
role-specific actions instead of separate Client and Adviser workflow pages.

## Roles and provider records

Only `Client` and `Adviser` are authenticated application roles for the PoC.
Do not create authentication, registration, or dashboards for other providers.

Seed provider records for:

- Financial Adviser
- Financial Institution
- Assessor
- Repairer

Each provider has a name, provider type, services, rating, location, and
availability. Financial Institutions also have seeded products such as
Insurance, Investment, and Savings products.

## Matching contract

Build one reusable deterministic matching service. Its input is a required
service plus relevant Client or request information.

Eligibility filters:

- provider type matches the workflow;
- required service is offered;
- provider is available;
- location matches when the workflow is location-sensitive.

Ranking order:

1. rating, highest first;
2. distance, nearest first when relevant;
3. provider name or ID as a stable tie-breaker.

Return at most two recommendations. Do not add AI, embeddings, RAG, or complex
recommendation algorithms for this hackathon.

## Implementation boundaries

- Keep React, TypeScript, Material UI, FastAPI, PostgreSQL, Keycloak, and Docker
  Compose.
- Reuse the existing chat and shared Client components.
- Keep the Client interface simple, white, and blue.
- Present Investment Goal and Insurance as the two Client product-creation
  choices. Keep current database identifiers stable until the JSON-driven
  product-model migration ticket is implemented.
- Use additive SQL migrations and deterministic seed data.
- Keep Keycloak as the source of truth for roles.
- Enforce Client ownership and Adviser assignment in backend queries.
- Add type hints, concise docstrings, explicit names, and junior-friendly code.
- Run the frontend build, backend checks, and focused role-boundary tests before
  completing a ticket.
- Use `client-connect` naming for Docker, Keycloak, database, and application
  identifiers as well as user-facing branding.

## Deferred work

Do not implement provider self-registration, provider dashboards, Financial
Institution product management, real provider APIs, payments, transaction-fee
collection, AI matching, advanced recommendation logic, multiple tenancy, real
scheduling, or production claim integrations during the hackathon.

## Source of truth

Use `TASKS.md` as the ordered implementation backlog. Work from the first
unchecked ticket unless the user explicitly changes the priority.

Use `dev.docker-compose.yaml` for local development and verification.
