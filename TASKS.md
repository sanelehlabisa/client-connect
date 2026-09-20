# ClientConnect Hackathon Backlog

## 0. Refocus and naming

- [x] Define ClientConnect as a broader provider marketplace.
- [x] Make Adviser matching plus chat the primary hackathon demo.
- [x] Add root `AGENTS.md` so future work follows the new direction.
- [x] Standardize user-facing product branding as ClientConnect.
- [x] Rename the GitHub repository to `client-connect` and update `origin`.

## 1. Existing foundation - keep working

- [x] Client and Adviser authentication with Keycloak roles.
- [x] Keep the seeded Keycloak and application Client/Adviser identities aligned.
- [x] Shared financial dashboard with Goals, Insurance, and Investments.
- [x] Assigned-Client management and protected Adviser access.
- [x] Client-Adviser chat, notifications, and development email.
- [x] Motor-claim workflow, progress, closure, review, and provider rating.
- [x] Automated reminders and Client service requests.

## 2. P0 - Primary demo: Goal and Insurance claim

- [ ] Verify a Client can create an Investment Goal and open its Product-by-ID view.
- [ ] Let a Client submit a claim form only for Insurance they own.
- [ ] Use one shared Product-by-ID view for the Client and assigned Adviser.
- [ ] Link messages and system activity to the Product and show one chronological chat timeline.
- [ ] Let the Adviser select one of the best three seeded Assessors without an Assessor login.
- [ ] Let the Client choose a mock assessment date and time.
- [ ] Let the Adviser upload the Assessor report and log it in the Product chat.
- [ ] Email claim and assessment details to three seeded service providers through MailHog.
- [ ] Show three mock quotes and let the Adviser select one.
- [ ] Record the excess, approved amount, selected quote, and final claim balance.
- [ ] Generate a simple claim-summary PDF for the Adviser to email to the Financial Institution.
- [ ] Add focused tests for ownership, Adviser assignment, role permissions, and status order.
- [ ] Verify the complete Client-to-Adviser demo from a second device on the same network.

## 3. P0 - Same-network demo access

- [x] Create the ignored local `.env` from `.env.example` using the host machine's LAN IP.
- [x] Configure the public frontend, backend API, and Keycloak URLs from that LAN IP.
- [x] Make Vite, FastAPI, and Keycloak reachable from another device on the same network.
- [x] Allow the LAN frontend origin in backend CORS and Keycloak redirect/web origins.
- [x] Keep PostgreSQL and container-to-container URLs on the private Docker network.
- [ ] Document the shareable URL and verify login plus API access from a second device.

## 4. P0 - Seeded provider marketplace

- [x] Add an additive provider schema with type, services, rating, location, and availability.
- [x] Seed Financial Advisers, Financial Institutions, Assessors, and Repairers.
- [x] Include the Royal Square Adviser in deterministic seed data.
- [x] Seed basic Insurance, Investment, and Savings products for Financial Institutions.

## 5. P0 - Reusable provider matching

- [x] Create one typed matching service accepting service, provider type, and optional location.
- [x] Filter by provider type, offered service, availability, and relevant location.
- [x] Rank deterministically by rating, distance when relevant, then stable name or ID.
- [x] Return no more than the best two matches.
- [x] Add focused tests for eligibility, ranking, tie-breaking, and the two-result limit.

## 6. P0 - Adviser connection demo

- [x] Add a prominent `Get Financial Advice` action to the Client dashboard.
- [x] Keep deterministic two-result Adviser matching available in the API.
- [x] Include the seeded Royal Square Adviser in provider data.
- [x] Link the Client to the assigned Adviser and existing conversation.
- [x] Let `Get Financial Advice` open the conversation directly in the simplified UI.
- [x] Verify the Client message, Adviser reply, and Client notification demo end to end.

## 7. P1 - Product removal

- [x] Let a Client or assigned Adviser remove a Goal or Investment after confirmation.
- [x] Archive an Insurance policy without deleting its claim and notification history.
- [x] Hide archived products from active views and keep them available in history.
- [ ] Notify the Client and Adviser when a product is removed or archived.

## 8. P1 - Simplified Client page

- [x] Show the signed-in user's name with their role underneath and a red icon Log out action.
- [x] Add a small ClientConnect wordmark to the navigation bar.
- [x] Keep navigation sticky with a simple Log out action.
- [x] Use canonical Client-by-ID and Product-by-ID routes.
- [x] Present the financial position as one compact label-and-value card.
- [x] Keep the Client page focused on financial position, products, and chat.
- [ ] Consider restoring a compact `Get Financial Advice` shortcut after the core Client page is stable.
- [x] Present Investment Goal and Insurance as the two new-product actions.
- [x] Show active automatic reminders inside the conversation instead of a separate table.
- [x] Show notification activity inside chat and remove the separate Notifications page.

## 9. P1 - JSON-driven product model

- [ ] Define `Investment Goal` and `Insurance` as the two canonical product types.
- [ ] Add one small versioned JSON schema describing each type's labels, questions, and behavior.
- [ ] Render product creation questions and details from the JSON schema.
- [ ] Migrate legacy `GOAL` and `INVESTMENT` records safely into `Investment Goal` without losing data.
- [ ] Add focused validation tests for both configured product types.

## 10. P1 - Automatic Adviser task recommendations

- [ ] Generate simple, deterministic recommended tasks from Client products and requests.
- [ ] Deduplicate recommendations so the Adviser is not repeatedly notified.
- [ ] Store each recommendation as an Adviser notification linked to the Client.
- [ ] Show a non-blocking popup when a new recommendation arrives in ClientConnect.
- [ ] Let the Adviser open the Client or create a reminder from the recommendation.

## 11. P1 - Seeded financial-product discovery

- [ ] Show selected seeded Financial Institution products to Clients.
- [ ] Display provider, product name, product type, and basic information.
- [ ] Keep product publishing and Financial Institution accounts deferred.

## 12. Demo acceptance

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
