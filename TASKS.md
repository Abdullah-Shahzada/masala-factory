# TASKS.md — Masala Factory Business Management System

## Phase 1: Environment Setup & Foundation
- [x] Install Node.js LTS and initialize Vite + React + TypeScript project <!-- status: completed -->
- [x] Configure Tailwind CSS v3 & Lucide Icons <!-- status: completed -->
- [x] Setup Routing (React Router v6) <!-- status: completed -->
- [x] Create documentation files (`AGENTS.md`, `PROJECT_SPEC.md`, `TASKS.md`, `README.md`) <!-- status: completed -->
- [x] Create mock database repository (`src/data/mockData.ts`) with 3 branches, customers, suppliers, sales bills, payments, purchases, expenses. <!-- status: completed -->

## Phase 2: Core Layout & Navigation
- [x] Responsive Sidebar with collapsible states & mobile drawer <!-- status: completed -->
- [x] Topbar with global search, branch switcher, notifications modal, theme toggle <!-- status: completed -->
- [x] Shared layout wrapper with router outlet <!-- status: completed -->

## Phase 3: Dashboard & Analytics
- [x] KPI summary cards (Total Sales, Received, Outstanding, Purchases, Expenses, Due Today, Overdue) <!-- status: completed -->
- [x] Sales trend chart & expense breakdown chart <!-- status: completed -->
- [x] Recent transactions table & upcoming payment reminders widget <!-- status: completed -->
- [x] Branch filter integration across dashboard <!-- status: completed -->

## Phase 4: Sales & Bills Module
- [x] Sales bills listing page with status pills & branch filter <!-- status: completed -->
- [x] New Bill modal/form with manual bill number entry & dynamic product row addition/removal <!-- status: completed -->
- [x] Auto-calculation of line item totals & grand total <!-- status: completed -->
- [x] Bill detail drawer & printable bill preview <!-- status: completed -->

## Phase 5: Payments Received Module
- [x] Payments received log table with payment method badges <!-- status: completed -->
- [x] Record Payment modal with bill allocation logic (updates bill status & remaining balance) <!-- status: completed -->
- [x] Overpayment validation logic <!-- status: completed -->
- [x] Payment receipt detail preview modal <!-- status: completed -->

## Phase 6: Payment Schedule Module
- [x] Subpage: Payments to Receive (Customer receivables timeline) <!-- status: completed -->
- [x] Subpage: Payments to Pay (Supplier & operational payables timeline) <!-- status: completed -->
- [x] Visual indicators for Due Today & Overdue items with mock notification alerts <!-- status: completed -->

## Phase 7: Purchases & Factory Expenses
- [x] Purchases module with supplier bill manual entry & product lines <!-- status: completed -->
- [x] Dedicated Factory Operating Expenses module with 11 initial categories <!-- status: completed -->
- [x] Category expense summaries & expense record dialog <!-- status: completed -->

## Phase 8: Contacts & Party Ledger Engine
- [x] Contacts directory (Customer, Supplier, Both) with search & filters <!-- status: completed -->
- [x] Detailed Party Ledger page with running balances & line item details <!-- status: completed -->
- [x] Date range filtering & transaction type filtering for ledger <!-- status: completed -->
- [x] Statement preview modal & client-side PDF export / print capabilities <!-- status: completed -->

## Phase 9: Reports & Settings
- [x] Multi-report analytical hub (Sales, Payments, Receivables, Payables, Expenses, Branch comparison) <!-- status: completed -->
- [x] Settings screen (Business profile, Branch management UI, Spice products catalog manager) <!-- status: completed -->

## Phase 10: Verification & Quality Assurance
- [x] Scenario test 1: A Rs.100,000 bill with Rs.60,000 received becomes Partially Paid with Rs.40,000 remaining. PASSED.
- [x] Scenario test 2: Receiving the remaining Rs.40,000 changes the bill to Paid. PASSED.
- [x] Scenario test 3: An unpaid bill remains Unpaid. PASSED.
- [x] Scenario test 4: Bill totals update correctly when product quantities or rates change. PASSED.
- [x] Scenario test 5: Ledger filters return only the selected period’s transactions. PASSED.
- [x] Scenario test 6: Branch and party filters work. PASSED.
- [x] Scenario test 7: Invalid or missing required fields are handled with overpayment validation. PASSED.
- [x] Scenario test 8: The app builds successfully (`npm run build`). PASSED (7/7 business tests passed & dist build created in 14s).

