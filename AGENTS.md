# AGENTS.md — Masala Factory Business Management System

## Project Identity & Context
* **System Name**: Masala Factory Business Management System
* **Domain**: B2B Spices & Masala Manufacturing & Supply Factory (3 Branches)
* **Currency**: Pakistani Rupee (PKR / Rs.)
* **Current Phase**: Frontend-Only Interactive Demo (No real backend / Supabase yet)

## Tech Stack Guidelines
* **Framework**: React 18 / 19 + TypeScript + Vite
* **Styling**: Tailwind CSS, Lucide Icons, Glassmorphism & Modern B2B UI Design System
* **Routing**: React Router v6 / v7
* **Charts**: Recharts / Chart.js
* **PDF / Export**: jsPDF + html2canvas / Client-side Printable Document Engine
* **State Management**: React Context / Local State + Mock Data Repository pattern

## Mandatory Architecture & Coding Rules
1. **Frontend Only Scope**: Do NOT connect Supabase, external APIs, or real auth in this phase.
2. **Preserve Demo Integrity**: Keep mock database services decoupled with clean interfaces so backend integration (Supabase) can be plugged in easily in the future without rewriting UI components.
3. **Strict Math & Balance Calculations**:
   - Bill line items total = `Quantity * Rate`
   - Bill Grand Total = `Sum(Line Items)`
   - Bill Balance = `Grand Total - Received Amount`
   - Payment allocation must update related sales bill remaining balances and status (`Paid`, `Partially Paid`, `Unpaid`).
   - Overpayment must be guarded against.
4. **Manual Bill Numbers**: Bill numbers (e.g. `B-1547`, `SUP-882`) MUST be manually entered by the user, never auto-generated sequentially without user input.
5. **Separation of Concerns**: Keep Supplier Purchases separate from Factory Operating Expenses.
6. **No Unnecessary Rewrites**: Modularize components cleanly into `components/`, `pages/`, `context/`, `types/`, `data/`, `utils/`.
7. **Testing**: Run automated build & test suites before marking tasks complete.
