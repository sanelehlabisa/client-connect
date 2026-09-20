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
2. The Client opens owned Insurance, submits the initial claim information,
   and enters preferred assessment and repair date-times in the same form.
3. The assigned Adviser opens the same Product view and approves, requests
   changes to, or rejects the claim. Do not keep a separate Claim review page.
4. After approval, the system automatically shows three seeded Assessors. The
   Adviser selects one and the demo treats it as accepted immediately.
5. The system then automatically shows three seeded Repairers. The Adviser
   selects one and the demo treats it as accepted immediately.
6. The Client and Adviser see the same preferred times and selected providers
   in the shared Product view. Each accepted appointment is also added to the
   existing reminders for both roles.
7. Every user message, system event, decision, and provider selection is
   timestamped in one Product activity timeline.

`Admin` in demo language means the authenticated `Adviser`; do not add another
role. Assessors, repairers, and Financial Institutions remain seeded external
records without logins or dashboards. Reuse one Product-by-ID interface with
role-specific actions instead of separate Client and Adviser workflow pages.

## Roles and provider records

Only `Client` and `Adviser` are authenticated application roles for the PoC.
Do not create authentication, registration, or dashboards for other providers.

For the hackathon, authentication uses two seeded records in a backend JSON
file. The login form accepts email and password, and FastAPI issues a signed,
short-lived development bearer token containing the identity and role. Keep
self-registration disabled. Treat this as demo infrastructure only; production
identity management is deferred.

## Adviser experience

The shared header is the only place that shows the signed-in name and
`Adviser` role. The Adviser dashboard is a simple `Your clients` inbox; do not
add separate Claim review, notification, or reminder sections.

Sort assigned Clients by their latest user or system activity, newest first,
with Client name as the stable tie-breaker. Show an unread message icon/count
and open the selected Client view focused on chat.

Treat chat as the complete activity stream. Merge Client and Adviser messages,
claim events, reminders, and successfully sent emails by timestamp. Render the
stream oldest-to-newest and scroll to the latest event by default. Opening a
conversation marks its unread messages as read. The latest delivered reminder
email is represented by its sent-email system activity, not a separate table.

Seed provider records for:

- Financial Adviser
- Financial Institution
- Assessor
- Repairer

Keep at least three available seeded Assessors and three available seeded
Repairers so the claim shortlists can be demonstrated without external APIs.

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

Return at most two recommendations for the general matching API. The claim
workflow is the one explicit exception: its deterministic Assessor and Repairer
shortlists contain three seeded candidates. Do not add AI, embeddings, RAG, or
complex recommendation algorithms for this hackathon.

## Implementation boundaries

- Keep React, TypeScript, Material UI, FastAPI, PostgreSQL, and Docker Compose.
- Reuse the existing chat and shared Client components.
- Keep the Client interface simple, white, and blue.
- Present Investment Goal and Insurance as the two Client product-creation
  choices. Keep current database identifiers stable until the JSON-driven
  product-model migration ticket is implemented.
- Use additive SQL migrations and deterministic seed data.
- Keep the seeded demo-user JSON as the PoC source of truth for `client` and
  `adviser` roles, and validate backend-signed tokens on every protected route.
- Enforce Client ownership and Adviser assignment in backend queries.
- Add type hints, concise docstrings, explicit names, and junior-friendly code.
- Run the frontend build, backend checks, and focused role-boundary tests before
  completing a ticket.
- Use `client-connect` naming for Docker, database, and application identifiers
  as well as user-facing branding.

## Deferred work

Do not implement provider self-registration, provider dashboards, Financial
Institution product management, Assessor reports, Repairer quotes, claim PDFs,
final claim accounting, provider emails, real provider APIs, payments or fee
collection, AI matching, advanced recommendation logic, multiple tenancy, real
scheduling, production identity management, or production claim integrations
during the hackathon.

## Source of truth

Use `TASKS.md` as the ordered implementation backlog. Work from the first
unchecked ticket unless the user explicitly changes the priority.

Use `dev.docker-compose.yaml` for local development and verification.
