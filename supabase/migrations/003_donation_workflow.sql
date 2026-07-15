-- Donation screening & check-in workflow
-- Run this in the Supabase SQL Editor or via supabase db push

create type donation_status_type as enum ('pending', 'passed', 'failed');

alter table donor_registrations
  add column arrived boolean default false,
  add column donation_status donation_status_type default 'pending';
