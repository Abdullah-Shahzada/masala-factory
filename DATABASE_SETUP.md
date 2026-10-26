# Supabase PostgreSQL Database Setup & Deployment Guide
## Masala Factory Business Management System — Dynamic Multi-Factory Architecture

---

## 1. Architectural Summary

The Masala Factory Business Management System runs on a **Dynamic Factory Architecture First, Database Schema Second** design pattern:

- **Dynamic, Configurable Factories**: Factories are not hardcoded. The application is seeded with two operational manufacturing plants in **Multan, Pakistan** (`MLT-01` Multan Main Processing Plant and `MLT-02` Multan South Milling Facility). The owner and administrators can add additional factories in any city across Pakistan (e.g., Karachi, Lahore, Faisalabad, Peshawar, Quetta, Gujranwala) at runtime without code changes.
- **Permanent Business Records**: In accordance with enterprise audit integrity, factory facilities **cannot be deleted** from the database or the application. If a facility suspends operations, its status can be toggled to `Inactive`. All historical sales invoices, purchase vouchers, receipts, payments, and ledger balances remain permanently preserved.
- **Database-Level Protection**:
  1. Foreign keys from all transaction tables to `factories(id)` enforce `ON DELETE RESTRICT`.
  2. A dedicated PostgreSQL engine trigger `trg_prevent_factory_deletion` rejects any `DELETE FROM public.factories` statement.
  3. Row Level Security (RLS) policies strictly omit `DELETE` operations on factories.
- **Factory-Scoped Isolation**:
  - **Scoped Data**: Sales Bills, Sales Line Items, Payments Received, Payment Allocations, Purchases, Purchase Items, Supplier Payments, Factory Operating Expenses, Payment Schedules, and Installments.
  - **Shared Global Data**: Contact Parties (customers/suppliers can interact with multiple factories), Products Master Catalog, and Company Branding Profile.

---

## 2. Directory Structure of Database Files

```
e:/lms/
├── supabase/
│   ├── migrations/
│   │   ├── 20261026000001_initial_schema.sql           <-- Core schema, tables, constraints, indexes & RLS
│   │   └── 20261026000002_initial_multan_factories.sql <-- Baseline production seed (2 Multan factories)
│   └── demo_seed.sql                                   <-- OPTIONAL sample dataset for testing/demo
├── .env.example                                        <-- Safe template for credentials
├── .gitignore                                          <-- Ensures .env and secrets are never committed
└── DATABASE_SETUP.md                                   <-- This setup & verification guide
```

---

## 3. Step-by-Step Deployment in Supabase

