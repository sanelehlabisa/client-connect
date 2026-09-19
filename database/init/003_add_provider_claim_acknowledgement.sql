-- Store the acknowledgement returned by the mock Insurance provider.

ALTER TABLE insurance_requests
    ADD COLUMN IF NOT EXISTS provider_claim_number VARCHAR(80),
    ADD COLUMN IF NOT EXISTS claims_handler VARCHAR(120);
