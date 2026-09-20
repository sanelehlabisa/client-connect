-- Store one shared Client activity with independent read state per recipient.

CREATE TABLE IF NOT EXISTS activities (
    id VARCHAR(64) PRIMARY KEY,
    client_id VARCHAR(40) NOT NULL REFERENCES clients(id),
    product_id VARCHAR(40) REFERENCES products(id) ON DELETE SET NULL,
    actor_user_id VARCHAR(40) REFERENCES users(id) ON DELETE SET NULL,
    activity_type VARCHAR(20) NOT NULL
        CHECK (
            activity_type IN (
                'Message',
                'Claim',
                'Reminder',
                'Email',
                'Service',
                'Product',
                'System'
            )
        ),
    source_type VARCHAR(40) NOT NULL,
    source_id VARCHAR(120) NOT NULL,
    title VARCHAR(160) NOT NULL,
    body TEXT NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (source_type, source_id)
);

CREATE INDEX IF NOT EXISTS activities_client_occurred_at_idx
    ON activities (client_id, occurred_at, id);

CREATE TABLE IF NOT EXISTS activity_receipts (
    activity_id VARCHAR(64) NOT NULL
        REFERENCES activities(id) ON DELETE CASCADE,
    user_id VARCHAR(40) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ,
    PRIMARY KEY (activity_id, user_id)
);

CREATE INDEX IF NOT EXISTS activity_receipts_user_read_idx
    ON activity_receipts (user_id, read_at, activity_id);

-- Keep existing chat history available without creating false unread badges.
INSERT INTO activities (
    id,
    client_id,
    actor_user_id,
    activity_type,
    source_type,
    source_id,
    title,
    body,
    occurred_at
)
SELECT
    'msg-' || messages.id,
    messages.client_id,
    messages.sender_user_id,
    'Message',
    'message',
    messages.id,
    'Message from ' || sender.name,
    messages.body,
    messages.created_at
FROM messages
JOIN users AS sender ON sender.id = messages.sender_user_id
ON CONFLICT (source_type, source_id) DO NOTHING;

INSERT INTO activity_receipts (activity_id, user_id, read_at)
SELECT
    activities.id,
    participant.user_id,
    activities.occurred_at
FROM activities
JOIN clients ON clients.id = activities.client_id
CROSS JOIN LATERAL (
    VALUES (clients.user_id), (clients.adviser_id)
) AS participant(user_id)
WHERE activities.source_type = 'message'
ON CONFLICT (activity_id, user_id) DO NOTHING;

-- Represent the latest state of existing claims as read historical activity.
INSERT INTO activities (
    id,
    client_id,
    product_id,
    activity_type,
    source_type,
    source_id,
    title,
    body,
    occurred_at
)
SELECT
    'clm-' || insurance_requests.id,
    products.client_id,
    products.id,
    'Claim',
    'claim-current',
    insurance_requests.id,
    'Claim status: ' || insurance_requests.status,
    'The claim for ' || products.name || ' is currently '
        || LOWER(insurance_requests.status) || '.',
    GREATEST(
        insurance_requests.created_at,
        insurance_requests.progress_updated_at
    )
FROM insurance_requests
JOIN products ON products.id = insurance_requests.product_id
ON CONFLICT (source_type, source_id) DO NOTHING;

INSERT INTO activity_receipts (activity_id, user_id, read_at)
SELECT
    activities.id,
    participant.user_id,
    activities.occurred_at
FROM activities
JOIN clients ON clients.id = activities.client_id
CROSS JOIN LATERAL (
    VALUES (clients.user_id), (clients.adviser_id)
) AS participant(user_id)
WHERE activities.source_type = 'claim-current'
ON CONFLICT (activity_id, user_id) DO NOTHING;

-- Preserve the most recent successfully delivered reminder emails as history.
INSERT INTO activities (
    id,
    client_id,
    activity_type,
    source_type,
    source_id,
    title,
    body,
    occurred_at
)
SELECT
    'eml-' || reminders.id,
    reminders.client_id,
    'Email',
    'reminder-email',
    reminders.id,
    'Reminder email sent',
    reminders.title,
    reminders.email_sent_at
FROM reminders
WHERE reminders.email_sent_at IS NOT NULL
ON CONFLICT (source_type, source_id) DO NOTHING;

INSERT INTO activity_receipts (activity_id, user_id, read_at)
SELECT
    activities.id,
    participant.user_id,
    activities.occurred_at
FROM activities
JOIN reminders
    ON activities.source_type = 'reminder-email'
    AND activities.source_id = reminders.id
JOIN clients ON clients.id = activities.client_id
CROSS JOIN LATERAL (
    VALUES
        (clients.user_id, reminders.audience IN ('Client', 'Both')),
        (clients.adviser_id, reminders.audience IN ('Adviser', 'Both'))
) AS participant(user_id, is_recipient)
WHERE participant.is_recipient
ON CONFLICT (activity_id, user_id) DO NOTHING;
