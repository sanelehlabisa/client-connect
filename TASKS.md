# ClientConnect Hackathon Backlog

## 0. Refocus and naming

- [x] Define ClientConnect as a broader provider marketplace.
- [x] Make Adviser matching plus chat the primary hackathon demo.
- [x] Add root `AGENTS.md` so future work follows the new direction.
- [x] Change user-facing product branding from RSF ClientConnect to ClientConnect.
- [x] Rename the GitHub repository from `rsf` to `client-connect` and update `origin`.

## 1. Existing foundation - keep working

- [x] Client and Adviser authentication with Keycloak roles.
- [x] Shared financial dashboard with Goals, Insurance, and Investments.
- [x] Assigned-Client management and protected Adviser access.
- [x] Client-Adviser chat, notifications, and development email.
- [x] Motor-claim workflow, progress, closure, review, and provider rating.
- [x] Automated reminders and Client service requests.

## 2. P0 - Seeded provider marketplace

- [x] Add an additive provider schema with type, services, rating, location, and availability.
- [x] Seed Financial Advisers, Financial Institutions, Assessors, and Repairers.
- [x] Include the Royal Square Adviser in deterministic seed data.
- [x] Seed basic Insurance, Investment, and Savings products for Financial Institutions.

## 3. P0 - Reusable provider matching

- [x] Create one typed matching service accepting service, provider type, and optional location.
- [x] Filter by provider type, offered service, availability, and relevant location.
- [x] Rank deterministically by rating, distance when relevant, then stable name or ID.
- [x] Return no more than the best two matches.
- [x] Add focused tests for eligibility, ranking, tie-breaking, and the two-result limit.

## 4. P0 - Adviser connection demo

- [x] Add a prominent `Get Financial Advice` action to the Client dashboard.
- [x] Keep deterministic two-result Adviser matching available in the API.
- [x] Include the seeded Royal Square Adviser in provider data.
- [x] Link the Client to the assigned Adviser and existing conversation.
- [x] Let `Get Financial Advice` open the conversation directly in the simplified UI.
- [x] Verify the Client message, Adviser reply, and Client notification demo end to end.

## 5. P1 - Product removal

- [x] Let a Client or assigned Adviser remove a Goal or Investment after confirmation.
- [x] Archive an Insurance policy without deleting its claim and notification history.
- [x] Hide archived products from active views and keep them available in history.
- [ ] Notify the Client and Adviser when a product is removed or archived.

## 6. P1 - Simplified Client page

- [x] Show the signed-in user's name with their role underneath and a red icon Log out action.
- [x] Add a small ClientConnect wordmark to the navigation bar.
- [x] Keep navigation sticky and place the animated financial-advice shortcut beside Log out.
- [x] Use canonical Client-by-ID and Product-by-ID routes.
- [x] Present the financial position as one compact label-and-value card.
- [x] Keep the Client page focused on financial position, products, and chat.
- [x] Send `Get Financial Advice` directly to the Adviser conversation.
- [x] Present Investment Goal and Insurance as the two new-product actions.
- [x] Show active automatic reminders inside the conversation instead of a separate table.
- [x] Show notification activity inside chat and remove the separate Notifications page.
- [ ] Link messages and activity to a Product so Product-by-ID can show a filtered interaction timeline.

## 7. P1 - JSON-driven product model

- [ ] Define `Investment Goal` and `Insurance` as the two canonical product types.
- [ ] Add one small versioned JSON schema describing each type's labels, questions, and behavior.
- [ ] Render product creation questions and details from the JSON schema.
- [ ] Migrate legacy `GOAL` and `INVESTMENT` records safely into `Investment Goal` without losing data.
- [ ] Add focused validation tests for both configured product types.

## 8. P1 - Automatic Adviser task recommendations

- [ ] Generate simple, deterministic recommended tasks from Client products and requests.
- [ ] Deduplicate recommendations so the Adviser is not repeatedly notified.
- [ ] Store each recommendation as an Adviser notification linked to the Client.
- [ ] Show a non-blocking popup when a new recommendation arrives in ClientConnect.
- [ ] Let the Adviser open the Client or create a reminder from the recommendation.

## 9. P1 - Seeded financial-product discovery

- [ ] Show selected seeded Financial Institution products to Clients.
- [ ] Display provider, product name, product type, and basic information.
- [ ] Keep product publishing and Financial Institution accounts deferred.

## 10. P2 - Optional claim-provider matching

Start only after the Adviser matching demo is complete.

- [ ] Reuse the matching service for Assessors at the appropriate claim stage.
- [ ] Reuse the matching service for Repairers at the appropriate claim stage.
- [ ] Show two recommendations and store the selected provider on the claim.
- [ ] Continue the existing claim workflow after selection.

## 11. Demo acceptance

- [x] Client logs in and sees their financial dashboard.
- [x] Client selects `Get Financial Advice` and reaches the Adviser conversation.
- [x] Client sends a message in the existing chat.
- [x] Adviser logs in, sees the Client and message, and replies.
- [x] Client receives a notification and sees the response.
- [x] Fix demo blockers and stop before deferred work.

## Deferred

- [ ] Provider registration and provider dashboards.
- [ ] Financial Institution product-management UI.
- [ ] Real financial-provider and production claim integrations.
- [ ] Payments and transaction-fee collection.
- [ ] AI matching, RAG, and advanced recommendation algorithms.
- [ ] Multiple brokerage tenancy and production infrastructure.
