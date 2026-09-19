# RSF ClientConnect - 1-Day PoC

## 1. Project setup

- [ ] Choose the smallest stack and record it in `README.md`.
- [ ] Create the directories documented in `README.md`:
  - `app/` - routes and server actions/API
  - `components/` - shared UI
  - `lib/` - auth, mock store, notifications, email
  - `data/` - deterministic demo seed data
- [ ] Add `.env.example` with app and MailHog settings.
- [ ] Add one command to reset the demo data.

## 2. Docker development

- [ ] Create `Dockerfile` for the app.
- [ ] Create `compose.yaml` with `app` and `mailhog` services.
- [ ] Mount source files into the app container for hot reload.
- [ ] Expose the app and MailHog web UI ports.
- [ ] Add start, stop, rebuild, and reset commands to `README.md`.
- [ ] Verify a source edit refreshes the running app.

## 3. Mock authentication

- [ ] Create `/login` with Client and Adviser login buttons.
- [ ] Persist the selected mock user for the session.
- [ ] Restrict Clients to their own information.
- [ ] Restrict approval and edit actions to Advisers.
- [ ] Add logout.

## 4. Shared financial view

- [ ] Create `/dashboard` and `/client/:id`.
- [ ] Show Assets, Liabilities, Net Worth, Income, and Expenses.
- [ ] Show Goal and Insurance in one Products table.
- [ ] Reuse the same financial/product components for both roles.
- [ ] Show Goal details and a progress bar.

## 5. Insurance workflow

- [ ] Show policy, provider, premium, cover, and status.
- [ ] Let the Client submit a change request.
- [ ] Create a notification and adviser email on submission.
- [ ] Let the Adviser open and review the request.
- [ ] Add Approve, Request changes, and Reject actions.
- [ ] Create a notification and client email after the decision.
- [ ] Never allow the Client to approve a request.

## 6. Notifications

- [ ] Create `/notifications` with newest activity first.
- [ ] Show title, message, time, read state, and related product.
- [ ] Record every submission, review, decision, and Goal update.
- [ ] Send development email through MailHog.

## 7. Demo check

- [ ] Client logs in and sees finances, Goal, and Insurance.
- [ ] Client submits an Insurance request.
- [ ] Adviser receives the notification and MailHog email.
- [ ] Adviser reviews and approves the request.
- [ ] Client receives the notification and MailHog email.
- [ ] Client logs back in and sees `Approved`.
- [ ] Fix demo blockers; defer all other work.

## Deferred

- [ ] Real authentication, database, insurer APIs, and production email.
- [ ] Extra roles, separate product pages, AI, and advanced compliance.
- [ ] Visual polish beyond a clear, responsive demo.
