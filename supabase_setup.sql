-- ============================================================================
-- MASALA FACTORY BUSINESS MANAGEMENT SYSTEM
-- COMPLETE POSTGRESQL & SUPABASE DATABASE SETUP SCHEMA
-- DYNAMIC FACTORY ARCHITECTURE FIRST, DATABASE SCHEMA SECOND
-- ============================================================================
-- Run this script in the Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- to deploy the dynamic factory architecture, transaction tables, multi-factory
-- scoping, foreign keys with ON DELETE RESTRICT, and Row Level Security (RLS).
-- ============================================================================

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. PROFILES & AUTHENTICATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT DEFAULT 'Factory Administrator',
  role TEXT DEFAULT 'Factory Admin' CHECK (role IN ('Factory Admin', 'Accountant', 'Manager', 'Viewer')),
  is_global_admin BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read profiles"
  ON public.profiles FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Allow users to update own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Allow public lookup for username resolution"
  ON public.profiles FOR SELECT TO anon USING (TRUE);

-- Trigger to create profile when a new user signs up in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_username TEXT;
  v_full_name TEXT;
BEGIN
  v_username := coalesce(
    new.raw_user_meta_data->>'username',
    split_part(new.email, '@', 1)
  );
  v_full_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    'Factory Administrator'
  );

  INSERT INTO public.profiles (id, username, email, full_name, role, is_global_admin)
  VALUES (new.id, lower(v_username), lower(new.email), v_full_name, 'Factory Admin', TRUE)
  ON CONFLICT (id) DO UPDATE
  SET username = excluded.username,
      email = excluded.email,
      full_name = excluded.full_name;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Lookup email by username helper RPC function
CREATE OR REPLACE FUNCTION public.lookup_email_by_username(p_username TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_email TEXT;
BEGIN
  SELECT email INTO v_email
  FROM public.profiles
  WHERE lower(username) = lower(trim(p_username))
  LIMIT 1;

  RETURN v_email;
END;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_email_by_username(TEXT) TO anon, authenticated;

-- ============================================================================
-- 2. DYNAMIC FACTORIES MODULE
-- ============================================================================
-- Permanent operational entities. Deletions are strictly prohibited.
-- Status can be toggled between 'Active' and 'Inactive'.

CREATE TABLE IF NOT EXISTS public.factories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  address TEXT NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')) NOT NULL,
  is_main BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL
);

-- Index for rapid factory code and city lookups
CREATE INDEX IF NOT EXISTS idx_factories_code ON public.factories(code);
CREATE INDEX IF NOT EXISTS idx_factories_city ON public.factories(city);
CREATE INDEX IF NOT EXISTS idx_factories_status ON public.factories(status);

-- Factory user membership mapping (Multi-tenant/multi-factory scoping)
CREATE TABLE IF NOT EXISTS public.user_factories (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  factory_id UUID REFERENCES public.factories(id) ON DELETE RESTRICT,
  assigned_role VARCHAR(50) DEFAULT 'Manager',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
  PRIMARY KEY (user_id, factory_id)
);

ALTER TABLE public.factories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_factories ENABLE ROW LEVEL SECURITY;

-- Factory RLS: Authenticated users can view all active and assigned factories
CREATE POLICY "Allow authenticated users to read factories"
  ON public.factories FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Allow authorized staff to insert factories"
  ON public.factories FOR INSERT TO authenticated WITH CHECK (TRUE);

CREATE POLICY "Allow authorized staff to update factories"
  ON public.factories FOR UPDATE TO authenticated USING (TRUE);

-- STRICT RULE: No DELETE policy exists for factories.
-- Deletion is prevented at both the RLS policy and foreign-key constraint levels.
CREATE OR REPLACE FUNCTION public.prevent_factory_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Permanent Business Architecture: Factories cannot be deleted from the database. Set status to Inactive instead.';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_factory_deletion ON public.factories;
CREATE TRIGGER trg_prevent_factory_deletion
  BEFORE DELETE ON public.factories
  FOR EACH ROW EXECUTE PROCEDURE public.prevent_factory_deletion();

-- ============================================================================
-- 3. GLOBAL / SHARED MASTER TABLES
-- ============================================================================

-- Company profile & branding
CREATE TABLE IF NOT EXISTS public.company_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL DEFAULT 'Masala Manufacturing & B2B Supply Factory',
  address TEXT NOT NULL DEFAULT 'Plot 42-A, Industrial Estate Phase II',
  city VARCHAR(100) NOT NULL DEFAULT 'Multan',
  phone VARCHAR(50) NOT NULL DEFAULT '+92 61 4567890',
  email VARCHAR(255) NOT NULL DEFAULT 'info@masalafactory.pk',
  tax_number VARCHAR(100) DEFAULT 'NTN: 4419201-7 | STRN: 3277876123456',
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL
);

