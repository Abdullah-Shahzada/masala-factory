-- ============================================================================
-- MASALA FACTORY BUSINESS MANAGEMENT SYSTEM
-- OPTIONAL DEMO & TEST DATASET (NON-PRODUCTION)
-- FILE: supabase/demo_seed.sql
-- ============================================================================
-- CAUTION: Run this script ONLY in development, staging, or demonstration
-- environments. Do NOT run this in a live production database.
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Loading optional demo dataset for development & testing...';
END $$;

-- 1. Demo Contact Parties (Customers and Suppliers)
INSERT INTO public.parties (id, name, company_name, phone, whatsapp, address, city, type, notes)
VALUES
  (
    '10000000-0000-0000-0000-000000000001',
    'Muhammad Usman',
    'Al-Madina Spice Mart',
    '03001234567',
    '03001234567',
    'Shop 14, Grain Market, Ghalla Mandi',
    'Multan',
    'Customer',
    'Key wholesale retail distributor in Southern Punjab.'
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    'Tariq Mehmood',
    'Punjab Super Store',
    '03217654321',
    '03217654321',
    'Main Bazaar, Cantt',
    'Multan',
    'Customer',
    'Retail chain branch; weekly credit terms.'
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    'Haji Abdul Rasheed',
    'Bismillah Whole Spice Importers',
    '03339876543',
    '03339876543',
    'Jodia Bazaar, South Port Link',
    'Karachi',
    'Supplier',
    'Primary raw whole chilli and cumin seed importer.'
  ),
  (
    '10000000-0000-0000-0000-000000000004',
    'Farhan Akhtar',
    'Pak Agro Mills & Spices',
    '03451122334',
    '03451122334',
    'Circular Road, Old City',
    'Lahore',
    'Both',
    'Provides raw coriander seeds and purchases packaged garam masala.'
  )
ON CONFLICT (id) DO NOTHING;

-- 2. Demo Products Catalog
INSERT INTO public.products (id, name, category, unit, default_rate, stock_qty, description)
VALUES
  ('20000000-0000-0000-0000-000000000001', 'Red Chilli Powder (Lal Mirch)', 'Ground Spices', 'KG', 1250.00, 450, 'Premium Grade-A fine ground Dandicut red chilli'),
  ('20000000-0000-0000-0000-000000000002', 'Turmeric Powder (Haldi)', 'Ground Spices', 'KG', 950.00, 320, 'Pure Kasur turmeric ground with zero additives'),
  ('20000000-0000-0000-0000-000000000003', 'Garam Masala Special', 'Special Blends', 'KG', 2200.00, 180, '14-ingredient traditional royal aromatic blend'),
  ('20000000-0000-0000-0000-000000000004', 'Coriander Powder (Dhaniya)', 'Ground Spices', 'KG', 800.00, 500, 'Roasted whole coriander slow-ground'),
  ('20000000-0000-0000-0000-000000000005', 'Biryani Masala Blend', 'Recipe Mixes', 'KG', 1850.00, 210, 'Complete Karachi & Sindhi style restaurant formula'),
  ('20000000-0000-0000-0000-000000000006', 'Black Pepper Powder (Kali Mirch)', 'Ground Spices', 'KG', 3400.00, 95, 'Steam-sterilized lampong bold black pepper')
ON CONFLICT (id) DO NOTHING;

-- 3. Demo Sales Bills
INSERT INTO public.sales_bills (
  id,
  factory_id,
  bill_number,
  party_id,
  party_name,
  party_phone,
  bill_date,
  bill_time,
  grand_total,
  received_amount,
  remaining_amount,
  status,
  proof_status,
  notes
) VALUES
  (
    '30000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001', -- Multan Main Processing Plant
    'B-1540',
    '10000000-0000-0000-0000-000000000001',
    'Al-Madina Spice Mart',
    '03001234567',
    CURRENT_DATE - INTERVAL '5 days',
    '10:30',
    56500.00,
    30000.00,
    26500.00,
    'Partially Paid',
    'Proof Attached',
    'Wholesale dispatch order #42'
  ),
  (
    '30000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000002', -- Multan South Milling Facility
    'B-1541',
    '10000000-0000-0000-0000-000000000002',
    'Punjab Super Store',
    '03217654321',
    CURRENT_DATE - INTERVAL '2 days',
    '14:15',
    44000.00,
    44000.00,
    0.00,
    'Paid',
    'Proof Attached',
    'Direct pickup from South warehouse'
  )
ON CONFLICT (factory_id, bill_number) DO NOTHING;

-- 4. Demo Sales Bill Items
INSERT INTO public.sales_bill_items (bill_id, product_id, product_name, quantity, unit, rate, line_total)
VALUES
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Red Chilli Powder (Lal Mirch)', 25, 'KG', 1250.00, 31250.00),
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', 'Garam Masala Special', 10, 'KG', 2200.00, 22000.00),
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000004', 'Coriander Powder (Dhaniya)', 4, 'KG', 812.50, 3250.00),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000003', 'Garam Masala Special', 20, 'KG', 2200.00, 44000.00)
ON CONFLICT DO NOTHING;

