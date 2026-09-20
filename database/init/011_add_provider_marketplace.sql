-- Seed the provider marketplace used by deterministic matching demos.

CREATE TABLE IF NOT EXISTS marketplace_providers (
    id VARCHAR(40) PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    provider_type VARCHAR(40) NOT NULL CHECK (
        provider_type IN (
            'Financial Adviser',
            'Financial Institution',
            'Assessor',
            'Repairer'
        )
    ),
    services TEXT[] NOT NULL DEFAULT '{}',
    rating NUMERIC(2, 1) NOT NULL CHECK (rating BETWEEN 0 AND 5),
    location VARCHAR(120) NOT NULL,
    latitude NUMERIC(9, 6),
    longitude NUMERIC(9, 6),
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    adviser_user_id VARCHAR(40) REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (
        provider_type = 'Financial Adviser'
        OR adviser_user_id IS NULL
    )
);

CREATE INDEX IF NOT EXISTS marketplace_providers_matching_idx
    ON marketplace_providers (provider_type, is_available, rating DESC);

CREATE TABLE IF NOT EXISTS marketplace_products (
    id VARCHAR(40) PRIMARY KEY,
    provider_id VARCHAR(40) NOT NULL REFERENCES marketplace_providers(id),
    name VARCHAR(160) NOT NULL,
    product_type VARCHAR(30) NOT NULL CHECK (
        product_type IN ('Insurance', 'Investment', 'Savings')
    ),
    summary TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS marketplace_products_provider_idx
    ON marketplace_products (provider_id, product_type);

INSERT INTO marketplace_providers (
    id,
    name,
    provider_type,
    services,
    rating,
    location,
    latitude,
    longitude,
    is_available,
    adviser_user_id
) VALUES
    (
        'provider-adviser-royal-square',
        'Royal Square Financial - Wilson Masuku',
        'Financial Adviser',
        ARRAY['Financial Planning', 'Insurance Advice', 'Investment Advice'],
        4.9,
        'Johannesburg',
        -26.204103,
        28.047305,
        TRUE,
        'adviser-1'
    ),
    (
        'provider-adviser-ubuntu',
        'Ubuntu Wealth Advisers',
        'Financial Adviser',
        ARRAY['Financial Planning', 'Investment Advice', 'Retirement Planning'],
        4.7,
        'Pretoria',
        -25.747868,
        28.229271,
        TRUE,
        NULL
    ),
    (
        'provider-adviser-cape',
        'Cape Independent Advice',
        'Financial Adviser',
        ARRAY['Insurance Advice', 'Retirement Planning'],
        4.8,
        'Cape Town',
        -33.924870,
        18.424055,
        FALSE,
        NULL
    ),
    (
        'provider-institution-sanlam',
        'Sanlam',
        'Financial Institution',
        ARRAY['Insurance', 'Investment', 'Savings'],
        4.6,
        'South Africa',
        NULL,
        NULL,
        TRUE,
        NULL
    ),
    (
        'provider-institution-allan-gray',
        'Allan Gray',
        'Financial Institution',
        ARRAY['Investment', 'Savings'],
        4.8,
        'South Africa',
        NULL,
        NULL,
        TRUE,
        NULL
    ),
    (
        'provider-assessor-gauteng',
        'Gauteng Auto Assessors',
        'Assessor',
        ARRAY['Motor Assessment'],
        4.7,
        'Johannesburg',
        -26.195246,
        28.034088,
        TRUE,
        NULL
    ),
    (
        'provider-assessor-north',
        'Northern Claims Assessors',
        'Assessor',
        ARRAY['Motor Assessment', 'Damage Report'],
        4.5,
        'Pretoria',
        -25.754549,
        28.231448,
        TRUE,
        NULL
    ),
    (
        'provider-repairer-sandton',
        'Sandton Panelbeaters',
        'Repairer',
        ARRAY['Motor Repair', 'Panel Beating'],
        4.8,
        'Johannesburg',
        -26.107567,
        28.056702,
        TRUE,
        NULL
    ),
    (
        'provider-repairer-pretoria',
        'Pretoria Auto Body',
        'Repairer',
        ARRAY['Motor Repair', 'Paint Repair'],
        4.6,
        'Pretoria',
        -25.746111,
        28.188056,
        TRUE,
        NULL
    )
ON CONFLICT (id) DO NOTHING;

INSERT INTO marketplace_products (
    id,
    provider_id,
    name,
    product_type,
    summary
) VALUES
    (
        'market-product-sanlam-life',
        'provider-institution-sanlam',
        'Sanlam Life Cover',
        'Insurance',
        'Flexible life cover for individuals and families.'
    ),
    (
        'market-product-sanlam-savings',
        'provider-institution-sanlam',
        'Sanlam Goal Saver',
        'Savings',
        'A simple savings product for medium-term financial goals.'
    ),
    (
        'market-product-allan-gray-investment',
        'provider-institution-allan-gray',
        'Allan Gray Balanced Investment',
        'Investment',
        'A diversified long-term investment option.'
    )
ON CONFLICT (id) DO NOTHING;
