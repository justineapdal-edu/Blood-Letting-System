CREATE TABLE IF NOT EXISTS form_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  spreadsheet_id VARCHAR(255) NOT NULL,
  sheet_url TEXT NOT NULL,
  table_name VARCHAR(255) NOT NULL UNIQUE,
  column_metadata JSONB NOT NULL DEFAULT '[]',
  active BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
