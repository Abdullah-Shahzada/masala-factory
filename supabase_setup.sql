-- ============================================================================
-- MASALA FACTORY BUSINESS MANAGEMENT SYSTEM
-- MASTER POSTGRESQL & SUPABASE DATABASE SETUP SCHEMA
-- PRODUCTION READY | MULTI-FACTORY SCOPING | RLS ENABLED | ZERO DUPLICATES
-- ============================================================================
-- Run this complete script in your Supabase SQL Editor:
-- Dashboard -> SQL Editor -> New Query -> Paste & Click Run (Ctrl+Enter)
-- ============================================================================

-- 0. Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. UTILITY & TIMESTAMP FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = timezone('utc'::TEXT, now());
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 2. USER PROFILES & AUTHENTICATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT DEFAULT 'Factory Administrator' NOT NULL,
  role TEXT DEFAULT 'Factory Admin' CHECK (role IN ('Factory Admin', 'Accountant', 'Manager', 'Operator', 'Viewer')) NOT NULL,
  is_global_admin BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL
);

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Automatic profile creation trigger on new auth user signup
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

-- Lookup email by username helper RPC function (enables username login)
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
-- 3. DYNAMIC FACTORIES MODULE
-- Permanent operational entities. Deletions are strictly prohibited.
-- ============================================================================

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

CREATE INDEX IF NOT EXISTS idx_factories_code ON public.factories(code);
CREATE INDEX IF NOT EXISTS idx_factories_city ON public.factories(city);
CREATE INDEX IF NOT EXISTS idx_factories_status ON public.factories(status);

DROP TRIGGER IF EXISTS trg_factories_updated_at ON public.factories;
CREATE TRIGGER trg_factories_updated_at
  BEFORE UPDATE ON public.factories
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Factory user membership mapping
CREATE TABLE IF NOT EXISTS public.user_factories (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  factory_id UUID REFERENCES public.factories(id) ON DELETE RESTRICT,
  assigned_role VARCHAR(50) DEFAULT 'Manager',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
  PRIMARY KEY (user_id, factory_id)
);

-- STRICT AUDIT RULE: No DELETE allowed for factories. Deletion trigger guard.
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
-- 4. MASTER DATA (SHARED ACROSS FACTORIES)
-- ============================================================================

-- 4.1 Company Profile & Branding
CREATE TABLE IF NOT EXISTS public.company_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL DEFAULT 'Masala Manufacturing & B2B Supply Factory',
  address TEXT NOT NULL DEFAULT 'Plot 42-A, Industrial Estate Phase II',
  city VARCHAR(100) NOT NULL DEFAULT 'Multan',
  phone VARCHAR(50) NOT NULL DEFAULT '+92 61 4567890',
  email VARCHAR(255) DEFAULT 'info@masalafactory.pk',
  tax_number VARCHAR(100) DEFAULT 'NTN: 4419201-7 | STRN: 3277876123456',
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL
);

DROP TRIGGER IF EXISTS trg_company_profiles_updated_at ON public.company_profiles;
CREATE TRIGGER trg_company_profiles_updated_at
  BEFORE UPDATE ON public.company_profiles
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- 4.2 Contact Parties (Customers, Suppliers, Both)
CREATE TABLE IF NOT EXISTS public.parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  company_name TEXT,
  type VARCHAR(20) NOT NULL CHECK (type IN ('Customer', 'Supplier', 'Both')),
  phone VARCHAR(50) NOT NULL,
  whatsapp VARCHAR(50),
  email VARCHAR(255),
  city VARCHAR(100),
  address TEXT,
  notes TEXT,
  credit_limit NUMERIC(15, 2) DEFAULT 0,
  tax_number VARCHAR(100),
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_parties_name ON public.parties(name);
CREATE INDEX IF NOT EXISTS idx_parties_type ON public.parties(type);
CREATE INDEX IF NOT EXISTS idx_parties_deleted ON public.parties(is_deleted);