### Prerequisites
1. A Supabase account at [supabase.com](https://supabase.com).
2. A new or existing project in Supabase.
3. Access to the Supabase **SQL Editor** in your project dashboard.

---

### Step 1: Run Migration 1 — Core Schema & Security
1. In the Supabase Dashboard, select your project and click **SQL Editor** in the left sidebar.
2. Click **New query** (or press `Ctrl+N`).
3. Open [`supabase/migrations/20261026000001_initial_schema.sql`](file:///e:/lms/supabase/migrations/20261026000001_initial_schema.sql).
4. Copy the entire file contents, paste them into the SQL Editor, and click **Run** (or press `Ctrl+Enter`).
5. Verify that the output returns `Success. No rows returned`.

---

### Step 2: Run Migration 2 — Production Baseline Seed (Multan Factories)
1. Open a new query tab in the Supabase SQL Editor.
2. Open [`supabase/migrations/20261026000002_initial_multan_factories.sql`](file:///e:/lms/supabase/migrations/20261026000002_initial_multan_factories.sql).
3. Copy the entire file contents, paste them into the SQL Editor, and click **Run**.
4. Verify that two active factories located in **Multan, Pakistan** (`MLT-01` and `MLT-02`) and the default company profile are inserted.

---

### Step 3 (Optional): Run Demo Seed Data (Development / Demo ONLY)
> [!WARNING]
> Do NOT execute this step on a live production database. Use this script only for development, user acceptance testing (UAT), or feature demonstrations.

1. In the Supabase SQL Editor, open a new query tab.
2. Open [`supabase/demo_seed.sql`](file:///e:/lms/supabase/demo_seed.sql).
3. Copy the contents, paste them into the SQL Editor, and click **Run**.
4. This seeds sample customers, suppliers, spice products, sales bills, payments, and operating expenses.

---

### Step 4: Create the Authorized Administrator Account

1. In the Supabase Dashboard, click **Authentication** -> **Users** in the left sidebar.
2. Click **Add User** -> **Create User**.
3. Fill in the administrator credentials:
   - **Email**: `admin@masalafactory.pk`
   - **Password**: `[Your Secure Administrator Password]`
   - **Auto Confirm User**: Checked / Enabled (Yes)
4. Click **Create User**.
5. Switch to **SQL Editor** and run the following SQL query to link the profile and assign global administrator privileges:

```sql
INSERT INTO public.profiles (id, username, email, full_name, role, is_global_admin)
SELECT 
  id, 
  'admin', 
  'admin@masalafactory.pk', 
  'Factory Administrator', 
  'Factory Admin',
  TRUE
FROM auth.users 
WHERE email = 'admin@masalafactory.pk'
ON CONFLICT (id) DO UPDATE 
SET username = 'admin', 
    role = 'Factory Admin',
    is_global_admin = TRUE;
```

---

## 4. Verification & Integrity Checks

Run the following test queries in the Supabase SQL Editor to confirm that the database is configured according to all business rules:

### Verification Query 1: Verify Tables and RLS Status
```sql
SELECT 
  tablename, 
  rowsecurity AS rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
```
*Expected Result*: All 15 application tables (`company_profiles`, `expenses`, `factories`, `notifications`, `parties`, `payment_allocations`, `payment_schedules`, `payments_received`, `products`, `profiles`, `purchase_items`, `purchases`, `sales_bill_items`, `sales_bills`, `schedule_installments`, `supplier_payments`, `user_factories`) return `rls_enabled = true`.

---

### Verification Query 2: Verify Initial Multan Factories
```sql
SELECT 
  code, 
  name, 
  city, 
  status, 
  is_main 
FROM public.factories 
ORDER BY code;
```
*Expected Result*:
| code | name | city | status | is_main |
| :--- | :--- | :--- | :--- | :--- |
| `MLT-01` | Multan Main Processing Plant | Multan | Active | true |
| `MLT-02` | Multan South Milling Facility | Multan | Active | false |

---

### Verification Query 3: Test Factory Deletion Prevention (Must Fail)
```sql
-- This query MUST fail with a PostgreSQL exception
DELETE FROM public.factories WHERE code = 'MLT-01';
```
*Expected Error*:
```
ERROR: Permanent Business Architecture: Factories cannot be deleted from the database. Set status to Inactive instead.
```

---

### Verification Query 4: Verify Multi-Factory User Access Helper Function
```sql
-- Check that the RLS helper function exists and is valid
SELECT routine_name, routine_type, security_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' AND routine_name = 'user_has_factory_access';
```
*Expected Result*: Returns `routine_name = user_has_factory_access` with `security_type = DEFINER`.

---

## 5. Frontend Environment Configuration

1. In the Supabase Dashboard, navigate to **Project Settings** -> **API**.
2. Find your **Project URL** and **Project API Key** (`anon` / `public`).
3. In the root directory of this repository (`e:/lms/`), create a `.env` file based on `.env.example`:

```env
# Masala Factory Business Management System
# Supabase Production / Staging Credentials
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> [!CAUTION]
> - **NEVER** use the `service_role` secret key in the frontend `.env` file or anywhere in clientside code. The `service_role` key bypasses all Row Level Security policies.
> - The `.gitignore` file is configured to strictly exclude `.env` from Git commits.

4. Start the application:
```bash
cmd /c "npm run dev"
```
The application will automatically detect Supabase credentials and switch from local mock data mode to Supabase authenticated cloud mode.

---

## 6. Migration Guide from Legacy Schemas

If upgrading a pre-existing database that used a hardcoded `branches` table or `branch_id` columns, execute the following non-destructive migration in Supabase SQL Editor:

```sql
-- Step A: Rename legacy branches table to factories if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'branches') THEN
    ALTER TABLE public.branches RENAME TO factories;
  END IF;
END $$;

-- Step B: Safely rename legacy branch_id columns to factory_id
DO $$
BEGIN
  -- Sales Bills
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales_bills' AND column_name = 'branch_id') THEN
    ALTER TABLE public.sales_bills RENAME COLUMN branch_id TO factory_id;
  END IF;
  -- Payments Received
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments_received' AND column_name = 'branch_id') THEN
    ALTER TABLE public.payments_received RENAME COLUMN branch_id TO factory_id;
  END IF;
  -- Purchases
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchases' AND column_name = 'branch_id') THEN
    ALTER TABLE public.purchases RENAME COLUMN branch_id TO factory_id;
  END IF;
  -- Expenses
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'branch_id') THEN
    ALTER TABLE public.expenses RENAME COLUMN branch_id TO factory_id;
  END IF;
  -- Payment Schedules
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_schedules' AND column_name = 'branch_id') THEN
    ALTER TABLE public.payment_schedules RENAME COLUMN branch_id TO factory_id;
  END IF;
END $$;

-- Step C: Update legacy branch cities to Multan
UPDATE public.factories SET city = 'Multan' WHERE city IN ('Lahore', 'Karachi');
```
