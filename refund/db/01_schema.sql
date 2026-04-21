CREATE TABLE IF NOT EXISTS refunds (
    id          SERIAL PRIMARY KEY,
    purchase_id VARCHAR(255) NOT NULL UNIQUE,
    user_id     VARCHAR(255) NOT NULL,
    refunded_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refunds_userid ON refunds (user_id);