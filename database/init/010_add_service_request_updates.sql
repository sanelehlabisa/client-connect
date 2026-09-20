-- Track when an Adviser last updated a Client service request.

ALTER TABLE service_requests
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ
        NOT NULL DEFAULT CURRENT_TIMESTAMP;
