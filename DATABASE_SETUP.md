# Supabase PostgreSQL Database Setup & Vercel Deployment Guide
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

## 2. Directory Structure of Database & Deployment Files

```
e:/lms/
├── supabase_setup.sql                                  <-- All-in-one Master SQL Script (Tables + Constraints + RLS + Seed)
├── supabase/
│   ├── migrations/
│   │   ├── 20261026000001_initial_schema.sql           <-- Core schema, tables, constraints, indexes & RLS
│   │   └── 20261026000002_initial_multan_factories.sql <-- Baseline production seed (2 Multan factories)
│   └── demo_seed.sql                                   <-- OPTIONAL sample dataset for testing/demo
├── vercel.json                                         <-- Vercel SPA routing and caching rules
├── .env.example                                        <-- Safe template for credentials
├── .gitignore                                          <-- Ensures .env and secrets are never committed
└── DATABASE_SETUP.md                                   <-- This setup & deployment guide
```

---

## 3. Step-by-Step Deployment in Supabase

### Quick Method: Run Master Script in Supabase (Recommended)

1. Log into your Supabase Dashboard at [supabase.com](https://supabase.com).
2. Select your project (**Masala Factory Project**).
3. In the left navigation menu, click **SQL Editor**.
4. Click **New query** (or press `Ctrl+N`).
5. Open [`supabase_setup.sql`](file:///e:/lms/supabase_setup.sql) in your project root.
6. Copy all contents and paste into the Supabase SQL Editor.
7. Click the green **Run** button (or press `Ctrl+Enter`).
8. The console will display: `Success. No rows returned`. All tables, triggers, indexes, RLS policies, and initial Multan factories are now deployed!

---

## 4. Supabase Connection Credentials

Set your credentials in `.env` for local development, and in **Vercel Project Settings -> Environment Variables** for production:

```env
# Supabase Project URL (base URL or with /rest/v1/ - automatically sanitized)
VITE_SUPABASE_URL=https://deobjwbngwhipysjtief.supabase.co

# Supabase Anon / Publishable Key
VITE_SUPABASE_ANON_KEY=sb_publishable_s1u1q5LawJmBwl2VioslFQ_X6SNhFT1
```

---

## 5. Deploying to Vercel (Step-by-Step)

The project is completely configured for zero-configuration Vercel deployment:

### Step 1: Push Code to GitHub
All code is maintained on branch `main` at:
`https://github.com/muhaimin786/masala-factory.git`

### Step 2: Import into Vercel
1. Log into [vercel.com](https://vercel.com).
2. Click **Add New...** -> **Project**.
3. Select your GitHub repository: `muhaimin786/masala-factory`.
4. Configure Project Settings:
   - **Framework Preset**: `Vite` (automatically detected)
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### Step 3: Configure Environment Variables in Vercel
Under the **Environment Variables** section, add the following two variables:
1. `VITE_SUPABASE_URL` = `https://deobjwbngwhipysjtief.supabase.co`
2. `VITE_SUPABASE_ANON_KEY` = `sb_publishable_s1u1q5LawJmBwl2VioslFQ_X6SNhFT1`

### Step 4: Click Deploy
Vercel will run `tsc && vite build`, bundle assets with chunk optimization, and deploy your live URL.
Thanks to [`vercel.json`](file:///e:/lms/vercel.json), all single-page application (SPA) client routes (`/sales`, `/purchases`, `/expenses`, `/parties`, `/reports`, `/settings`) will reload without 404 errors.