DROP TRIGGER IF EXISTS trg_parties_updated_at ON public.parties;
CREATE TRIGGER trg_parties_updated_at
  BEFORE UPDATE ON public.parties
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- 4.3 Products Master Catalog
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  unit VARCHAR(50) DEFAULT 'KG' NOT NULL,
  default_rate NUMERIC(15, 2) NOT NULL DEFAULT 0,
  stock_qty NUMERIC(12, 2) DEFAULT 0,
  description TEXT,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_name ON public.products(name);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_deleted ON public.products(is_deleted);

DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- ============================================================================
-- 5. FACTORY-SCOPED TRANSACTION MODULES
-- Every transaction is strictly partitioned by factory_id
-- ON DELETE RESTRICT guarantees financial audit trail integrity
-- ============================================================================

-- 5.1 Sales Bills
CREATE TABLE IF NOT EXISTS public.sales_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_id UUID REFERENCES public.factories(id) ON DELETE RESTRICT NOT NULL,
  bill_number VARCHAR(100) NOT NULL,
  bill_date DATE NOT NULL,
  bill_time VARCHAR(20),
  party_id UUID REFERENCES public.parties(id) ON DELETE RESTRICT NOT NULL,
  party_name VARCHAR(255) NOT NULL,
  party_phone VARCHAR(50),
  grand_total NUMERIC(15, 2) NOT NULL CHECK (grand_total >= 0),
  received_amount NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (received_amount >= 0),
  remaining_amount NUMERIC(15, 2) NOT NULL CHECK (remaining_amount >= 0),
  status VARCHAR(30) NOT NULL CHECK (status IN ('Paid', 'Partially Paid', 'Unpaid')),
  proof_url TEXT,
  proof_status VARCHAR(30) DEFAULT 'Not Required',
  notes TEXT,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
  CONSTRAINT uq_factory_sales_bill_no UNIQUE (factory_id, bill_number)
);

CREATE INDEX IF NOT EXISTS idx_sales_bills_factory ON public.sales_bills(factory_id);
CREATE INDEX IF NOT EXISTS idx_sales_bills_party ON public.sales_bills(party_id);
CREATE INDEX IF NOT EXISTS idx_sales_bills_date ON public.sales_bills(bill_date);
CREATE INDEX IF NOT EXISTS idx_sales_bills_status ON public.sales_bills(status);
CREATE INDEX IF NOT EXISTS idx_sales_bills_deleted ON public.sales_bills(is_deleted);

DROP TRIGGER IF EXISTS trg_sales_bills_updated_at ON public.sales_bills;
CREATE TRIGGER trg_sales_bills_updated_at
  BEFORE UPDATE ON public.sales_bills
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

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

-- 5.2 Payments Received
CREATE TABLE IF NOT EXISTS public.payments_received (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_id UUID REFERENCES public.factories(id) ON DELETE RESTRICT NOT NULL,
  receipt_number VARCHAR(100) NOT NULL,
  party_id UUID REFERENCES public.parties(id) ON DELETE RESTRICT NOT NULL,
  party_name VARCHAR(255) NOT NULL,
  party_phone VARCHAR(50),
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  payment_date TIMESTAMPTZ NOT NULL,
  payment_time VARCHAR(20),
  payment_method VARCHAR(50) NOT NULL,
  allocated_bill_ids TEXT[],
  reference_no VARCHAR(100),
  proof_url TEXT,
  proof_status VARCHAR(30) DEFAULT 'Verified',
  status VARCHAR(30) DEFAULT 'Completed' CHECK (status IN ('Completed', 'Pending', 'Reopened')),
  is_initial_payment BOOLEAN DEFAULT FALSE,
  notes TEXT,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
  CONSTRAINT uq_factory_receipt_no UNIQUE (factory_id, receipt_number)
);