## Phase 11: Development Stage 2 — Dashboard, Sales/Bills, Data Entry, Filters and Recovery
- [x] **Feature 1 — Dashboard Quick Actions**:
  - Added "New Purchase" and "New Expense" quick-action buttons directly on the Dashboard.
  - Connected `QuickPurchaseModal` and `QuickExpenseModal` with required field validation, branch awareness, and duplicate submission locks.
  - Linked new records to shared state, dynamically updating KPI metrics (Purchases, Expenses) and the Category Breakdown chart.
- [x] **Feature 2 — Create Contacts and Products Directly from Sales/Bills**:
  - Enhanced sales bill creation flow with explicit "+ Add New Contact" and "+ Add New Product" buttons.
  - Implemented `InlineContactModal` and `InlineProductModal` supporting name, company, phone, WhatsApp, city, type, and product catalog rates.
  - Built duplicate detection preventing accidental identical contacts or products.
  - On save, auto-selects newly created entity in current bill while strictly preserving existing line items and entered form state.
- [x] **Feature 3 — Fix Amount Inputs Across the Application**:
  - Rebuilt `CurrencyInput` component across the entire app (Sales Bills, Line Items, Payments Received, Purchases, Supplier Payments, Expenses, Payment Schedules, Settings).
  - Eliminates leading zero fighting, auto-selects on focus, removes spin buttons, blocks negatives, supports decimal precision, and formats readable comma amounts (`Rs. 1,250,000`).
  - Completely preserves numeric raw values for mathematical calculations and filters.
