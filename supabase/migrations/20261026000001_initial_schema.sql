-- ============================================================================
-- MASALA FACTORY BUSINESS MANAGEMENT SYSTEM
-- MIGRATION: 20261026000001_initial_schema.sql
-- DESCRIPTION: Core PostgreSQL Database Schema, Constraints, Functions & RLS
-- ============================================================================

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. UTILITY FUNCTIONS
-- ============================================================================

-- Automatically update updated_at timestamps
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
  is_main BOOLEAN DEFAULT FALSE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL
);

CREATE TRIGGER trg_factories_updated_at
  BEFORE UPDATE ON public.factories
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_factories_code ON public.factories(code);
CREATE INDEX IF NOT EXISTS idx_factories_city ON public.factories(city);
CREATE INDEX IF NOT EXISTS idx_factories_status ON public.factories(status);

-- STRICT ENFORCEMENT: Block any DELETE attempt on factories at the database engine level
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

-- User-Factory Access Mapping Table (Multi-tenant authorization)
CREATE TABLE IF NOT EXISTS public.user_factories (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  factory_id UUID REFERENCES public.factories(id) ON DELETE RESTRICT,
  assigned_role VARCHAR(50) DEFAULT 'Operator' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
  PRIMARY KEY (user_id, factory_id)
);

-- Access Verification Function for RLS
CREATE OR REPLACE FUNCTION public.user_has_factory_access(target_factory_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND (p.is_global_admin = TRUE OR p.role = 'Factory Admin')
  ) OR EXISTS (
    SELECT 1 FROM public.user_factories uf
    WHERE uf.user_id = auth.uid() AND uf.factory_id = target_factory_id
  );
$$;

-- ============================================================================
-- 4. GLOBAL / SHARED MASTER TABLES
-- Shared across all factories with global visibility
-- ============================================================================

-- 4.1 Company Branding Profile
CREATE TABLE IF NOT EXISTS public.company_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL DEFAULT 'Masala Manufacturing & B2B Supply Factory',
  logo_url TEXT,
  address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL DEFAULT 'Multan',
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  tax_number VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL
);

CREATE TRIGGER trg_company_profiles_updated_at
  BEFORE UPDATE ON public.company_profiles
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- 4.2 Contact Parties (Customers, Suppliers, Both)
CREATE TABLE IF NOT EXISTS public.parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  company_name VARCHAR(255),
  phone VARCHAR(50) NOT NULL,
  whatsapp VARCHAR(50) NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  city VARCHAR(100) NOT NULL DEFAULT '',
  type VARCHAR(20) NOT NULL CHECK (type IN ('Customer', 'Supplier', 'Both')),
  notes TEXT,
  is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
  deleted_at TIMESTAMPTZ,
  deleted_by TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL
);

CREATE TRIGGER trg_parties_updated_at
  BEFORE UPDATE ON public.parties
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_parties_name ON public.parties(name);
CREATE INDEX IF NOT EXISTS idx_parties_type ON public.parties(type);
CREATE INDEX IF NOT EXISTS idx_parties_city ON public.parties(city);
CREATE INDEX IF NOT EXISTS idx_parties_deleted ON public.parties(is_deleted);

-- 4.3 Products Master Catalog
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  unit VARCHAR(50) DEFAULT 'KG' NOT NULL,
  default_rate NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (default_rate >= 0),
  stock_qty NUMERIC(12, 2) DEFAULT 0,
  description TEXT,
  is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
  deleted_at TIMESTAMPTZ,
  deleted_by TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL
);

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_deleted ON public.products(is_deleted);

-- ============================================================================
-- 5. FACTORY-SCOPED TRANSACTION TABLES
-- Scoped by factory_id with ON DELETE RESTRICT on factory relationships
-- ============================================================================

