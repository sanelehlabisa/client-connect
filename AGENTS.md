# ClientConnect Agent Guide

## Product direction

ClientConnect is a provider marketplace and workflow platform for individual
Clients seeking financial services. It connects Clients with Financial
Advisers, Financial Institutions, Assessors, and Repairers.

Royal Square Financial is the seeded brokerage and Adviser example used in the
hackathon demo. It is not the name or boundary of the software product.

The relationship is:

`ClientConnect -> Clients -> matched service providers`

The current PoC already includes a Client financial dashboard, an Adviser
dashboard, products, chat, notifications, claims, reminders, and service
requests. Preserve these working features while refocusing the demo.

## Hackathon priority

The must-win demo is Adviser discovery and communication:

1. A Client logs in and selects **Get Financial Advice**.
2. ClientConnect returns the best two matching seeded Advisers.
3. The results include the seeded Royal Square Adviser.
4. The Client selects an Adviser.
5. The existing conversation opens and the Client sends a message.
6. The Adviser logs in, sees the Client and message, and replies.
7. The Client receives a notification and sees the reply.

Finish and polish this flow before optional provider matching in claims.

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
- Use additive SQL migrations and deterministic seed data.
- Keep Keycloak as the source of truth for roles.
- Enforce Client ownership and Adviser assignment in backend queries.
- Add type hints, concise docstrings, explicit names, and junior-friendly code.
- Run the frontend build, backend checks, and focused role-boundary tests before
  completing a ticket.
- Internal `rsf-*` database and Keycloak identifiers may remain temporarily to
  avoid breaking the working development environment. User-facing branding is
  `ClientConnect`.

## Deferred work

Do not implement provider self-registration, provider dashboards, Financial
Institution product management, real provider APIs, payments, transaction-fee
collection, AI matching, advanced recommendation logic, multiple tenancy, or
production claim integrations during the hackathon.

## Source of truth

Use `TASKS.md` as the ordered implementation backlog. Work from the first
unchecked ticket unless the user explicitly changes the priority.

Use `dev.docker-compose.yaml` for local development and verification.
