-- Track common Client document and consultation requests.

CREATE TABLE IF NOT EXISTS service_requests (
    id VARCHAR(40) PRIMARY KEY,
    client_id VARCHAR(40) NOT NULL REFERENCES clients(id),
    request_type VARCHAR(40) NOT NULL CHECK (
        request_type IN (
            'Policy Document',
            'Border Letter',
            'Investment IRP5',
            'Consultation'
        )
    ),
    details TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Submitted',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS service_requests_client_created_at_idx
    ON service_requests (client_id, created_at DESC);
