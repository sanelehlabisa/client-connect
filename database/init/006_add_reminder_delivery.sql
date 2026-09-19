-- Record successful reminder deliveries so reloads do not send duplicates.

ALTER TABLE reminders
    ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ;
