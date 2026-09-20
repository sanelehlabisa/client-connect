# ClientConnect Hackathon Backlog

## 0. Refocus and naming

- [x] Define ClientConnect as a broader provider marketplace.
- [x] Make Adviser matching plus chat the primary hackathon demo.
- [x] Add root `AGENTS.md` so future work follows the new direction.
- [x] Change user-facing product branding from RSF ClientConnect to ClientConnect.
- [ ] Rename the GitHub repository from `rsf` to `client-connect` and update `origin`.

## 1. Existing foundation - keep working

- [x] Client and Adviser authentication with Keycloak roles.
- [x] Shared financial dashboard with Goals, Insurance, and Investments.
- [x] Assigned-Client management and protected Adviser access.
- [x] Client-Adviser chat, notifications, and development email.
- [x] Motor-claim workflow, progress, closure, review, and provider rating.
- [x] Automated reminders and Client service requests.

## 2. P0 - Seeded provider marketplace

- [ ] Add an additive provider schema with type, services, rating, location, and availability.
- [ ] Seed Financial Advisers, Financial Institutions, Assessors, and Repairers.
- [ ] Include the Royal Square Adviser in deterministic seed data.
- [ ] Seed basic Insurance, Investment, and Savings products for Financial Institutions.

## 3. P0 - Reusable provider matching

- [ ] Create one typed matching service accepting service, provider type, and optional location.
- [ ] Filter by provider type, offered service, availability, and relevant location.
- [ ] Rank deterministically by rating, distance when relevant, then stable name or ID.
- [ ] Return no more than the best two matches.
- [ ] Add focused tests for eligibility, ranking, tie-breaking, and the two-result limit.

## 4. P0 - Adviser matching demo

- [ ] Add a prominent `Get Financial Advice` action to the Client dashboard.
- [ ] Request and display two recommended Financial Advisers.
- [ ] Show name, services, rating, location, and availability for each recommendation.
- [ ] Let the Client select the seeded Royal Square Adviser.
- [ ] Link the selection to the Client and open the existing conversation.
- [ ] Verify the Client message, Adviser reply, and Client notification demo end to end.

## 5. P1 - Seeded financial-product discovery

- [ ] Show selected seeded Financial Institution products to Clients.
- [ ] Display provider, product name, product type, and basic information.
- [ ] Keep product publishing and Financial Institution accounts deferred.

## 6. P2 - Optional claim-provider matching

Start only after the Adviser matching demo is complete.

- [ ] Reuse the matching service for Assessors at the appropriate claim stage.
- [ ] Reuse the matching service for Repairers at the appropriate claim stage.
- [ ] Show two recommendations and store the selected provider on the claim.
- [ ] Continue the existing claim workflow after selection.

## 7. Demo acceptance

- [ ] Client logs in and sees their financial dashboard.
- [ ] Client selects `Get Financial Advice` and receives two recommendations.
- [ ] Results include the seeded Royal Square Adviser.
- [ ] Client selects the Adviser and sends a message in the existing chat.
- [ ] Adviser logs in, sees the Client and message, and replies.
- [ ] Client receives a notification and sees the response.
- [ ] Fix demo blockers and stop before deferred work.

## Deferred

- [ ] Provider registration and provider dashboards.
- [ ] Financial Institution product-management UI.
- [ ] Real financial-provider and production claim integrations.
- [ ] Payments and transaction-fee collection.
- [ ] AI matching, RAG, and advanced recommendation algorithms.
- [ ] Multiple brokerage tenancy and production infrastructure.
