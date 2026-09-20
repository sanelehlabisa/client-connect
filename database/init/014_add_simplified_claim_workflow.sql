-- Keep the demo claim workflow to Client preferences and mock provider picks.

ALTER TABLE insurance_requests
    ADD COLUMN IF NOT EXISTS preferred_assessment_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS preferred_repair_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS selected_assessor_id VARCHAR(40)
        REFERENCES marketplace_providers(id),
    ADD COLUMN IF NOT EXISTS assessor_selected_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS selected_repairer_id VARCHAR(40)
        REFERENCES marketplace_providers(id),
    ADD COLUMN IF NOT EXISTS repairer_selected_at TIMESTAMPTZ;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'insurance_requests_preferred_dates_ordered'
          AND conrelid = 'insurance_requests'::regclass
    ) THEN
        ALTER TABLE insurance_requests
            ADD CONSTRAINT insurance_requests_preferred_dates_ordered
            CHECK (
                preferred_assessment_at IS NULL
                OR preferred_repair_at IS NULL
                OR preferred_repair_at > preferred_assessment_at
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'insurance_requests_assessor_selection_complete'
          AND conrelid = 'insurance_requests'::regclass
    ) THEN
        ALTER TABLE insurance_requests
            ADD CONSTRAINT insurance_requests_assessor_selection_complete
            CHECK (
                (selected_assessor_id IS NULL)
                = (assessor_selected_at IS NULL)
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'insurance_requests_repairer_selection_complete'
          AND conrelid = 'insurance_requests'::regclass
    ) THEN
        ALTER TABLE insurance_requests
            ADD CONSTRAINT insurance_requests_repairer_selection_complete
            CHECK (
                (selected_repairer_id IS NULL)
                = (repairer_selected_at IS NULL)
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'insurance_requests_repairer_follows_assessor'
          AND conrelid = 'insurance_requests'::regclass
    ) THEN
        ALTER TABLE insurance_requests
            ADD CONSTRAINT insurance_requests_repairer_follows_assessor
            CHECK (
                selected_repairer_id IS NULL
                OR selected_assessor_id IS NOT NULL
            );
    END IF;
END $$;

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
        'provider-assessor-east-rand',
        'East Rand Vehicle Assessors',
        'Assessor',
        ARRAY['Motor Assessment', 'Damage Report'],
        4.6,
        'Johannesburg',
        -26.177050,
        28.226910,
        TRUE,
        NULL
    ),
    (
        'provider-repairer-midrand',
        'Midrand Motor Works',
        'Repairer',
        ARRAY['Motor Repair', 'Panel Beating'],
        4.7,
        'Johannesburg',
        -25.999180,
        28.126290,
        TRUE,
        NULL
    )
ON CONFLICT (id) DO NOTHING;
