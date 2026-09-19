Create/update TASKS.md for the RSF ClientConnect hackathon.

This is a 1-day hackathon. Keep the implementation extremely small.
Do not add features outside this scope.

## Roles

Only support:
1. Client
2. Adviser

The Client must have a very simple interface.
The Adviser has additional edit and approval permissions.

## Routes

Keep routing minimal:

- /login
- /dashboard
- /client/:id
- /notifications

Do not create separate pages for every product or workflow unless technically necessary.

## Authentication

Create mock authentication for:

CLIENT
- Can only access their own information.
- Cannot approve financial/product changes.

ADVISER
- Dashboard defaults to a list of clients.
- Can open any assigned client's profile.
- Can edit products.
- Can review and approve submitted changes.

---

## Client Dashboard

The client's landing page is their financial overview.

At the top show Financial Position:

- Assets
- Liabilities
- Net Worth
- Monthly Income
- Monthly Expenses

Below this show ONE Products table.

Do not create separate tables for investments, insurance, goals, etc.

Columns:

Product
Type
Provider
Value / Progress
Status
Action

For the hackathon only support:

1. Goal
2. Insurance

Example:

Emergency Fund | Goal | RSF | R15,000 / R30,000 | Active
Car Insurance | Insurance | Santam | R1,200/month | Active

Clicking a product opens its details.

---

## Goal Product

Keep this simple.

Fields:

- Goal name
- Target amount
- Current value
- Start date
- Target date
- Progress
- Status

Display a progress bar.

The adviser can edit the goal.

Changes should generate a log/notification.

---

## Insurance Product

Insurance is the main interactive workflow.

Show:

- Provider
- Policy/product name
- Policy number
- Premium
- Cover amount
- Status

Include a simple form for information/changes related to the insurance.

The client can submit information or requested changes.

The adviser can review the submission and:

- Approve
- Request changes
- Reject

The client cannot approve anything.

Show the current status clearly:

Submitted → Under Review → Approved / Changes Required / Rejected

Every important status change must generate a notification/log.

Do NOT implement real insurer integrations.
Use mock data/mock API responses.

---

## Adviser Dashboard

The adviser lands on a Clients table.

Show:

- Client name
- Financial position
- Net worth
- Products
- Pending actions

Clicking a client opens:

/client/:id

The adviser sees essentially the SAME financial page the client sees.

However, adviser permissions add:

- Edit Goal
- Edit Insurance
- Review submissions
- Approve
- Request changes
- Reject

Reuse the client components rather than creating a completely separate adviser UI.

---

## Notifications / Activity Logs

Notifications are mandatory.

Both Client and Adviser have:

/notifications

Show a chronological activity log.

Examples:

- Insurance change submitted
- Adviser is reviewing your request
- Insurance change approved
- Goal updated
- Reminder created
- Claim information received

Each notification should have:

- Title
- Message
- Date/time
- Read/unread
- Related client/product if applicable

Every major action in the demo should create a log entry.

---

## Email

Send emails for important notifications.

For development use MailHog SMTP.

Examples:

Client submits change
→ create adviser notification
→ send adviser email

Adviser approves change
→ create client notification
→ send client email

The Notifications page remains the permanent in-app record.

---

## UI Priority

The client is non-technical.

Keep the client UI extremely simple:

Financial Position
↓
Products Table
↓
Click Product
↓
View / Submit
↓
Track through Notifications

Avoid:
- complex navigation
- unnecessary buttons
- separate pages for every product
- assessor accounts
- repairer accounts
- real insurer APIs
- complex AI
- advanced compliance workflows

Build reusable components so Goal and Insurance are product types within the same product system.

## Demo Flow

The final implementation must support this demo:

1. Login as Client.
2. See financial position.
3. See Goal and Insurance in one Products table.
4. Open Goal and see progress.
5. Open Insurance.
6. Submit an insurance-related change/request.
7. Notification/log is created and email is sent.
8. Logout.
9. Login as Adviser.
10. See Clients table.
11. Open that client.
12. See the same financial/product information.
13. Open the pending insurance request.
14. Approve it.
15. Client notification/log is created and email is sent.
16. Login as Client and see the approved status.

Organize TASKS.md by implementation priority and use checkboxes.
Focus first on completing this end-to-end flow before adding anything else.