# ClientConnect Hackathon Backlog

## 0. Refocus and naming

- [x] Define ClientConnect as a broader provider marketplace.
- [x] Make Adviser matching plus chat the primary hackathon demo.
- [x] Add root `AGENTS.md` so future work follows the new direction.
- [x] Standardize user-facing product branding as ClientConnect.
- [x] Rename the GitHub repository to `client-connect` and update `origin`.

## 1. Existing foundation - keep working

- [x] Use seeded JSON Client/Adviser users, email/password login, and
  backend-signed development tokens.
- [x] Keep the seeded demo-auth and application Client/Adviser identities aligned.
- [x] Remove self-registration and the obsolete identity runtime, database,
  realm, and browser configuration from the hackathon stack.
- [x] Shared financial dashboard with Goals, Insurance, and Investments.
- [x] Assigned-Client management and protected Adviser access.
- [x] Client-Adviser chat, notifications, and development email.
- [x] Motor-claim workflow, progress, closure, review, and provider rating.
- [x] Automated reminders and Client service requests.

## 2. P0 - Next work: Adviser claim approval

- [ ] Let only the assigned Adviser approve, request changes to, or reject a
  submitted claim from the shared Insurance Product-by-ID view.
- [ ] Remove the separate dashboard Claim review queue after those shared-view
  actions work.
- [ ] Add every decision as a timestamped system activity and notify the Client
  in the same shared timeline.
- [ ] Add focused tests for ownership, Adviser assignment, roles, and allowed
  claim-status transitions.

## 3. P0 - Simplified Adviser inbox and activity

- [ ] Keep the Adviser dashboard to the shared header and one `Your clients`
  list; remove the repeated role, name, welcome copy, and separate Claim reviews.
- [ ] Do not add separate notification, reminder, or claim sections to the
  Adviser dashboard; open that work through the relevant Client and Product.
- [ ] Add an additive activity/read model so every event has a Client, optional
  Product, timestamp, intended recipient, and read state.
- [ ] Add latest activity time, a short activity preview, and unread message
  count to each assigned-Client summary.
- [ ] Sort Clients by latest activity first, then by Client name as a stable
  tie-breaker.
- [ ] Show an unread icon/count and open the Client view focused on chat when
  the Adviser selects that Client.
- [ ] Track recipient read state and mark the conversation read when it opens.
- [ ] Merge user messages, claim events, reminders, and sent-email events into
  one timestamped timeline, ordered oldest-to-newest and scrolled to the latest
  event by default.
- [ ] Record every successfully sent reminder email as a system activity so the
  most recent email is also the latest reminder activity.
- [ ] Add focused tests for activity ordering, Client ordering, and unread/read
  behavior.

## 4. P0 - Simple end-to-end claim completion

- [x] Verify a Client can create an Investment Goal and open its Product-by-ID view.
- [ ] Let a Client submit initial claim information only for Insurance they own.
- [ ] Add explicit workflow state for the selected Assessor, assessment time,
  mock report, selected Repairer and quote, repair time, final amounts, demo
  charge, and PDF.
- [ ] Seed a third available Assessor and Repairer and add a claim-only
  three-result shortlist without changing the two-result Adviser matching API.
- [ ] After approval, recommend three seeded Assessors and let the Adviser pick
  one without adding an Assessor login.
- [ ] Let the Client enter the assessment date and time only when that step is
  active, then log the selection in the timeline.
- [ ] Generate a mock assessment report and log it without real waiting or an
  external Assessor integration.
- [ ] Recommend three seeded Repairers with mock quotes and let the Adviser
  select one.
- [ ] Let the Client enter the repair date and time only after Repairer selection;
  assume the demo providers accept the chosen time.
- [ ] Let the Adviser record the excess, approved amount, selected quote, and
  final claim balance.
- [ ] Immediately before PDF generation, record one Adviser-only system activity
  showing the brokerage's demo transaction charge, amount, reference, and time.