-- 5.1 Sales Bills
CREATE TABLE IF NOT EXISTS public.sales_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_id UUID REFERENCES public.factories(id) ON DELETE RESTRICT NOT NULL,
  bill_number VARCHAR(100) NOT NULL, -- Manually entered by user (e.g. B-1547)
  party_id UUID REFERENCES public.parties(id) ON DELETE RESTRICT NOT NULL,
  party_name VARCHAR(255) NOT NULL,
  party_phone VARCHAR(50) NOT NULL DEFAULT '',
  bill_date DATE NOT NULL,
  bill_time VARCHAR(10), -- Recorded transaction time (e.g. "14:30")
  grand_total NUMERIC(15, 2) NOT NULL CHECK (grand_total >= 0),
  received_amount NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (received_amount >= 0),
  remaining_amount NUMERIC(15, 2) NOT NULL CHECK (remaining_amount >= 0),
  status VARCHAR(30) NOT NULL CHECK (status IN ('Paid', 'Partially Paid', 'Unpaid')),
  proof_url TEXT,
  proof_status VARCHAR(30) DEFAULT 'Not Required' CHECK (proof_status IN ('Proof Attached', 'Proof Missing', 'Not Required')),
  notes TEXT,
  is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
  deleted_at TIMESTAMPTZ,
  deleted_by TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
  CONSTRAINT uq_factory_sales_bill_no UNIQUE (factory_id, bill_number)
);

CREATE TRIGGER trg_sales_bills_updated_at
  BEFORE UPDATE ON public.sales_bills
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_sales_bills_factory ON public.sales_bills(factory_id);
CREATE INDEX IF NOT EXISTS idx_sales_bills_party ON public.sales_bills(party_id);
CREATE INDEX IF NOT EXISTS idx_sales_bills_date ON public.sales_bills(bill_date);
CREATE INDEX IF NOT EXISTS idx_sales_bills_status ON public.sales_bills(status);
CREATE INDEX IF NOT EXISTS idx_sales_bills_deleted ON public.sales_bills(is_deleted);

-- Sales Bill Line Items
CREATE TABLE IF NOT EXISTS public.sales_bill_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID REFERENCES public.sales_bills(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT,
  product_name VARCHAR(255) NOT NULL,
  quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
  unit VARCHAR(50) DEFAULT 'KG' NOT NULL,
  rate NUMERIC(15, 2) NOT NULL CHECK (rate >= 0),
  line_total NUMERIC(15, 2) NOT NULL CHECK (line_total >= 0)
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
  amount_received NUMERIC(15, 2) NOT NULL CHECK (amount_received > 0),
  payment_date DATE NOT NULL,
  payment_time VARCHAR(10),
  payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('Cash', 'Bank Transfer', 'Cheque', 'Online Transfer', 'JazzCash', 'Easypaisa', 'Other')),
  reference_no VARCHAR(100),
  proof_url TEXT,
  proof_status VARCHAR(30) DEFAULT 'Not Required' CHECK (proof_status IN ('Proof Attached', 'Proof Missing', 'Not Required')),
  status VARCHAR(30) DEFAULT 'Completed' CHECK (status IN ('Completed', 'Pending', 'Reopened')),
  is_initial_payment BOOLEAN DEFAULT FALSE NOT NULL,
  notes TEXT,
  is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
  deleted_at TIMESTAMPTZ,
  deleted_by TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
  CONSTRAINT uq_factory_receipt_no UNIQUE (factory_id, receipt_number)
);

CREATE TRIGGER trg_payments_received_updated_at
  BEFORE UPDATE ON public.payments_received
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_payments_factory ON public.payments_received(factory_id);
CREATE INDEX IF NOT EXISTS idx_payments_party ON public.payments_received(party_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.payments_received(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_deleted ON public.payments_received(is_deleted);

-- Payment Allocations against Sales Invoices
CREATE TABLE IF NOT EXISTS public.payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES public.payments_received(id) ON DELETE CASCADE NOT NULL,
  bill_id UUID REFERENCES public.sales_bills(id) ON DELETE RESTRICT NOT NULL,
  bill_number VARCHAR(100) NOT NULL,
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_allocations_payment ON public.payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_allocations_bill ON public.payment_allocations(bill_id);

-- 5.3 Purchases (Raw Spice Inward)
CREATE TABLE IF NOT EXISTS public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_id UUID REFERENCES public.factories(id) ON DELETE RESTRICT NOT NULL,
  bill_number VARCHAR(100) NOT NULL, -- Supplier invoice reference, e.g. SUP-882
  supplier_id UUID REFERENCES public.parties(id) ON DELETE RESTRICT NOT NULL,
  supplier_name VARCHAR(255) NOT NULL,
  bill_date DATE NOT NULL,
  bill_time VARCHAR(10),
  due_date DATE NOT NULL,
  grand_total NUMERIC(15, 2) NOT NULL CHECK (grand_total >= 0),
  amount_paid NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  outstanding_amount NUMERIC(15, 2) NOT NULL CHECK (outstanding_amount >= 0),
  status VARCHAR(30) NOT NULL CHECK (status IN ('Paid', 'Partially Paid', 'Unpaid')),
  proof_url TEXT,
  proof_status VARCHAR(30) DEFAULT 'Not Required' CHECK (proof_status IN ('Proof Attached', 'Proof Missing', 'Not Required')),
  notes TEXT,
  is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
  deleted_at TIMESTAMPTZ,
  deleted_by TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
  CONSTRAINT uq_factory_purchase_no UNIQUE (factory_id, bill_number)
);

CREATE TRIGGER trg_purchases_updated_at
  BEFORE UPDATE ON public.purchases
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_purchases_factory ON public.purchases(factory_id);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON public.purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON public.purchases(bill_date);
CREATE INDEX IF NOT EXISTS idx_purchases_deleted ON public.purchases(is_deleted);

-- Purchase Items (Quantity must strictly be integer whole numbers per factory business rules)
CREATE TABLE IF NOT EXISTS public.purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID REFERENCES public.purchases(id) ON DELETE CASCADE NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit VARCHAR(50) DEFAULT 'KG' NOT NULL,
  rate NUMERIC(15, 2) NOT NULL CHECK (rate >= 0),
  line_total NUMERIC(15, 2) NOT NULL CHECK (line_total >= 0)
);

CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase ON public.purchase_items(purchase_id);

-- 5.4 Supplier Payments (Disbursements)
CREATE TABLE IF NOT EXISTS public.supplier_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_id UUID REFERENCES public.factories(id) ON DELETE RESTRICT NOT NULL,
  receipt_number VARCHAR(100) NOT NULL,
  supplier_id UUID REFERENCES public.parties(id) ON DELETE RESTRICT NOT NULL,
  supplier_name VARCHAR(255) NOT NULL,
  purchase_bill_id UUID REFERENCES public.purchases(id) ON DELETE RESTRICT NOT NULL,
  purchase_bill_number VARCHAR(100) NOT NULL,
  payment_date DATE NOT NULL,
  payment_time VARCHAR(10),
  amount_paid NUMERIC(15, 2) NOT NULL CHECK (amount_paid > 0),
  remaining_payable NUMERIC(15, 2) NOT NULL CHECK (remaining_payable >= 0),
  payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('Cash', 'Bank Transfer', 'Cheque', 'Online Transfer', 'JazzCash', 'Easypaisa', 'Other')),
  reference_no VARCHAR(100),
  proof_url TEXT,
  proof_status VARCHAR(30) DEFAULT 'Not Required' CHECK (proof_status IN ('Proof Attached', 'Proof Missing', 'Not Required')),
  notes TEXT,
  is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
  deleted_at TIMESTAMPTZ,
  deleted_by TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
  CONSTRAINT uq_factory_supp_payment_no UNIQUE (factory_id, receipt_number)
);

CREATE INDEX IF NOT EXISTS idx_supplier_payments_factory ON public.supplier_payments(factory_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_supplier ON public.supplier_payments(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_purchase ON public.supplier_payments(purchase_bill_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_deleted ON public.supplier_payments(is_deleted);

-- 5.5 Factory Operating Expenses (Segregated from supplier raw materials)
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_id UUID REFERENCES public.factories(id) ON DELETE RESTRICT NOT NULL,
  expense_number VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL CHECK (category IN ('Electricity', 'Gas', 'Salaries', 'Rent', 'Transport', 'Maintenance', 'Packaging', 'Fuel', 'Office Expenses', 'Machinery / Repairs', 'Other')),
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  expense_date DATE NOT NULL,
  expense_time VARCHAR(10),
  paid_to VARCHAR(255) NOT NULL,
  payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('Cash', 'Bank Transfer', 'Cheque', 'Online Transfer', 'JazzCash', 'Easypaisa', 'Other')),
  reference_no VARCHAR(100),
  proof_url TEXT,
  proof_status VARCHAR(30) DEFAULT 'Not Required' CHECK (proof_status IN ('Proof Attached', 'Proof Missing', 'Not Required')),
  notes TEXT,
  is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
  deleted_at TIMESTAMPTZ,
  deleted_by TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
  CONSTRAINT uq_factory_expense_no UNIQUE (factory_id, expense_number)
);

CREATE TRIGGER trg_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_expenses_factory ON public.expenses(factory_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_deleted ON public.expenses(is_deleted);

-- 5.6 Payment Schedules & Installment Milestones
CREATE TABLE IF NOT EXISTS public.payment_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_id UUID REFERENCES public.factories(id) ON DELETE RESTRICT NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('ToReceive', 'ToPay')),
  party_id UUID REFERENCES public.parties(id) ON DELETE RESTRICT NOT NULL,
  party_name VARCHAR(255) NOT NULL,
  party_phone VARCHAR(50),
  related_bill_number VARCHAR(100),
  due_date DATE NOT NULL,
  scheduled_amount NUMERIC(15, 2) NOT NULL CHECK (scheduled_amount > 0),
  paid_received_amount NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (paid_received_amount >= 0),
  remaining_amount NUMERIC(15, 2) NOT NULL CHECK (remaining_amount >= 0),
  status VARCHAR(30) NOT NULL CHECK (status IN ('Upcoming', 'Due Today', 'Overdue', 'Partially Paid', 'Completed')),
  parent_schedule_id UUID REFERENCES public.payment_schedules(id) ON DELETE CASCADE,
  installment_no INTEGER,
  notes TEXT,
  is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
  deleted_at TIMESTAMPTZ,
  deleted_by TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::TEXT, now()) NOT NULL
);

