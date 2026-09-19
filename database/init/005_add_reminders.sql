-- Seed role-aware reminders from the original brokerage brief.

CREATE TABLE IF NOT EXISTS reminders (
    id VARCHAR(40) PRIMARY KEY,
    client_id VARCHAR(40) NOT NULL REFERENCES clients(id),
    title VARCHAR(160) NOT NULL,
    due_date DATE NOT NULL,
    audience VARCHAR(20) NOT NULL
        CHECK (audience IN ('Client', 'Adviser', 'Both')),
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS reminders_client_due_date_idx
    ON reminders (client_id, due_date);

INSERT INTO reminders (id, client_id, title, due_date, audience)
VALUES
    (
        'reminder-driving-licence-1',
        'client-profile-1',
        'Renew driving licence',
        '2026-10-15',
        'Client'
    ),
    (
        'reminder-annual-review-1',
        'client-profile-1',
        'Schedule annual financial review',
        '2026-11-01',
        'Adviser'
    ),
    (
        'reminder-valuation-1',
        'client-profile-1',
        'Update insurance valuation certificate',
        '2027-01-15',
        'Both'
    )
ON CONFLICT (id) DO NOTHING;