-- Contact Parties (Customers, Suppliers, Both) - Shared across all factories
CREATE TABLE IF NOT EXISTS public.parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('Customer', 'Supplier', 'Both')),
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  city VARCHAR(100),
  address TEXT,
  credit_limit NUMERIC(15, 2) DEFAULT 0,
  tax_number VARCHAR(100),
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_parties_name ON public.parties(name);
CREATE INDEX IF NOT EXISTS idx_parties_type ON public.parties(type);
CREATE INDEX IF NOT EXISTS idx_parties_deleted ON public.parties(is_deleted);

-- Products Master Catalog - Shared across factories
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  unit VARCHAR(50) DEFAULT 'KG' NOT NULL,
  default_rate NUMERIC(15, 2) NOT NULL DEFAULT 0,
  description TEXT,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL
);

-- ============================================================================
-- 4. FACTORY-SCOPED TRANSACTION MODULES
-- Every transaction is strictly partitioned by factory_id
-- ON DELETE RESTRICT guarantees historical financial integrity
-- ============================================================================

-- 4.1 Sales Bills
CREATE TABLE IF NOT EXISTS public.sales_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_id UUID REFERENCES public.factories(id) ON DELETE RESTRICT NOT NULL,
  bill_number VARCHAR(100) NOT NULL,
  bill_date DATE NOT NULL,
  party_id UUID REFERENCES public.parties(id) ON DELETE RESTRICT NOT NULL,
  party_name VARCHAR(255) NOT NULL,
  party_phone VARCHAR(50),
  grand_total NUMERIC(15, 2) NOT NULL CHECK (grand_total >= 0),
  received_amount NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (received_amount >= 0),
  remaining_amount NUMERIC(15, 2) NOT NULL CHECK (remaining_amount >= 0),
  status VARCHAR(30) NOT NULL CHECK (status IN ('Paid', 'Partially Paid', 'Unpaid')),
  notes TEXT,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
  CONSTRAINT uq_factory_sales_bill_no UNIQUE (factory_id, bill_number)
);

CREATE INDEX IF NOT EXISTS idx_sales_bills_factory ON public.sales_bills(factory_id);
CREATE INDEX IF NOT EXISTS idx_sales_bills_party ON public.sales_bills(party_id);
CREATE INDEX IF NOT EXISTS idx_sales_bills_date ON public.sales_bills(bill_date);
CREATE INDEX IF NOT EXISTS idx_sales_bills_status ON public.sales_bills(status);

-- Sales Bill Line Items
CREATE TABLE IF NOT EXISTS public.sales_bill_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID REFERENCES public.sales_bills(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT,
  product_name VARCHAR(255) NOT NULL,
  quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
  unit VARCHAR(50) DEFAULT 'KG' NOT NULL,
  rate NUMERIC(15, 2) NOT NULL CHECK (rate >= 0),
  amount NUMERIC(15, 2) NOT NULL CHECK (amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_sales_items_bill ON public.sales_bill_items(bill_id);

-- 4.2 Payments Received
CREATE TABLE IF NOT EXISTS public.payments_received (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_id UUID REFERENCES public.factories(id) ON DELETE RESTRICT NOT NULL,
  receipt_number VARCHAR(100) NOT NULL,
  party_id UUID REFERENCES public.parties(id) ON DELETE RESTRICT NOT NULL,
  party_name VARCHAR(255) NOT NULL,
  party_phone VARCHAR(50),
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  payment_date TIMESTAMPTZ NOT NULL,
  payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('Cash', 'Bank Transfer', 'Cheque', 'Online')),
  reference_no VARCHAR(100),
  notes TEXT,
  proof_url TEXT,
  proof_status VARCHAR(30) DEFAULT 'Verified',
  status VARCHAR(30) DEFAULT 'Completed' CHECK (status IN ('Completed', 'Pending')),
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
  CONSTRAINT uq_factory_receipt_no UNIQUE (factory_id, receipt_number)
);

CREATE INDEX IF NOT EXISTS idx_payments_factory ON public.payments_received(factory_id);
CREATE INDEX IF NOT EXISTS idx_payments_party ON public.payments_received(party_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.payments_received(payment_date);

-- Payment Allocations against Sales Invoices
CREATE TABLE IF NOT EXISTS public.payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES public.payments_received(id) ON DELETE CASCADE NOT NULL,
  bill_id UUID REFERENCES public.sales_bills(id) ON DELETE RESTRICT NOT NULL,
  allocated_amount NUMERIC(15, 2) NOT NULL CHECK (allocated_amount > 0),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_allocations_payment ON public.payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_allocations_bill ON public.payment_allocations(bill_id);

-- 4.3 Purchases (Raw Spice Inward)
CREATE TABLE IF NOT EXISTS public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_id UUID REFERENCES public.factories(id) ON DELETE RESTRICT NOT NULL,
  bill_number VARCHAR(100) NOT NULL,
  bill_date DATE NOT NULL,
  supplier_id UUID REFERENCES public.parties(id) ON DELETE RESTRICT NOT NULL,
  supplier_name VARCHAR(255) NOT NULL,
  grand_total NUMERIC(15, 2) NOT NULL CHECK (grand_total >= 0),
  paid_amount NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  outstanding_amount NUMERIC(15, 2) NOT NULL CHECK (outstanding_amount >= 0),
  status VARCHAR(30) NOT NULL CHECK (status IN ('Paid', 'Partially Paid', 'Unpaid')),
  notes TEXT,
  proof_url TEXT,
  proof_status VARCHAR(30) DEFAULT 'Not Required',
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
  CONSTRAINT uq_factory_purchase_no UNIQUE (factory_id, bill_number)
);

CREATE INDEX IF NOT EXISTS idx_purchases_factory ON public.purchases(factory_id);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON public.purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON public.purchases(bill_date);

-- Purchase Items
CREATE TABLE IF NOT EXISTS public.purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID REFERENCES public.purchases(id) ON DELETE CASCADE NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0), -- Whole integers required
  unit VARCHAR(50) DEFAULT 'KG' NOT NULL,
  rate NUMERIC(15, 2) NOT NULL CHECK (rate >= 0),
  amount NUMERIC(15, 2) NOT NULL CHECK (amount >= 0)
);