CREATE TRIGGER trg_payment_schedules_updated_at
  BEFORE UPDATE ON public.payment_schedules
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_schedules_factory ON public.payment_schedules(factory_id);
CREATE INDEX IF NOT EXISTS idx_schedules_party ON public.payment_schedules(party_id);
CREATE INDEX IF NOT EXISTS idx_schedules_due_date ON public.payment_schedules(due_date);
CREATE INDEX IF NOT EXISTS idx_schedules_status ON public.payment_schedules(status);
CREATE INDEX IF NOT EXISTS idx_schedules_deleted ON public.payment_schedules(is_deleted);

-- Installment breakdown sub-items
CREATE TABLE IF NOT EXISTS public.schedule_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES public.payment_schedules(id) ON DELETE CASCADE NOT NULL,
  installment_no INTEGER NOT NULL,
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  due_date DATE NOT NULL,
  paid_amount NUMERIC(15, 2) DEFAULT 0 CHECK (paid_amount >= 0),
  status VARCHAR(30) DEFAULT 'Upcoming' CHECK (status IN ('Upcoming', 'Due Today', 'Overdue', 'Partially Paid', 'Completed')),
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

-- Profiles Policies
CREATE POLICY "Profiles are readable by authenticated users"
  ON public.profiles FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Public lookup for username resolution"
  ON public.profiles FOR SELECT TO anon USING (TRUE);

-- Factories Policies (Select, Insert, Update ONLY - strictly NO DELETE)
CREATE POLICY "Factories are readable by authenticated users"
  ON public.factories FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Authorized staff can insert factories"
  ON public.factories FOR INSERT TO authenticated WITH CHECK (TRUE);

CREATE POLICY "Authorized staff can update factories"
  ON public.factories FOR UPDATE TO authenticated USING (TRUE);

-- User-Factories Mapping Policies
CREATE POLICY "User factory assignments are readable by authenticated users"
  ON public.user_factories FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Global admins can manage user factory assignments"
  ON public.user_factories FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_global_admin = TRUE));

-- Company Profile Policies
CREATE POLICY "Company profile is readable by authenticated users"
  ON public.company_profiles FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Authorized users can manage company profile"
  ON public.company_profiles FOR ALL TO authenticated USING (TRUE);

-- Parties Master Policies (Shared across factories)
CREATE POLICY "Parties are readable by authenticated users"
  ON public.parties FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Authorized users can insert/update parties"
  ON public.parties FOR ALL TO authenticated USING (TRUE);

-- Products Master Catalog Policies (Shared across factories)
CREATE POLICY "Products are readable by authenticated users"
  ON public.products FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Authorized users can insert/update products"
  ON public.products FOR ALL TO authenticated USING (TRUE);

-- Factory-Scoped Transaction Policies
-- 1. Sales Bills & Line Items
CREATE POLICY "Sales bills factory scoped read"
  ON public.sales_bills FOR SELECT TO authenticated
  USING (public.user_has_factory_access(factory_id));

CREATE POLICY "Sales bills factory scoped write"
  ON public.sales_bills FOR ALL TO authenticated
  USING (public.user_has_factory_access(factory_id))
  WITH CHECK (public.user_has_factory_access(factory_id));

CREATE POLICY "Sales items read via parent bill"
  ON public.sales_bill_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sales_bills sb WHERE sb.id = bill_id AND public.user_has_factory_access(sb.factory_id)));