- [x] **Feature 4 — Advanced Filters**:
  - Built multi-criteria composable filter panels across:
    - Sales/Bills (Bill #, customer, product, status, date range, numeric min/max amounts, branch).
    - Payments Received (Date range, party, method, min/max amount, ref/bill search, branch).
    - Purchases (Bill #, supplier, date range, product, status, min/max amount, branch).
    - Expenses (Category, date range, min/max amount, title search, branch).
    - Payment Schedule (Status, party, date range, min/max remaining amount, branch).
    - Contacts (Party type, city, search).
    - Ledger (Party, date range, type, bill/item search, branch).
    - Reports (Branch filter & soft-deleted bills exclusion).
  - Included active filter badges, "Clear Filters" controls, and informative empty states.
- [x] **Feature 5 — Safe Bill Deletion and Recovery**:
  - Integrated soft deletion (`isDeleted`, `deletedAt`, `deletedReason`) on sales bills with password check (`admin` / `1234`).
  - Enforced financial data integrity guard: blocks bill deletion if linked payments exist (`receivedAmount > 0`), providing an explanatory audit protection notice.
  - Created "Recently Deleted" tab in Sales & Bills with restoration workflow requiring password verification.
  - On restore, recalculates remaining balances and re-enables bill allocations and schedules without duplicating records.
- [x] **Stage 2 Automated Verification Suite**:
  - 12/12 Automated business tests passed (`npm test` via tsx).
  - Zero-error TypeScript compilation and Vite production build (`npm run build`).

## Phase 12: Development Stage 3 — Advanced Payments, WhatsApp, Schedules, Purchases, Ledger, Reports & Responsive UI
- [x] **Feature 1 — Payment Received (Multi-Bill Allocation & Transparency)**:
  - Multi-bill selection selector with customer/party filtering, bill-number search, original amount, paid amount, and outstanding balances.
  - Custom per-bill payment allocation inputs with automatic capping to bill balance.
  - Live allocation total calculation vs total amount received with strict overpayment guards.
  - Updates remaining balances, statuses (`Paid`, `Partially Paid`, `Unpaid`), and linked payment schedule items consistently.
  - Added payment receipt detail view with itemized allocation breakdown.
- [x] **Feature 2 — Photo Uploads & Payment Proof Badges**:
  - Standardized `FileUpload` component with camera/gallery file picker, `FileReader` data-URL previews, file replacement, and removal.
  - Color-coded `ProofBadge` indicators across Sales Bills, Payments Received, Purchases, Expenses, and Ledger (`Proof Attached`, `Proof Missing`, `Not Required`).
  - `ProofViewerModal` for inspecting high-resolution receipt images and document attachments.
- [x] **Feature 3 — Omnipresent WhatsApp Sharing**:
  - Created `normalizePakistanPhone` converting local formats (`03xx`, spaces, dashes) to international format (`923xx`).
  - `WhatsAppShareModal` providing direct text previews, copy-to-clipboard, recipient phone edit, and document download triggers.
  - Transparent notices informing users that browser WhatsApp URLs transmit formatted text and document attachments must be appended manually.
  - Standardized WhatsApp templates for Sales Bills, Payment Receipts, Supplier Payments, Purchase Bills, Expense Vouchers, Schedule Reminders, and Ledger Statements.
- [x] **Feature 4 — Multi-Installment Payment Schedules**:
  - Dual schedule builder: Single Due Date or Multiple Installment Milestones.
  - Multi-installment row generator with dates, target amounts, milestone labels, and automatic aggregate sum tracking.
  - Connected `addScheduleWithInstallments` in shared context generating linked installment records without duplicate counting.
  - WhatsApp payment reminder share buttons on each schedule row.
- [x] **Feature 5 — Purchases Module Enhancements (Inline Products & Supplier Payments)**:
  - Integrated `+ New Product` directly inside purchase invoice item rows via `InlineProductModal`.
  - Added supplier payment disbursement modal with method, date, reference, proof photo upload, and disbursement notes.
  - Created `SupplierPayment` vouchers with receipt generation and WhatsApp disbursement notifications.
- [x] **Feature 6 — Detailed Party Ledger Segmentation**:
  - Added party directory filter pills (`All Parties`, `Customers`, `Suppliers`) dynamically scoping ledger accounts.
  - Standardized `ProofBadge` on ledger transaction rows.
  - Connected WhatsApp share modal to `StatementModal` with one-click sharing and printable statement generation.
- [x] **Feature 7 — Reports Hub & Compliance Audit**:
  - Date range filtering presets: `All Time`, `Last 7 Days (Weekly)`, `Last 30 Days (Monthly)`, and `Custom`.
  - New "Missing Proofs Audit" report tracking all sales bills, payment receipts, purchase invoices, and expense vouchers missing attached proofs.
  - Print / PDF Report generation via `generateAuditReportPrintHTML`.
  - Executive report WhatsApp sharing with consolidated KPI figures.
- [x] **Stage 3 Verification Suite & Build Status**:
  - 18/18 Automated tests passed (`npm test` verifying allocations, installments, Pakistan phone normalization, supplier vouchers, and proof audits).
  - Production build compiled successfully (`npm run build`, 0 errors, 42.05s).

## Phase 13: Development Stage 3 — Business Workflow Refinement & PDF System
- [x] **Sales Bills — Searchable Parties and Products**:
  - Replaced standard dropdowns with searchable `PartyCombobox` and `ProductCombobox` supporting instant search by name, phone, company, and category.
  - Keyboard navigation (`ArrowUp`, `ArrowDown`, `Enter`, `Escape`), active party cards, and seamless `+ Create New Party` / `+ Add New Product` triggers without losing bill draft state.
  - In `InlineContactModal` and Contacts module, removed `'Lahore'` prefill in City field, setting default empty string with `"Enter city"` placeholder.
  - In `InlineProductModal` and Settings, removed `stockQty` (Initial Stock Quantity) requirement from bill line items while preserving existing catalog items.
- [x] **Initial Payment & Mathematical Ledger Accuracy**:
  - In `addSalesBill`, when `receivedAmount > 0`, automatically creates a distinct `PaymentReceived` transaction (`REC-INIT-[billNumber]`) linked to the new bill with `isInitialPayment: true`.
  - In `Ledger.tsx` and `StatementModal.tsx`, `Sales Bill` entries represent purely debit charges (`billTotal = grandTotal`, `paymentAmount = 0`), while `Payment Received` entries represent credits, guaranteeing mathematical precision and completely preventing initial payment double-counting.
- [x] **Payments Received — Secure Completion, Reopening & Schedule Editing**:
  - Secured status transitions with `PasswordConfirmModal` requiring administrative verification (`admin`, `1234`, `masala123`, `admin123`).
  - Added "Reopen" action that completely reverses bill allocations, restores customer balances, and sets status to `Reopened`.
  - Added "Complete" action that verifies password and re-applies allocations to sales bills and schedules.
  - In `PaymentSchedule.tsx`, added password-verified Mark Completed / Reopen actions, plus an Edit Schedule Reminder modal to update due dates, amounts, branch, and notes without duplicating debt.
- [x] **Real Vector PDF Generation & Sharing Engine (`jspdf`)**:
  - Built comprehensive vector PDF generator in `src/utils/pdfGenerator.ts` covering:
    - Sales Bill Invoices (`generateSalesBillPDF`)
    - Purchase Bill Vouchers (`generatePurchaseBillPDF`)
    - Payment Received Official Receipts (`generatePaymentReceivedPDF`)
    - Supplier Payment Disbursement Vouchers (`generateSupplierPaymentPDF`)
    - Factory Operating Expense Vouchers (`generateExpensePDF`)
    - Party Ledger Statements (`generateLedgerStatementPDF`)
  - Integrated company header, contact details, branch names, itemized tables, signature lines, and subtle security watermarks.
  - Implemented `shareOrDownloadPDF` using Web Share API (`navigator.share`) with fallback automated download and WhatsApp notice dialog.
- [x] **Compact Tables, Pagination & Date Sorting**:
  - Created reusable `Pagination.tsx` with page numbers, ellipsis, items-per-page selector, and total records count.
  - Added Date Sorting toggles ("Newest First" vs "Oldest First") across Sales Bills, Purchases, and Expenses.
  - Optimized table padding (`p-2.5`) for compact, dense viewing on 1366x768 and standard laptop screens.
- [x] **Company Profile & PDF Branding**:
  - Added Business Branding Profile in `Settings.tsx` with Company Name, Logo upload (drag/drop or file picker with format validation, preview, replace, remove), Address, City, Phone, Email, and Tax/NTN number.
  - Stored in shared `AppContext` (`companyProfile` / `updateCompanyProfile`) and dynamically rendered on all generated PDFs and headers.
- [x] **Existing Company Logo — PDF Watermark & Header Integration**:
  - Saved company logo from Settings (`companyProfile.logoUrl`) automatically persists in `localStorage` (`masala_company_profile`) across page reloads and modules.
  - Rendered as a subtle, semi-transparent watermark (0.08 opacity) centered on every page of Sales Bills, Purchase Invoices, Payment Receipts, Expense Vouchers, Supplier Payments, and Multi-page Ledger Statements.
  - Preserves intrinsic aspect ratio via `doc.getImageProperties` without stretching or distorting wide or tall logos.
  - Displayed clearly in the document header with proportional sizing and vertical centering.
  - If the logo is changed or removed in Settings, all newly generated PDFs immediately reflect the update.
- [x] **Verification & Test Suite**:
  - 29/29 automated business and PDF tests passed (`cmd /c "npm test"`).
  - Multi-page watermark and PDF byte generation verified (`verifyPdfWatermark.ts`).
  - Production build compiled cleanly (`cmd /c "npm run build"`, 0 errors, 12.08s).
  - Preserved exactly TWO factory branches (`b1` Lahore Plant, `b2` Karachi Hub) and zero-backend mock demo architecture.

## Phase 14: Complete Application Update — Payments, Schedules, Purchases, Ledger, Direct PDF & WhatsApp Integration
- [x] **Part 1 — Payment Received Module Overhaul**:
  - Completely removed Reopen/Mark as Incomplete feature, handlers, and UI references.
  - Preserved secure "Mark as Complete" with `PasswordConfirmModal`.
  - Added full pagination with page numbers, items-per-page selector, and automatic filter/search resets.
  - Replaced dropdown with searchable `PartyCombobox` (search by customer name/phone, displays details, shows outstanding bills).
- [x] **Part 2 — Standalone Payment Schedule Reminder System**:
  - Decoupled Payment Schedules from financial bills, allocations, and ledger updates.
  - Made Payment Schedule an independent manual reminder system.
  - Added searchable `PartyCombobox` in Add and Edit Schedule modals.
  - Added pagination to the Payment Schedule reminders table.
- [x] **Part 3 — Purchases & Supplier Management Refinements**:
  - Replaced supplier dropdown with searchable `PartyCombobox`.
  - Enforced strict integer-only validation for purchase item quantities (`1, 4, 5, 10, 100`) rejecting decimals (`4.5, 5.1`) without silent rounding.
  - Structured supplier ledger: Purchase Bills appear as full debits (`billTotal = grandTotal, paymentAmount = 0`), and initial payments (`amountPaid > 0`) appear as distinct `SP-INIT-[billNumber]` credit vouchers.
- [x] **Part 4 — Mathematical Ledger Consistency (Sales Bills & Purchases)**:
  - Both Sales Bills and Purchase Bills are debited in full on creation.
  - Initial payments are recorded as separate credit entries (`REC-INIT-...` and `SP-INIT-...`) in customer and supplier ledgers.
  - Preserved statement generation and ledger running balance accuracy.
- [x] **Part 5 — Global Direct PDF Download System**:
  - Direct file download (`doc.save`) without generic OS share dialogs (`navigator.share`).
  - Standardized meaningful filenames:
    - `Sales-Bill-[billNumber].pdf`
    - `Payment-Receipt-[receiptNumber].pdf`
    - `Supplier-Purchase-[billNumber].pdf`
    - `Supplier-Payment-[receiptNumber].pdf`
    - `Expense-[expenseNumber].pdf`
    - `Party-Ledger-[name].pdf`
    - `Business-Report-[type].pdf`
  - Reused company logo as watermark (0.08 opacity) and header logo across all documents.
- [x] **Part 6 — "Message on WhatsApp" Integration**:
  - Replaced generic OS share actions with dedicated "Message on WhatsApp" buttons.
  - Normalizes Pakistani phone numbers (`03xx` -> `923xx`, spaces, dashes).
  - Pre-fills editable WhatsApp messages and provides clear manual PDF attachment instructions.
- [x] **Part 7 & 8 — Constraints & Verification Suite**:
  - Strictly maintained exactly TWO factory branches (`b1` Lahore Plant, `b2` Karachi Hub).
  - Maintained 100% frontend-only mock architecture (no external backend or Supabase).
  - Automated test suite expanded to 38 business rule scenarios, all passing (`38/38 PASSED`).
  - Clean TypeScript compilation and Vite production build verified with zero errors (`npm run build`).

## Phase 15: Ledger, Contact Parties & Full CRUD with Recently Deleted
- [x] **Part 1 — Complete CRUD Across Application**:
  - Full Create, Read, Update (Edit), and Delete across:
    1. Sales Bills (Edit bill info, delete guard if payments exist)
    2. Payment Received (Edit notes/reference/proof, delete reverses bill allocations)
    3. Purchases (Edit supplier/invoice, delete guard if payment disbursed)
    4. Expenses (Edit expense details/category/proof, soft delete)
    5. Contact Parties (Full Edit party info, soft delete excluded from active selectors)
    6. Payment Schedule (Edit reminders/status/dates, soft delete)
  - Pre-fills forms with existing data, updates records in shared state without creating duplicates or distorting historical financial entries.
- [x] **Part 2 — Password-Protected Delete and Centralized Recently Deleted Module**:
  - Implemented `verifyAdminPassword` protecting all delete operations (`admin`, `1234`, `masala123`, `admin123`).
  - Created centralized `Recently Deleted` page (`/recently-deleted`) with category filter tabs (`All`, `Sales Bills`, `Payments Received`, `Purchases`, `Expenses`, `Contacts`, `Schedules`), search, detail inspection drawer, password-protected **Restore** and **Permanent Delete**.
  - Added dedicated navigation entry in the Sidebar under Dashboard with a dynamic live red count badge.
  - Financial safety rules:
    - Soft-deleting a party keeps historical bills/payments/purchases intact; soft-deleted parties are excluded (`!p.isDeleted`) from `PartyCombobox`.
    - Sales bills with recorded payments cannot be deleted (`receivedAmount > 0` blocked).
    - Supplier purchases with recorded payments cannot be deleted (`amountPaid > 0` blocked).
    - Soft-deleting a payment accurately reverses bill allocations so bill balances reflect trash status, and restoring re-applies allocations.
- [x] **Part 3 — Chronological Ledger Sorting & Dynamic Summary**:
  - Calculated running balances strictly chronologically (oldest to newest), with invoice debits preceding payments on identical dates.
  - Displayed newest-first while preserving each transaction's chronological running balance.
  - Verified exact customer balance progression: Bill Rs. 60,000 -> Payment Rs. 10,000 (bal: 50,000) -> Payment Rs. 5,000 (bal: 45,000).
  - Dynamic top summary cards adjust to party type: Total Billed / Total Purchases, Total Payments Received / Disbursed, and Current Balance.
- [x] **Part 4 — Verification Suite & Integrity**:
  - 43/43 business rules and integration tests passing (`cmd /c "npx tsx src/tests/businessRules.test.ts"`).
  - Production build passing with 0 errors (`cmd /c "npm run build"`).
  - Preserved exactly TWO factory branches (`b1` Lahore Plant, `b2` Karachi Hub).
  - 100% frontend-only mock state maintained without external backend dependencies.

## Phase 16: Ledger Chronological Sorting, Running Balance & Remove Global Search
- [x] **Part 1 — Sort All Ledger Entries by Actual Date and Time**:
  - Implemented `formatTransactionTimestamp` in `src/utils/formatters.ts` parsing actual transaction date and time without fabricating fake times.
  - Formatted time (`09:30 AM`, `02:30 PM`) displayed alongside date in Ledger, Statement preview modal, and PDF/HTML exports with Clock icon and clear "Date only" fallback.
  - Chronological sorting: Primary by `sortTimestamp`, Secondary tie-breaker: Bills before Payments on identical timestamp, Stable tertiary: `(a.createdAt || a.id).localeCompare(b.createdAt || b.id)`.
- [x] **Part 2 — Keep Each Bill and Payment in Correct Sequence**:
  - Customer Ledger: Bill created (+60k, bal: 60k) -> Initial payment (-10k, bal: 50k) -> Subsequent payment (-5k, bal: 45k) -> New bill (+20k, bal: 65k) -> Another payment (-15k, bal: 50k).
  - Supplier Ledger: Purchases increase payable (+185k) -> Payments reduce payable (-85k -> 100k, -50k -> 50k).
  - Initial payments recorded as distinct vouchers immediately following invoice debits at identical timestamps.
- [x] **Part 3 — Correct Running Balance and Ledger Summary**:
  - Running balance computed forward in time (oldest to newest) from underlying records.
  - Newest-first reverse display preserves each transaction row's historical chronological balance.
  - Synchronized top summary cards for Total Billed / Total Purchases, Total Received / Paid, and Outstanding Balance.
- [x] **Part 4 — Maintain Accurate Transaction Timestamps**:
  - Added optional `billTime`, `paymentTime`, `expenseTime` capture in creation/editing modals defaulting to current time.
  - Preserved original transaction timestamps without overwriting legacy dates.
- [x] **Part 5 — Remove Global Search**:
  - Removed topbar Global Search bar and state without disrupting navigation, collapse toggle, mobile menu, or branch switcher.
  - Preserved all module-specific search inputs (bill no, receipt no, party name, product, date ranges, and PartyCombobox).
- [x] **Part 6 & 7 — Verification & Production Build**:
  - 48/48 automated tests passed (`cmd /c "npx tsx src/tests/businessRules.test.ts"`).
  - Production build passed with 0 errors (`cmd /c "npm run build"`, 11.64s).
  - Maintained strictly TWO factory branches (`b1` Lahore Plant, `b2` Karachi Hub).




