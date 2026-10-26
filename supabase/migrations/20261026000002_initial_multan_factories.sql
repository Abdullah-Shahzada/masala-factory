-- ============================================================================
-- MASALA FACTORY BUSINESS MANAGEMENT SYSTEM
-- MIGRATION: 20261026000002_initial_multan_factories.sql
-- DESCRIPTION: Baseline Production Seed Data — Two Multan Factories & Company Profile
-- ============================================================================

-- 1. Insert Initial Company Branding Profile
INSERT INTO public.company_profiles (
  id,
  name,
  address,
  city,
  phone,
  email,
  tax_number
) VALUES (
  '00000000-0000-0000-0000-000000000010',
  'Masala Manufacturing & B2B Supply Factory',
  'Plot 42-A, Industrial Estate Phase II',
  'Multan',
  '+92 61 4567890',
  'info@masalafactory.pk',
  'NTN: 4419201-7 | STRN: 3277876123456'
) ON CONFLICT (id) DO UPDATE
SET name = excluded.name,
    address = excluded.address,
    city = excluded.city,
    phone = excluded.phone,
    email = excluded.email,
    tax_number = excluded.tax_number,
    updated_at = timezone('utc'::TEXT, now());

-- 2. Insert The Two Initial Operational Factories in Multan, Pakistan
-- Both factories are located in Multan, Pakistan with configurable details.
-- The business owner can add further factories in any city (Karachi, Lahore, etc.) at runtime.

INSERT INTO public.factories (
  id,
  code,
  name,
  city,
  address,
  phone,
  email,
  status,
  is_main,
  notes
) VALUES 
  (
    '00000000-0000-0000-0000-000000000001',
    'MLT-01',
    'Multan Main Processing Plant',
    'Multan',
    'Plot 42-A, Industrial Estate Phase II, Multan, Punjab',
    '+92 61 4567890',
    'plant1.multan@masalafactory.pk',
    'Active',
    TRUE,
    'Central whole-spice milling, precision grinding, and industrial packaging unit.'
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'MLT-02',
    'Multan South Milling Facility',
    'Multan',
    'Plot 18-B, Shershah Bypass Road, Multan, Punjab',
    '+92 61 7890123',
    'milling.south@masalafactory.pk',
    'Active',
    FALSE,
    'High-volume pulverization, raw turmeric curing, and bulk distribution warehouse.'
  )
ON CONFLICT (code) DO UPDATE
SET name = excluded.name,
    city = excluded.city,
    address = excluded.address,
    phone = excluded.phone,
    email = excluded.email,
    status = excluded.status,
    notes = excluded.notes,
    updated_at = timezone('utc'::TEXT, now());