CREATE POLICY "Sales items write via parent bill"
  ON public.sales_bill_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sales_bills sb WHERE sb.id = bill_id AND public.user_has_factory_access(sb.factory_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.sales_bills sb WHERE sb.id = bill_id AND public.user_has_factory_access(sb.factory_id)));

-- 2. Payments Received & Allocations
CREATE POLICY "Payments received factory scoped read"
  ON public.payments_received FOR SELECT TO authenticated
  USING (public.user_has_factory_access(factory_id));

CREATE POLICY "Payments received factory scoped write"
  ON public.payments_received FOR ALL TO authenticated
  USING (public.user_has_factory_access(factory_id))
  WITH CHECK (public.user_has_factory_access(factory_id));

CREATE POLICY "Payment allocations read via parent payment"
  ON public.payment_allocations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.payments_received pr WHERE pr.id = payment_id AND public.user_has_factory_access(pr.factory_id)));

CREATE POLICY "Payment allocations write via parent payment"
  ON public.payment_allocations FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.payments_received pr WHERE pr.id = payment_id AND public.user_has_factory_access(pr.factory_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.payments_received pr WHERE pr.id = payment_id AND public.user_has_factory_access(pr.factory_id)));

-- 3. Purchases & Purchase Items
CREATE POLICY "Purchases factory scoped read"
  ON public.purchases FOR SELECT TO authenticated
  USING (public.user_has_factory_access(factory_id));

CREATE POLICY "Purchases factory scoped write"
  ON public.purchases FOR ALL TO authenticated
  USING (public.user_has_factory_access(factory_id))
  WITH CHECK (public.user_has_factory_access(factory_id));

CREATE POLICY "Purchase items read via parent purchase"
  ON public.purchase_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.purchases p WHERE p.id = purchase_id AND public.user_has_factory_access(p.factory_id)));

CREATE POLICY "Purchase items write via parent purchase"
  ON public.purchase_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.purchases p WHERE p.id = purchase_id AND public.user_has_factory_access(p.factory_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.purchases p WHERE p.id = purchase_id AND public.user_has_factory_access(p.factory_id)));

-- 4. Supplier Payments
CREATE POLICY "Supplier payments factory scoped read"
  ON public.supplier_payments FOR SELECT TO authenticated
  USING (public.user_has_factory_access(factory_id));

CREATE POLICY "Supplier payments factory scoped write"
  ON public.supplier_payments FOR ALL TO authenticated
  USING (public.user_has_factory_access(factory_id))
  WITH CHECK (public.user_has_factory_access(factory_id));

-- 5. Operating Expenses
CREATE POLICY "Expenses factory scoped read"
  ON public.expenses FOR SELECT TO authenticated
  USING (public.user_has_factory_access(factory_id));

CREATE POLICY "Expenses factory scoped write"
  ON public.expenses FOR ALL TO authenticated
  USING (public.user_has_factory_access(factory_id))
  WITH CHECK (public.user_has_factory_access(factory_id));

-- 6. Payment Schedules & Installments
CREATE POLICY "Payment schedules factory scoped read"
  ON public.payment_schedules FOR SELECT TO authenticated
  USING (public.user_has_factory_access(factory_id));

CREATE POLICY "Payment schedules factory scoped write"
  ON public.payment_schedules FOR ALL TO authenticated
  USING (public.user_has_factory_access(factory_id))
  WITH CHECK (public.user_has_factory_access(factory_id));

CREATE POLICY "Schedule installments read via parent schedule"
  ON public.schedule_installments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.payment_schedules ps WHERE ps.id = schedule_id AND public.user_has_factory_access(ps.factory_id)));

CREATE POLICY "Schedule installments write via parent schedule"
  ON public.schedule_installments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.payment_schedules ps WHERE ps.id = schedule_id AND public.user_has_factory_access(ps.factory_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.payment_schedules ps WHERE ps.id = schedule_id AND public.user_has_factory_access(ps.factory_id)));

-- 7. Notifications
CREATE POLICY "Notifications scoped read"
  ON public.notifications FOR SELECT TO authenticated
  USING (factory_id IS NULL OR public.user_has_factory_access(factory_id));

CREATE POLICY "Notifications scoped write"
  ON public.notifications FOR ALL TO authenticated
  USING (factory_id IS NULL OR public.user_has_factory_access(factory_id))
  WITH CHECK (factory_id IS NULL OR public.user_has_factory_access(factory_id));
