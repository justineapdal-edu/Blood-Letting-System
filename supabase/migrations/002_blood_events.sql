-- Blood Events & Donor Registrations
-- Run this in the Supabase SQL Editor or via supabase db push

-- Blood Events table
CREATE TABLE IF NOT EXISTS blood_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  location TEXT NOT NULL,
  custom_form_schema JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_blood_events_event_date ON blood_events (event_date);
CREATE INDEX IF NOT EXISTS idx_blood_events_created_at ON blood_events (created_at DESC);

-- Donor Registrations table
CREATE TABLE IF NOT EXISTS donor_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES blood_events(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  blood_type TEXT NOT NULL,
  custom_form_responses JSONB NOT NULL DEFAULT '{}'::jsonb,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_donor_registrations_event_id ON donor_registrations (event_id);
CREATE INDEX IF NOT EXISTS idx_donor_registrations_registered_at ON donor_registrations (registered_at DESC);
CREATE INDEX IF NOT EXISTS idx_donor_registrations_email ON donor_registrations (email);

-- Enable RLS
ALTER TABLE blood_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE donor_registrations ENABLE ROW LEVEL SECURITY;

-- blood_events policies
-- Service role bypasses RLS (default behavior)
-- Anyone (anon) can read events (public events are meant to be visible)
CREATE POLICY "Public can read events" ON blood_events
  FOR SELECT USING (true);

-- Authenticated users can create events
CREATE POLICY "Authenticated users can create events" ON blood_events
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Authenticated users can update their own events
CREATE POLICY "Authenticated users can update own events" ON blood_events
  FOR UPDATE USING (auth.uid() = created_by);

-- Authenticated users can delete their own events
CREATE POLICY "Authenticated users can delete own events" ON blood_events
  FOR DELETE USING (auth.uid() = created_by);

-- donor_registrations policies
-- Anon can ONLY insert (no SELECT, no UPDATE, no DELETE)
CREATE POLICY "Public can register for events" ON donor_registrations
  FOR INSERT WITH CHECK (true);

-- Authenticated users can read all registrations (for admin dashboard)
CREATE POLICY "Authenticated users can read registrations" ON donor_registrations
  FOR SELECT USING (auth.role() = 'authenticated');

-- Authenticated users can update registrations
CREATE POLICY "Authenticated users can update registrations" ON donor_registrations
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Authenticated users can delete registrations
CREATE POLICY "Authenticated users can delete registrations" ON donor_registrations
  FOR DELETE USING (auth.role() = 'authenticated');
