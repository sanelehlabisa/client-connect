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

The must-win demo is the Client-by-ID page and Adviser communication:

1. A Client logs in and sees one compact financial-position card.
2. The Client sees an active-products table and can open a Product-by-ID URL.
3. **Get Financial Advice** scrolls directly to the assigned-Adviser chat.
4. Automatic reminders appear as system items inside that conversation.
5. The Client sends a message.
6. The Adviser opens the Client-by-ID page, sees the message, and replies.
7. The Client receives a notification and sees the reply.

The two-result provider-matching API and seed data remain available, but the
primary Client page does not need an Adviser-selection modal. Finish and polish
the direct communication flow before optional provider matching in claims.

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
- Keep Client product-creation actions limited to Goals and Investments;
  existing Insurance records and their history remain readable.
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
