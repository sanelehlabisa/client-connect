-- Store the Client's feedback when they close a completed claim transaction.

ALTER TABLE insurance_requests
    ADD COLUMN IF NOT EXISTS client_review TEXT,
    ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