-- 5. Demo Payments Received
INSERT INTO public.payments_received (
  id,
  factory_id,
  receipt_number,
  party_id,
  party_name,
  party_phone,
  amount_received,
  payment_date,
  payment_time,
  payment_method,
  reference_no,
  status,
  is_initial_payment,
  proof_status,
  notes
) VALUES
  (
    '40000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'REC-8801',
    '10000000-0000-0000-0000-000000000001',
    'Al-Madina Spice Mart',
    '03001234567',
    30000.00,
    CURRENT_DATE - INTERVAL '4 days',
    '11:00',
    'Bank Transfer',
    'HBL-TRX-994821',
    'Completed',
    FALSE,
    'Proof Attached',
    'Partial online transfer against Bill B-1540'
  ),
  (
    '40000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000002',
    'REC-8802',
    '10000000-0000-0000-0000-000000000002',
    'Punjab Super Store',
    '03217654321',
    44000.00,
    CURRENT_DATE - INTERVAL '2 days',
    '14:20',
    'Cash',
    'CASH-COUNTER-02',
    'Completed',
    TRUE,
    'Proof Attached',
    'Full settlement on delivery for B-1541'
  )
ON CONFLICT (factory_id, receipt_number) DO NOTHING;

-- 6. Demo Payment Allocations
INSERT INTO public.payment_allocations (payment_id, bill_id, bill_number, amount)
VALUES
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'B-1540', 30000.00),
  ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', 'B-1541', 44000.00)
ON CONFLICT DO NOTHING;

-- 7. Demo Purchases (Raw Materials)
INSERT INTO public.purchases (
  id,
  factory_id,
  bill_number,
  supplier_id,
  supplier_name,
  bill_date,
  bill_time,
  due_date,
  grand_total,
  amount_paid,
  outstanding_amount,
  status,
  proof_status,
  notes
) VALUES
  (
    '50000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'SUP-882',
    '10000000-0000-0000-0000-000000000003',
    'Bismillah Whole Spice Importers',
    CURRENT_DATE - INTERVAL '10 days',
    '09:00',
    CURRENT_DATE + INTERVAL '10 days',
    120000.00,
    50000.00,
    70000.00,
    'Partially Paid',
    'Proof Attached',
    'Raw whole Dandicut red chilli shipment #71'
  )
ON CONFLICT (factory_id, bill_number) DO NOTHING;

-- 8. Demo Purchase Items (Quantity strictly whole integers)
INSERT INTO public.purchase_items (purchase_id, product_name, quantity, unit, rate, line_total)
VALUES
  ('50000000-0000-0000-0000-000000000001', 'Raw Dandicut Red Chilli', 150, 'KG', 800.00, 120000.00)
ON CONFLICT DO NOTHING;

-- 9. Demo Factory Operating Expenses (Segregated from Raw Purchases)
INSERT INTO public.expenses (
  id,
  factory_id,
  expense_number,
  title,
  category,
  amount,
  expense_date,
  expense_time,
  paid_to,
  payment_method,
  reference_no,
  proof_status,
  notes
) VALUES
  (
    '60000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'EXP-401',
    'Monthly Industrial Three-Phase Electricity Bill',
    'Electricity',
    48500.00,
    CURRENT_DATE - INTERVAL '3 days',
    '12:00',
    'MEPCO Multan Electric',
    'Online Transfer',
    'MEPCO-ONLINE-55829',
    'Proof Attached',
    'Processing Plant Phase II meter #9921'
  ),
  (
    '60000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000002',
    'EXP-402',
    'Pulverizer Mill Blade Maintenance & Sharpening',
    'Machinery / Repairs',
    16500.00,
    CURRENT_DATE - INTERVAL '1 day',
    '16:30',
    'Khawaja Engineering Works',
    'Cash',
    'CASH-VOUCH-882',
    'Proof Attached',
    'Mill unit 2 blade precision grinding & balancing'
  )
ON CONFLICT (factory_id, expense_number) DO NOTHING;

-- 10. Demo Payment Schedule & Installments
INSERT INTO public.payment_schedules (
  id,
  factory_id,
  type,
  party_id,
  party_name,
  party_phone,
  related_bill_number,
  due_date,
  scheduled_amount,
  paid_received_amount,
  remaining_amount,
  status,
  notes
) VALUES
  (
    '70000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'ToReceive',
    '10000000-0000-0000-0000-000000000001',
    'Al-Madina Spice Mart',
    '03001234567',
    'B-1540',
    CURRENT_DATE + INTERVAL '5 days',
    26500.00,
    0.00,
    26500.00,
    'Upcoming',
    'Balance collection milestone for bill B-1540'
  )
ON CONFLICT DO NOTHING;

INSERT INTO public.notifications (factory_id, title, message, type, read)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'Payment Due Soon',
    'Al-Madina Spice Mart has an upcoming receivable milestone of Rs. 26,500 due in 5 days.',
    'info',
    FALSE
  );
