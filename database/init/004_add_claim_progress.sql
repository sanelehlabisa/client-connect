-- Track operational progress after an Insurance claim is approved.

ALTER TABLE insurance_requests
    ADD COLUMN IF NOT EXISTS progress_stage VARCHAR(40)
        NOT NULL DEFAULT 'Provider Acknowledged',
    ADD COLUMN IF NOT EXISTS progress_updated_at TIMESTAMPTZ
        NOT NULL DEFAULT CURRENT_TIMESTAMP;
