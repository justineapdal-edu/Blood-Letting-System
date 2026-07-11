ALTER TABLE form_connections ADD COLUMN IF NOT EXISTS token VARCHAR(255);
CREATE UNIQUE INDEX IF NOT EXISTS idx_form_connections_token ON form_connections (token) WHERE token IS NOT NULL;
