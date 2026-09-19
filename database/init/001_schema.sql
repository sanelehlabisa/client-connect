-- Small development schema for the one-day proof of concept.

CREATE TABLE users (
    id VARCHAR(40) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE clients (
    id VARCHAR(40) PRIMARY KEY,
    user_id VARCHAR(40) NOT NULL UNIQUE REFERENCES users(id),
    adviser_id VARCHAR(40) NOT NULL REFERENCES users(id)
);

CREATE TABLE financial_positions (
    client_id VARCHAR(40) PRIMARY KEY REFERENCES clients(id),
    assets NUMERIC(14, 2) NOT NULL,
    liabilities NUMERIC(14, 2) NOT NULL,
    monthly_income NUMERIC(14, 2) NOT NULL,
    monthly_expenses NUMERIC(14, 2) NOT NULL
);

CREATE TABLE products (
    id VARCHAR(40) PRIMARY KEY,
    client_id VARCHAR(40) NOT NULL REFERENCES clients(id),
    product_type VARCHAR(20) NOT NULL CHECK (product_type IN ('GOAL', 'INSURANCE')),
    name VARCHAR(120) NOT NULL,
    provider VARCHAR(120) NOT NULL,
    status VARCHAR(40) NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE insurance_requests (
    id VARCHAR(40) PRIMARY KEY,
    product_id VARCHAR(40) NOT NULL REFERENCES products(id),
    request_type VARCHAR(80) NOT NULL,
    details TEXT NOT NULL,
    status VARCHAR(40) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notifications (
    id VARCHAR(40) PRIMARY KEY,
    user_id VARCHAR(40) NOT NULL REFERENCES users(id),
    title VARCHAR(160) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    product_id VARCHAR(40) REFERENCES products(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (id, name, email) VALUES
    ('adviser-1', 'Amina Daniels', 'amina.daniels@example.test'),
    ('client-1', 'Thabo Mokoena', 'thabo.mokoena@example.test');

INSERT INTO clients (id, user_id, adviser_id) VALUES
    ('client-profile-1', 'client-1', 'adviser-1');

INSERT INTO financial_positions (
    client_id,
    assets,
    liabilities,
    monthly_income,
    monthly_expenses
) VALUES ('client-profile-1', 180000, 65000, 32000, 21500);

INSERT INTO products (id, client_id, product_type, name, provider, status, details)
VALUES
    (
        'goal-1',
        'client-profile-1',
        'GOAL',
        'Emergency Fund',
        'RSF',
        'Active',
        '{"target_amount": 30000, "current_value": 15000, "start_date": "2026-01-01", "target_date": "2026-12-31"}'
    ),
    (
        'insurance-1',
        'client-profile-1',
        'INSURANCE',
        'Car Insurance',
        'Santam',
        'Active',
        '{"policy_number": "CAR-10001", "premium": 1200, "cover_amount": 350000}'
    );