-- Supplier Payments
CREATE TABLE IF NOT EXISTS public.supplier_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_id UUID REFERENCES public.factories(id) ON DELETE RESTRICT NOT NULL,
  purchase_id UUID REFERENCES public.purchases(id) ON DELETE RESTRICT NOT NULL,
  receipt_number VARCHAR(100) NOT NULL,
  purchase_bill_number VARCHAR(100) NOT NULL,
  supplier_id UUID REFERENCES public.parties(id) ON DELETE RESTRICT NOT NULL,
  supplier_name VARCHAR(255) NOT NULL,
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL,
  payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('Cash', 'Bank Transfer', 'Cheque', 'Online')),
  reference_no VARCHAR(100),
  notes TEXT,
  proof_url TEXT,
  proof_status VARCHAR(30) DEFAULT 'Verified',
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
  CONSTRAINT uq_factory_supp_payment_no UNIQUE (factory_id, receipt_number)
);

-- 4.4 Factory Operating Expenses (Separate from Supplier Purchases)
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_id UUID REFERENCES public.factories(id) ON DELETE RESTRICT NOT NULL,
  expense_number VARCHAR(100) NOT NULL,
  category VARCHAR(100) NOT NULL,
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  expense_date DATE NOT NULL,
  paid_to VARCHAR(255) NOT NULL,
  payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('Cash', 'Bank Transfer', 'Cheque', 'Online')),
  description TEXT,
  proof_url TEXT,
  proof_status VARCHAR(30) DEFAULT 'Not Required',
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
  CONSTRAINT uq_factory_expense_no UNIQUE (factory_id, expense_number)
);

CREATE INDEX IF NOT EXISTS idx_expenses_factory ON public.expenses(factory_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(expense_date);

-- 4.5 Payment Schedules & Installment Milestones
CREATE TABLE IF NOT EXISTS public.payment_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_id UUID REFERENCES public.factories(id) ON DELETE RESTRICT NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('Receive', 'Pay')),
  party_id UUID REFERENCES public.parties(id) ON DELETE RESTRICT NOT NULL,
  party_name VARCHAR(255) NOT NULL,
  party_phone VARCHAR(50),
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  due_date DATE NOT NULL,
  description TEXT,
  status VARCHAR(30) NOT NULL CHECK (status IN ('Pending', 'Due Today', 'Overdue', 'Completed')),
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.schedule_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES public.payment_schedules(id) ON DELETE CASCADE NOT NULL,
  installment_number INTEGER NOT NULL,
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  due_date DATE NOT NULL,
  status VARCHAR(30) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Paid', 'Overdue')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL
);

