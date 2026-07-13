-- Blood Donor Admin Portal - Supabase Schema
-- Run this in the Supabase SQL Editor or via supabase db push

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Form Connections table (central registry for all data sources)
CREATE TABLE IF NOT EXISTS form_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  token VARCHAR(255),
  spreadsheet_id VARCHAR(255) NOT NULL DEFAULT '',
  sheet_url TEXT NOT NULL DEFAULT '',
  table_name VARCHAR(255) NOT NULL UNIQUE,
  column_metadata JSONB NOT NULL DEFAULT '[]',
  active BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique index for tokens (only one active connection per token)
CREATE UNIQUE INDEX IF NOT EXISTS idx_form_connections_token 
  ON form_connections (token) WHERE token IS NOT NULL;

-- Index for quick lookups by table_name
CREATE INDEX IF NOT EXISTS idx_form_connections_table_name 
  ON form_connections (table_name);

-- Index for listing active connections
CREATE INDEX IF NOT EXISTS idx_form_connections_active 
  ON form_connections (active) WHERE active = true;

-- Row Level Security (RLS) policies
-- For now, we'll use service_role key for all operations
-- This means RLS is bypassed when using the service_role key
-- You can add more restrictive policies later if needed

ALTER TABLE form_connections ENABLE ROW LEVEL SECURITY;

-- Allow all operations with service_role key (bypasses RLS)
CREATE POLICY "Service role can do everything" ON form_connections
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Allow read access with anon key (for frontend)
CREATE POLICY "Anyone can read active connections" ON form_connections
  FOR SELECT
  USING (active = true);

-- Function to create dynamic tables for donor records
CREATE OR REPLACE FUNCTION create_donor_table(table_name TEXT, columns JSONB)
RETURNS VOID AS $$
DECLARE
  col RECORD;
  create_sql TEXT;
BEGIN
  -- Start with base columns
  create_sql := format(
    'CREATE TABLE IF NOT EXISTS %I (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      submitted_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )',
    table_name
  );
  
  EXECUTE create_sql;
  
  -- Add dynamic columns
  FOR col IN SELECT * FROM jsonb_array_elements_text(columns)
  LOOP
    EXECUTE format(
      'ALTER TABLE %I ADD COLUMN IF NOT EXISTS %I TEXT',
      table_name,
      col
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to upsert donor records
CREATE OR REPLACE FUNCTION upsert_donor_record(
  table_name TEXT,
  record_data JSONB,
  submitted_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  record_id UUID;
  col_name TEXT;
  col_value TEXT;
  insert_sql TEXT;
  columns_sql TEXT;
  values_sql TEXT;
  first BOOLEAN := true;
BEGIN
  -- Generate a new UUID for this record
  record_id := gen_random_uuid();
  
  -- Build column and value lists from JSONB
  columns_sql := 'id';
  values_sql := quote_literal(record_id::TEXT);
  
  FOR col_name, col_value IN SELECT * FROM jsonb_each_text(record_data)
  LOOP
    columns_sql := columns_sql || ', ' || quote_ident(col_name);
    values_sql := values_sql || ', ' || quote_literal(col_value);
  END LOOP;
  
  -- Add submitted_at if provided
  IF submitted_at IS NOT NULL THEN
    columns_sql := columns_sql || ', submitted_at';
    values_sql := values_sql || ', ' || quote_literal(submitted_at::TEXT);
  END IF;
  
  -- Execute the insert
  insert_sql := format(
    'INSERT INTO %I (%s) VALUES (%s) RETURNING id',
    table_name,
    columns_sql,
    values_sql
  );
  
  EXECUTE insert_sql INTO record_id;
  
  RETURN record_id;
END;
$$ LANGUAGE plpgsql;

-- Function to check if a table exists
CREATE OR REPLACE FUNCTION check_table_exists(p_table_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = p_table_name
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get table columns (excluding system columns)
CREATE OR REPLACE FUNCTION get_table_columns(p_table_name TEXT)
RETURNS TABLE (column_name TEXT, data_type TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT c.column_name::TEXT, c.data_type::TEXT
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
  AND c.table_name = p_table_name
  AND c.column_name NOT IN ('id', 'created_at', 'submitted_at')
  ORDER BY c.ordinal_position;
END;
$$ LANGUAGE plpgsql;

-- Function to execute SQL (for dynamic operations)
CREATE OR REPLACE FUNCTION exec_sql(sql_query TEXT)
RETURNS VOID AS $$
BEGIN
  EXECUTE sql_query;
END;
$$ LANGUAGE plpgsql;

-- Function to safely query any table (for the DataGrid)
CREATE OR REPLACE FUNCTION query_table(
  table_name TEXT,
  search_term TEXT DEFAULT NULL,
  sort_column TEXT DEFAULT NULL,
  sort_direction TEXT DEFAULT 'asc',
  page_limit INTEGER DEFAULT 50,
  page_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  data JSONB,
  total_count BIGINT
) AS $$
DECLARE
  where_clause TEXT := '';
  order_clause TEXT := '';
  count_sql TEXT;
  query_sql TEXT;
  rec RECORD;
  result JSONB := '[]'::JSONB;
  total BIGINT;
BEGIN
  -- Build WHERE clause for search
  IF search_term IS NOT NULL AND search_term != '' THEN
    where_clause := format(
      ' WHERE EXISTS (
        SELECT 1 FROM jsonb_each(to_jsonb(%I.*)) 
        WHERE value::TEXT ILIKE %L 
        AND key NOT IN (''id'', ''created_at'', ''submitted_at'')
      )',
      table_name,
      '%' || search_term || '%'
    );
  END IF;
  
  -- Build ORDER BY clause
  IF sort_column IS NOT NULL AND sort_column != '' THEN
    order_clause := format(
      ' ORDER BY %I %s',
      sort_column,
      CASE WHEN sort_direction = 'desc' THEN 'DESC' ELSE 'ASC' END
    );
  ELSE
    order_clause := ' ORDER BY created_at DESC';
  END IF;
  
  -- Get total count
  count_sql := format(
    'SELECT COUNT(*) FROM %I%s',
    table_name,
    where_clause
  );
  EXECUTE count_sql INTO total;
  
  -- Get paginated data
  query_sql := format(
    'SELECT to_jsonb(%I.*) as row FROM %I%s%s LIMIT %s OFFSET %s',
    table_name,
    table_name,
    where_clause,
    order_clause,
    page_limit,
    page_offset
  );
  
  FOR rec IN EXECUTE query_sql
  LOOP
    result := result || jsonb_build_array(rec.row);
  END LOOP;
  
  RETURN QUERY SELECT result, total;
END;
$$ LANGUAGE plpgsql;