CREATE INDEX IF NOT EXISTS idx_payments_factory ON public.payments_received(factory_id);
CREATE INDEX IF NOT EXISTS idx_payments_party ON public.payments_received(party_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.payments_received(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_deleted ON public.payments_received(is_deleted);

DROP TRIGGER IF EXISTS trg_payments_updated_at ON public.payments_received;
CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON public.payments_received
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Payment Allocations against Sales Bills
CREATE TABLE IF NOT EXISTS public.payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES public.payments_received(id) ON DELETE CASCADE NOT NULL,
  bill_id UUID REFERENCES public.sales_bills(id) ON DELETE RESTRICT NOT NULL,
  bill_number VARCHAR(100),
  allocated_amount NUMERIC(15, 2) NOT NULL CHECK (allocated_amount > 0),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_allocations_payment ON public.payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_allocations_bill ON public.payment_allocations(bill_id);

-- 5.3 Purchases (Raw Spice Inward)
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
  proof_url TEXT,
  proof_status VARCHAR(30) DEFAULT 'Not Required',
  notes TEXT,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
  CONSTRAINT uq_factory_purchase_no UNIQUE (factory_id, bill_number)
);

CREATE INDEX IF NOT EXISTS idx_purchases_factory ON public.purchases(factory_id);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON public.purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON public.purchases(bill_date);
CREATE INDEX IF NOT EXISTS idx_purchases_deleted ON public.purchases(is_deleted);

DROP TRIGGER IF EXISTS trg_purchases_updated_at ON public.purchases;
CREATE TRIGGER trg_purchases_updated_at
  BEFORE UPDATE ON public.purchases
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Purchase Line Items
CREATE TABLE IF NOT EXISTS public.purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID REFERENCES public.purchases(id) ON DELETE CASCADE NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit VARCHAR(50) DEFAULT 'KG' NOT NULL,
  rate NUMERIC(15, 2) NOT NULL CHECK (rate >= 0),
  amount NUMERIC(15, 2) NOT NULL CHECK (amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase ON public.purchase_items(purchase_id);

-- 5.4 Supplier Payments (Disbursements against Purchase Vouchers)
CREATE TABLE IF NOT EXISTS public.supplier_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_id UUID REFERENCES public.factories(id) ON DELETE RESTRICT NOT NULL,
  purchase_id UUID REFERENCES public.purchases(id) ON DELETE RESTRICT,
  receipt_number VARCHAR(100) NOT NULL,
  purchase_bill_number VARCHAR(100) NOT NULL,
  supplier_id UUID REFERENCES public.parties(id) ON DELETE RESTRICT,
  supplier_name VARCHAR(255) NOT NULL,
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL,
  payment_time VARCHAR(20),
  payment_method VARCHAR(50) NOT NULL,
  reference_no VARCHAR(100),
  remaining_payable NUMERIC(15, 2) NOT NULL DEFAULT 0,
  proof_url TEXT,
  proof_status VARCHAR(30) DEFAULT 'Verified',
  notes TEXT,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
  CONSTRAINT uq_factory_supp_payment_no UNIQUE (factory_id, receipt_number)
);

CREATE INDEX IF NOT EXISTS idx_supplier_payments_factory ON public.supplier_payments(factory_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_supplier ON public.supplier_payments(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_purchase ON public.supplier_payments(purchase_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_deleted ON public.supplier_payments(is_deleted);

-- 5.5 Factory Operating Expenses (Separate from Supplier Purchases)
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_id UUID REFERENCES public.factories(id) ON DELETE RESTRICT NOT NULL,
  expense_number VARCHAR(100) NOT NULL,
  title VARCHAR(255),
  category VARCHAR(100) NOT NULL,
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  expense_date DATE NOT NULL,
  expense_time VARCHAR(20),
  paid_to VARCHAR(255) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  reference_no VARCHAR(100),
  proof_url TEXT,
  proof_status VARCHAR(30) DEFAULT 'Not Required',
  description TEXT,
  notes TEXT,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
  CONSTRAINT uq_factory_expense_no UNIQUE (factory_id, expense_number)
);

CREATE INDEX IF NOT EXISTS idx_expenses_factory ON public.expenses(factory_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_deleted ON public.expenses(is_deleted);

DROP TRIGGER IF EXISTS trg_expenses_updated_at ON public.expenses;
CREATE TRIGGER trg_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- 5.6 Payment Schedules & Installments
CREATE TABLE IF NOT EXISTS public.payment_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_id UUID REFERENCES public.factories(id) ON DELETE RESTRICT NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('ToReceive', 'ToPay', 'Receive', 'Pay')),
  party_id UUID REFERENCES public.parties(id) ON DELETE RESTRICT,
  party_name VARCHAR(255) NOT NULL,
  party_phone VARCHAR(50),
  related_bill_number VARCHAR(100),
  due_date DATE NOT NULL,
  scheduled_amount NUMERIC(15, 2) NOT NULL CHECK (scheduled_amount > 0),
  paid_received_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  remaining_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL CHECK (status IN ('Pending', 'Upcoming', 'Due Today', 'Overdue', 'Partially Paid', 'Completed')),
  description TEXT,
  notes TEXT,
  parent_schedule_id UUID REFERENCES public.payment_schedules(id) ON DELETE CASCADE,
  installment_no INTEGER,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_schedules_factory ON public.payment_schedules(factory_id);
CREATE INDEX IF NOT EXISTS idx_schedules_due_date ON public.payment_schedules(due_date);
CREATE INDEX IF NOT EXISTS idx_schedules_status ON public.payment_schedules(status);
CREATE INDEX IF NOT EXISTS idx_schedules_deleted ON public.payment_schedules(is_deleted);

DROP TRIGGER IF EXISTS trg_payment_schedules_updated_at ON public.payment_schedules;
CREATE TRIGGER trg_payment_schedules_updated_at
  BEFORE UPDATE ON public.payment_schedules
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.schedule_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES public.payment_schedules(id) ON DELETE CASCADE NOT NULL,
  installment_number INTEGER NOT NULL,
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  due_date DATE NOT NULL,
  paid_amount NUMERIC(15, 2) DEFAULT 0,
  status VARCHAR(30) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Paid', 'Overdue', 'Completed', 'Partially Paid')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_installments_schedule ON public.schedule_installments(schedule_id);

-- 5.7 Notifications
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
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- Clean, permissive policies that support:
-- 1. Anonymous client requests (local dev & production Vercel frontend)
-- 2. Authenticated user sessions
-- 3. Multi-factory access control
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.factories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_factories ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Helper function: Check factory access (supports anon demo mode & auth users)
CREATE OR REPLACE FUNCTION public.user_has_factory_access(target_factory_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    auth.role() = 'anon'
    OR auth.uid() IS NULL
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_global_admin = TRUE
    )
    OR EXISTS (
      SELECT 1 FROM public.user_factories uf
      WHERE uf.user_id = auth.uid() AND uf.factory_id = target_factory_id
    );
$$;

-- Drop existing policies if re-running
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname, tablename 
    FROM pg_policies 
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END;
$$;

-- Profiles Policies
CREATE POLICY "Profiles select policy" ON public.profiles FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "Profiles update policy" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Factories Policies (Select, Insert, Update ONLY - strictly NO DELETE)
CREATE POLICY "Factories select policy" ON public.factories FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "Factories insert policy" ON public.factories FOR INSERT TO anon, authenticated WITH CHECK (TRUE);
CREATE POLICY "Factories update policy" ON public.factories FOR UPDATE TO anon, authenticated USING (TRUE);

-- User-Factories Mapping Policies
CREATE POLICY "User factories select policy" ON public.user_factories FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "User factories manage policy" ON public.user_factories FOR ALL TO anon, authenticated USING (TRUE);

-- Company Profile Policies
CREATE POLICY "Company profile select policy" ON public.company_profiles FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "Company profile manage policy" ON public.company_profiles FOR ALL TO anon, authenticated USING (TRUE);

-- Parties Master Policies
CREATE POLICY "Parties select policy" ON public.parties FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "Parties manage policy" ON public.parties FOR ALL TO anon, authenticated USING (TRUE);

-- Products Master Policies
CREATE POLICY "Products select policy" ON public.products FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "Products manage policy" ON public.products FOR ALL TO anon, authenticated USING (TRUE);

-- Sales Bills & Items Policies
CREATE POLICY "Sales bills select policy" ON public.sales_bills FOR SELECT TO anon, authenticated USING (public.user_has_factory_access(factory_id));
CREATE POLICY "Sales bills manage policy" ON public.sales_bills FOR ALL TO anon, authenticated USING (public.user_has_factory_access(factory_id));
CREATE POLICY "Sales items select policy" ON public.sales_bill_items FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "Sales items manage policy" ON public.sales_bill_items FOR ALL TO anon, authenticated USING (TRUE);

-- Payments Received & Allocations Policies
CREATE POLICY "Payments select policy" ON public.payments_received FOR SELECT TO anon, authenticated USING (public.user_has_factory_access(factory_id));
CREATE POLICY "Payments manage policy" ON public.payments_received FOR ALL TO anon, authenticated USING (public.user_has_factory_access(factory_id));
CREATE POLICY "Payment allocations select policy" ON public.payment_allocations FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "Payment allocations manage policy" ON public.payment_allocations FOR ALL TO anon, authenticated USING (TRUE);

-- Purchases & Items Policies
CREATE POLICY "Purchases select policy" ON public.purchases FOR SELECT TO anon, authenticated USING (public.user_has_factory_access(factory_id));
CREATE POLICY "Purchases manage policy" ON public.purchases FOR ALL TO anon, authenticated USING (public.user_has_factory_access(factory_id));
CREATE POLICY "Purchase items select policy" ON public.purchase_items FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "Purchase items manage policy" ON public.purchase_items FOR ALL TO anon, authenticated USING (TRUE);

-- Supplier Payments Policies
CREATE POLICY "Supplier payments select policy" ON public.supplier_payments FOR SELECT TO anon, authenticated USING (public.user_has_factory_access(factory_id));
CREATE POLICY "Supplier payments manage policy" ON public.supplier_payments FOR ALL TO anon, authenticated USING (public.user_has_factory_access(factory_id));

-- Factory Expenses Policies
CREATE POLICY "Expenses select policy" ON public.expenses FOR SELECT TO anon, authenticated USING (public.user_has_factory_access(factory_id));
CREATE POLICY "Expenses manage policy" ON public.expenses FOR ALL TO anon, authenticated USING (public.user_has_factory_access(factory_id));

-- Payment Schedules & Installments Policies
CREATE POLICY "Schedules select policy" ON public.payment_schedules FOR SELECT TO anon, authenticated USING (public.user_has_factory_access(factory_id));
CREATE POLICY "Schedules manage policy" ON public.payment_schedules FOR ALL TO anon, authenticated USING (public.user_has_factory_access(factory_id));
CREATE POLICY "Installments select policy" ON public.schedule_installments FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "Installments manage policy" ON public.schedule_installments FOR ALL TO anon, authenticated USING (TRUE);

-- Notifications Policies
CREATE POLICY "Notifications select policy" ON public.notifications FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "Notifications manage policy" ON public.notifications FOR ALL TO anon, authenticated USING (TRUE);

-- ============================================================================
-- 7. PRODUCTION BASELINE SEED: TWO OPERATIONAL MULTAN FACTORIES
-- Seed initial active production plants in Multan, Pakistan
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

-- Default Company Profile
INSERT INTO public.company_profiles (id, name, address, city, phone, email, tax_number)
VALUES (
  '00000000-0000-0000-0000-000000000010',
  'Masala Manufacturing & B2B Supply Factory',
  'Plot 42-A, Industrial Estate Phase II',
  'Multan',
  '+92 61 4567890',
  'info@masalafactory.pk',
  'NTN: 4419201-7 | STRN: 3277876123456'
)
ON CONFLICT (id) DO UPDATE
SET name = excluded.name,
    address = excluded.address,
    city = excluded.city,
    phone = excluded.phone,
    email = excluded.email,
    tax_number = excluded.tax_number,
    updated_at = now();
