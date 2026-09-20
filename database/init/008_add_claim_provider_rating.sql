-- Record the Client's provider rating when a claim transaction is closed.

ALTER TABLE insurance_requests
    ADD COLUMN IF NOT EXISTS provider_rating SMALLINT
        CHECK (provider_rating BETWEEN 1 AND 5);