- [ ] Generate the claim-summary PDF only after the charge is recorded, then let
  the Adviser email it manually to the seeded Financial Institution via MailHog.
- [ ] Add focused tests for step order, one-at-a-time dates, provider selection,
  duplicate-charge prevention, and the charge-before-PDF rule.
- [ ] Verify the complete Client-to-Adviser demo from a second device on the same network.

## 5. P0 - Same-network demo access

- [x] Create the ignored local `.env` from `.env.example` using the host machine's LAN IP.
- [x] Configure the public frontend and backend API URLs from that LAN IP.
- [x] Make Vite and FastAPI listen for devices on the same network.
- [x] Allow the LAN frontend origin in backend CORS.
- [x] Support the JSON demo login from the trusted HTTP LAN demo origin.
- [x] Keep PostgreSQL and container-to-container URLs on the private Docker network.
- [ ] Document the shareable URL and verify login plus API access from a second device.

## 6. P0 - Seeded provider marketplace

- [x] Add an additive provider schema with type, services, rating, location, and availability.
- [x] Seed Financial Advisers, Financial Institutions, Assessors, and Repairers.
- [x] Include the Royal Square Adviser in deterministic seed data.
- [x] Seed basic Insurance, Investment, and Savings products for Financial Institutions.

## 7. P0 - Reusable provider matching

- [x] Create one typed matching service accepting service, provider type, and optional location.
- [x] Filter by provider type, offered service, availability, and relevant location.
- [x] Rank deterministically by rating, distance when relevant, then stable name or ID.
- [x] Return no more than the best two matches.
- [x] Add focused tests for eligibility, ranking, tie-breaking, and the two-result limit.

## 8. P0 - Adviser connection demo

- [x] Add a prominent `Get Financial Advice` action to the Client dashboard.
- [x] Keep deterministic two-result Adviser matching available in the API.
- [x] Include the seeded Royal Square Adviser in provider data.
- [x] Link the Client to the assigned Adviser and existing conversation.
- [x] Let `Get Financial Advice` open the conversation directly in the simplified UI.
- [x] Verify the Client message, Adviser reply, and Client notification demo end to end.

## 9. P1 - Product removal

- [x] Let a Client or assigned Adviser remove a Goal or Investment after confirmation.
- [x] Archive an Insurance policy without deleting its claim and notification history.
- [x] Hide archived products from active views and keep them available in history.
- [ ] Notify the Client and Adviser when a product is removed or archived.

## 10. P1 - Simplified Client page

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

## 11. P1 - JSON-driven product model

- [ ] Define `Investment Goal` and `Insurance` as the two canonical product types.
- [ ] Add one small versioned JSON schema describing each type's labels, questions, and behavior.
- [ ] Render product creation questions and details from the JSON schema.
- [ ] Migrate legacy `GOAL` and `INVESTMENT` records safely into `Investment Goal` without losing data.
- [ ] Add focused validation tests for both configured product types.

## 12. P1 - Automatic Adviser task recommendations

- [ ] Generate simple, deterministic recommended tasks from Client products and requests.
- [ ] Deduplicate recommendations so the Adviser is not repeatedly notified.
- [ ] Store each recommendation as an Adviser notification linked to the Client.
- [ ] Show a non-blocking popup when a new recommendation arrives in ClientConnect.
- [ ] Let the Adviser open the Client or create a reminder from the recommendation.

## 13. P1 - Seeded financial-product discovery

- [ ] Show selected seeded Financial Institution products to Clients.
- [ ] Display provider, product name, product type, and basic information.
- [ ] Keep product publishing and Financial Institution accounts deferred.

## 14. Demo acceptance

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
- [ ] Real payments and transaction-fee collection; keep only the demo charge record.
- [ ] AI matching, RAG, and advanced recommendation algorithms.
- [ ] Multiple brokerage tenancy and production infrastructure.
