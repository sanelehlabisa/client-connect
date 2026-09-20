# RSF ClientConnect - 1-Day PoC

## 1. Product scope

- [x] Treat Royal Square as the brokerage customer using our platform.
- [x] Support only two app users: `Client` and `Adviser`.
- [x] Keep the PoC for one brokerage; advisers manage its individual clients.
- [x] Keep the business model transaction-based, not subscription-based.
- [x] Prioritize one complete Client-to-Adviser demo over extra features.

## 2. Project and Docker setup

- [x] Use React, TypeScript, Material UI, FastAPI, and PostgreSQL.
- [x] Create frontend/, backend/, database/, and Keycloak configuration.
- [x] Add the white-and-blue theme and typed, documented starter code.
- [x] Add `dev.docker-compose.yaml` with hot reload and MailHog.
- [x] Document and verify the development environment.

## 3. Authentication and API security

- [x] Add Keycloak login, registration, session, role, and logout support.
- [x] Create `/login` and redirect its login/registration actions to Keycloak.
- [x] Seed realistic Client and Adviser accounts.
- [x] Route a Client to their own dashboard after login.
- [x] Route an Adviser to their assigned-clients dashboard after login.
- [x] Protect Client financial data with ownership checks.
- [x] Protect review and approval actions with the `adviser` role.
- [x] Keep roles in Keycloak as the source of truth.

## 4. Brokerage client management

- [x] Show the Adviser a table of assigned clients.
- [x] Let the Adviser add a Client profile with name and email.
- [x] Link the Client profile to the brokerage, Adviser, and matching Keycloak account.
- [x] Let the Adviser open `/client/:id` only for an assigned Client.

## 5. Shared financial and product view

- [x] Create `/dashboard` and `/client/:id` using shared components.
- [x] Show Assets, Liabilities, Net Worth, Monthly Income, and Expenses.
- [x] Show the Client's Goal and Insurance products in one table.
- [x] Open product details in a simple panel or dialog when clicked.
- [x] Show Goal name, start/current/target amounts, start/end dates, status, and progress bar.
- [x] Show Insurance provider, product, policy number, premium, cover, and status.

For this PoC, use seeded products. Product creation is deferred.

## 6. Client-Adviser chat

- [x] Add one persistent in-app conversation per Client and assigned Adviser.
- [x] Show messages oldest-to-newest with sender and date/time.
- [x] Let either participant send a text message from the shared client view.
- [x] Prevent Clients and unassigned Advisers from reading another conversation.
- [x] Create an unread notification when a new message arrives.
- [x] Refresh new messages with simple polling; do not add WebSockets.

## 7. Motor claim workflow

- [x] Add `Report an Accident` to the Client's owned motor-insurance details.
- [x] Show the scene checklist: location, photos, parties, vehicles, licences, witnesses, insurance details, and police report within 48 hours.
- [x] Collect incident date/time, location, description, police status, and case number.
- [x] Collect driver/use, witness, other vehicle/property, and third-party insurance details.
- [x] Accept demo photo/document selections and store their filenames only.
- [x] Provide protected Client submission/history and Adviser review APIs.
- [x] Add Adviser controls for `Under Review`, `Approved`, `Changes Required`, or `Rejected`.
- [x] Block Client tokens from approving or reviewing a claim.

## 8. Notifications and email

- [x] Create `/notifications` for both Client and Adviser.
- [x] Show title, message, date/time, read state, and related Client/product.
- [x] Log new messages, claim submission, review, and decision events.
- [x] Email the Adviser when a Client submits a claim.
- [x] Email the Client when the Adviser makes a decision.
- [x] Use MailHog for development email.

## 9. Demo check

- [x] Client logs in through Keycloak and sees only their finances and products.
- [x] Client opens their Goal and sees its progress.
- [x] Client chats with their Adviser.
- [x] Client opens their motor insurance and submits a claim.
- [x] Adviser logs in, sees the Client, message, and pending claim.
- [x] Adviser replies and reviews the claim.
- [x] Client receives notifications/email and sees the updated claim status.
- [x] Fix demo blockers; defer everything else.

## Next product-management work

- [x] Let Clients add financial Goals through the dashboard.
- [x] Let Advisers add Goals for assigned Clients.
- [x] Add Insurance policy creation through the UI.
- [x] Add Investment creation through the UI.

## Provider and claim automation

- [x] Mock provider acknowledgement with a claim number and claims handler.
- [x] Track assessment, repair, car hire, collection, and claim closure.
- [x] Let Clients review and close claims that are ready for collection.
- [x] Let Clients rate the product provider when closing a claim.
- [ ] Replace the mock acknowledgement with real provider APIs.

## Automated reminders

- [x] Show role-appropriate seeded reminders with due dates.
- [x] Let Advisers create and schedule reminders for assigned Clients.
- [x] Send due reminders through in-app notifications and email.
- [x] Let Clients and Advisers mark their visible reminders complete.

## Deferred

- [ ] Assessors, repairers, and advanced claim automation.
- [ ] WhatsApp/SMS integration, voice notes, AI, and cloud file storage.
- [ ] Multiple brokerage tenancy, billing, and transaction-fee collection.
- [ ] Advanced compliance, production authentication, and managed infrastructure.
