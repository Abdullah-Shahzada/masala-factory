# PROJECT_SPEC.md — Masala Factory Business Management System

## Overview
A comprehensive B2B business management web application tailored for a masala manufacturing factory supplying products like Chicken Masala, Tikka Masala, Kabab Masala, Garam Masala, Biryani Masala, and custom spice blends across 3 factory branches.

## Multi-Branch Operations
- **Branch 1**: Main Factory & Central Hub (Lahore)
- **Branch 2**: Karachi Wholesale Branch
- **Branch 3**: Faisalabad Processing & Supply Unit

## Functional Modules Specifications

### 1. Main Navigation & Layout
- **Sidebar Navigation**: Dashboard, Sales / Bills, Payments Received, Payment Schedule (Submenu: Payments to Receive, Payments to Pay), Purchases, Expenses, Contacts / Parties, Ledger, Reports, Settings.
- **Top Bar**: Global search bar, Branch switcher, Notifications popover with visual badge, User Profile menu, Dark/Light theme toggle, Sidebar collapse toggle.

### 2. Dashboard
- **KPI Metrics**: Total Sales (Rs), Payments Received (Rs), Total Outstanding (Rs), Total Purchases (Rs), Total Expenses (Rs), Payments Due Today, Payments Overdue, Upcoming Payments.
- **Interactive Widgets**: Sales Trend Chart, Recent Transactions Feed, Payment Schedule Reminders, Branch Filter.

### 3. Sales / Bills Module
- **Form Fields**: Customer/Party, Phone, Manual Bill Number (e.g. `B-1547`), Bill Date, Branch, Dynamic Line Items (Product, Qty, Unit, Rate, Total), Grand Total, Proof Upload Placeholder, Notes.
- **Calculations**: Auto-calculated line total (`Qty * Rate`), Grand Total (`Sum(Line Totals)`), Remaining Balance (`Grand Total - Received Amount`).
- **Statuses**: `Paid` (Green), `Partially Paid` (Amber), `Unpaid` (Red).
- **Features**: Search, status filter, branch filter, bill detail modal, edit record, PDF preview & print.

### 4. Payments Received Module
- **Form Fields**: Party, Amount Received, Payment Date, Payment Method (`Cash`, `Bank Transfer`, `Cheque`, `Online Transfer`, `JazzCash`, `Easypaisa`, `Other`), Related Bill(s) allocation, Bank Ref, Proof Upload Placeholder, Notes, Branch.
- **Rules**: Dynamically updates bill `Received Amount`, `Remaining Amount`, and `Status`. Prevents overpayment.
- **Features**: Payment history ledger, payment receipt modal.

### 5. Payment Schedule Module
- **Views**:
  1. **Payments to Receive**: Expected receivables from customers with due dates, remaining balances, and reminder status.
  2. **Payments to Pay**: Factory payables to spice suppliers, raw material vendors, and utilities.
- **Statuses**: `Upcoming`, `Due Today` (Alert), `Overdue` (Critical alert), `Completed`.

### 6. Purchases / Supplier Bills Module
- **Form Fields**: Supplier, Manual Supplier Bill Number (e.g. `SUP-882`), Bill Date, Branch, Purchased Products (Raw spices, chilli, turmeric, packaging bags), Qty, Rate, Line Total, Grand Total, Amount Paid, Outstanding Amount, Due Date, Supplier Bill Proof, Notes.
- **Statuses**: `Paid`, `Partially Paid`, `Unpaid`. Separated from factory expenses.

### 7. Factory Operating Expenses Module
- **Categories**: Electricity, Gas, Salaries, Rent, Transport, Maintenance, Packaging, Fuel, Office Expenses, Machinery / Repairs, Other.
- **Form Fields**: Expense Title, Category, Amount, Expense Date, Branch, Paid To, Payment Method, Reference, Proof Placeholder, Notes.
- **Summaries**: Total expenses, category pie charts, monthly breakdown tables.

### 8. Contacts / Parties Directory
- **Party Types**: Customer, Supplier, Both (Customer & Supplier).
- **Fields**: Name, Phone, WhatsApp Number, Address, Party Type, Notes.
- **Actions**: Direct "Open Ledger" button, Contact Profile, Transaction History summary.

### 9. Party Ledger & Statement Export Engine
- **Ledger Aggregates**: Total Sales, Total Received, Total Purchases, Total Supplier Payments, Net Outstanding.
- **Detailed Timeline**: Date, Type, Bill/Ref No, Description, Products & Quantities, Bill Total, Amount Paid, Remaining Balance, Document Proof preview.
- **Statement Generator**: Date range filtering, dynamic calculation, statement preview modal, PDF export, Print layout, Web Share integration.

### 10. Reports Module
- **Reports Available**: Sales Summary, Payments Received, Receivables Aging, Supplier Payables, Expense Analysis, Branch Performance Comparison.
- **Filters**: Custom Date Ranges, Branch selector. Charts & export capabilities.

### 11. Settings Module
- **Features**: Business Name & Logo branding, Factory Branch Management, Products & Price List Management, PKR display preferences, User Profile demo state.
