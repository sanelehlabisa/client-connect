# RSF ClientConnect - 1-Day PoC

## 1. Project setup

- [x] Use React + TypeScript + Material UI for the frontend.
- [x] Use Python + FastAPI for the backend.
- [x] Use PostgreSQL for development data.
- [x] Create frontend/, backend/, and database/.
- [x] Add the white-and-blue Material UI theme.
- [x] Add typed, documented starter code.
- [x] Add .env.example.

## 2. Docker development

- [x] Add frontend and backend Dockerfiles.
- [x] Add dev.docker-compose.yaml with app, database, Keycloak, and MailHog services.
- [x] Mount source code for Vite and FastAPI hot reload.
- [x] Expose frontend, API, PostgreSQL, Keycloak, SMTP, and MailHog ports.
- [x] Document start, stop, rebuild, and log commands.
- [x] Build the images and verify both hot-reload paths.

## 3. Keycloak authentication

- [x] Add a versioned development realm JSON.
- [x] Enable self-registration with `client` as the default role.
- [x] Add an `advisers` group that grants the `adviser` role.
- [x] Seed realistic Client and Adviser test accounts.
- [x] Add React login, registration, session, role, and logout support.
- [x] Validate Keycloak tokens and roles in FastAPI.
- [x] Protect financial routes with Client ownership checks.
- [ ] Protect review and approval routes with the `adviser` role.

## 4. Shared financial view

- [ ] Create /dashboard and /client/:id.
- [ ] Show Assets, Liabilities, Net Worth, Income, and Expenses.
- [ ] Show Goal and Insurance in one Products table.
- [ ] Reuse the same financial/product components for both roles.
- [ ] Show Goal details and a progress bar.

## 5. Insurance workflow

- [ ] Show policy, provider, premium, cover, and status.
- [ ] Let the Client submit a change request.
- [ ] Create a notification and adviser email on submission.
- [ ] Let the Adviser review the request.
- [ ] Add Approve, Request changes, and Reject.
- [ ] Notify the Client after the decision.
- [ ] Never allow the Client to approve a request.

## 6. Notifications

- [ ] Create /notifications with newest activity first.
- [ ] Show title, message, time, read state, and related product.
- [ ] Record every submission, review, decision, and Goal update.
- [ ] Send development email through MailHog.

## 7. Demo check

- [ ] Client sees finances, Goal, and Insurance.
- [ ] Client submits an Insurance request.
- [ ] Adviser receives a notification and email.
- [ ] Adviser approves the request.
- [ ] Client receives a notification and email.
- [ ] Client logs back in and sees Approved.
- [ ] Fix demo blockers; defer everything else.

## Deferred

- [ ] Production authentication, managed database, and migrations.
- [ ] Real insurer integrations and production email.
- [ ] Extra roles, separate product pages, AI, and advanced compliance.
- [ ] Visual polish beyond a clear responsive demo.