-- 4.6 Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_id UUID REFERENCES public.factories(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('warning', 'info', 'alert', 'success')),
  read BOOLEAN DEFAULT FALSE NOT NULL,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_factory ON public.notifications(factory_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES FOR ALL TABLES
-- ============================================================================

ALTER TABLE public.company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_bill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments_received ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_installments ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if current authenticated user has access to a factory
CREATE OR REPLACE FUNCTION public.user_has_factory_access(target_factory_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.is_global_admin = TRUE
  ) OR EXISTS (
    SELECT 1 FROM public.user_factories uf
    WHERE uf.user_id = auth.uid() AND uf.factory_id = target_factory_id
  );
$$;

-- Global read policies for authenticated users
CREATE POLICY "Auth read company profiles" ON public.company_profiles FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Auth read parties" ON public.parties FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Auth read products" ON public.products FOR SELECT TO authenticated USING (TRUE);

-- Factory-scoped policies
CREATE POLICY "Factory scoped sales read" ON public.sales_bills FOR SELECT TO authenticated
  USING (public.user_has_factory_access(factory_id));

CREATE POLICY "Factory scoped sales write" ON public.sales_bills FOR ALL TO authenticated
  USING (public.user_has_factory_access(factory_id))
  WITH CHECK (public.user_has_factory_access(factory_id));

CREATE POLICY "Factory scoped payments read" ON public.payments_received FOR SELECT TO authenticated
  USING (public.user_has_factory_access(factory_id));

CREATE POLICY "Factory scoped payments write" ON public.payments_received FOR ALL TO authenticated
  USING (public.user_has_factory_access(factory_id))
  WITH CHECK (public.user_has_factory_access(factory_id));

CREATE POLICY "Factory scoped purchases read" ON public.purchases FOR SELECT TO authenticated
  USING (public.user_has_factory_access(factory_id));

CREATE POLICY "Factory scoped purchases write" ON public.purchases FOR ALL TO authenticated
  USING (public.user_has_factory_access(factory_id))
  WITH CHECK (public.user_has_factory_access(factory_id));

CREATE POLICY "Factory scoped expenses read" ON public.expenses FOR SELECT TO authenticated
  USING (public.user_has_factory_access(factory_id));

CREATE POLICY "Factory scoped expenses write" ON public.expenses FOR ALL TO authenticated
  USING (public.user_has_factory_access(factory_id))
  WITH CHECK (public.user_has_factory_access(factory_id));

CREATE POLICY "Factory scoped schedules read" ON public.payment_schedules FOR SELECT TO authenticated
  USING (public.user_has_factory_access(factory_id));

CREATE POLICY "Factory scoped schedules write" ON public.payment_schedules FOR ALL TO authenticated
  USING (public.user_has_factory_access(factory_id))
  WITH CHECK (public.user_has_factory_access(factory_id));

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Notifications scoped read" ON public.notifications FOR SELECT TO authenticated
  USING (factory_id IS NULL OR public.user_has_factory_access(factory_id));

CREATE POLICY "Notifications scoped write" ON public.notifications FOR ALL TO authenticated
  USING (factory_id IS NULL OR public.user_has_factory_access(factory_id))
  WITH CHECK (factory_id IS NULL OR public.user_has_factory_access(factory_id));

-- ============================================================================
-- 6. SEED DATA: TWO INITIAL MULTAN FACTORIES
-- Both factories located in Multan, Pakistan with configurable details
-- ============================================================================

INSERT INTO public.factories (id, code, name, city, address, phone, email, status, is_main, notes)
VALUES 
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
    updated_at = now();

-- Initial Company Branding Profile
INSERT INTO public.company_profiles (name, address, city, phone, email, tax_number)
VALUES (
  'Masala Manufacturing & B2B Supply Factory',
  'Plot 42-A, Industrial Estate Phase II',
  'Multan',
  '+92 61 4567890',
  'info@masalafactory.pk',
  'NTN: 4419201-7 | STRN: 3277876123456'
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 7. MIGRATION INSTRUCTIONS FROM LEGACY STATIC BRANCHES TO DYNAMIC FACTORIES
-- ============================================================================
-- If upgrading from a previous schema with a static 'branches' table or branch_id:
--
-- ALTER TABLE IF EXISTS public.branches RENAME TO factories;
-- ALTER TABLE IF EXISTS public.sales_bills RENAME COLUMN branch_id TO factory_id;
-- ALTER TABLE IF EXISTS public.payments_received RENAME COLUMN branch_id TO factory_id;
-- ALTER TABLE IF EXISTS public.purchases RENAME COLUMN branch_id TO factory_id;
-- ALTER TABLE IF EXISTS public.expenses RENAME COLUMN branch_id TO factory_id;
-- ALTER TABLE IF EXISTS public.payment_schedules RENAME COLUMN branch_id TO factory_id;
--
-- UPDATE public.factories SET city = 'Multan' WHERE city IN ('Lahore', 'Karachi');
-- ============================================================================
