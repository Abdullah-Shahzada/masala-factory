-- ============================================================================
-- MASALA FACTORY BUSINESS MANAGEMENT SYSTEM — MYSQL SCHEMA
-- Compatible with MySQL 8.0+, MariaDB, TiDB Cloud, and Local XAMPP
-- ============================================================================

CREATE TABLE IF NOT EXISTS factories (
  id VARCHAR(36) PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  address TEXT NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Active',
  is_main TINYINT(1) NOT NULL DEFAULT 0,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS company_profiles (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL DEFAULT 'Masala Manufacturing & B2B Supply Factory',
  address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL DEFAULT 'Multan',
  phone VARCHAR(50) NOT NULL DEFAULT '+92 61 4567890',
  email VARCHAR(255) NULL DEFAULT 'info@masalafactory.pk',
  tax_number VARCHAR(100) NULL DEFAULT 'NTN: 4419201-7 | STRN: 3277876123456',
  logo_url TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS parties (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  company_name VARCHAR(255) NULL,
  type ENUM('Customer', 'Supplier', 'Both') NOT NULL DEFAULT 'Customer',
  phone VARCHAR(50) NOT NULL,
  whatsapp VARCHAR(50) NULL,
  email VARCHAR(255) NULL,
  city VARCHAR(100) NULL,
  address TEXT NULL,
  notes TEXT NULL,
  credit_limit DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  tax_number VARCHAR(100) NULL,
  is_deleted TINYINT(1) NOT NULL DEFAULT 0,
  deleted_at TIMESTAMP NULL,
  deleted_by VARCHAR(100) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_parties_name (name),
  INDEX idx_parties_type (type),
  INDEX idx_parties_deleted (is_deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  unit VARCHAR(50) NOT NULL DEFAULT 'KG',
  default_rate DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  stock_qty DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  description TEXT NULL,
  is_deleted TINYINT(1) NOT NULL DEFAULT 0,
  deleted_at TIMESTAMP NULL,
  deleted_by VARCHAR(100) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_products_name (name),
  INDEX idx_products_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sales_bills (
  id VARCHAR(36) PRIMARY KEY,
  factory_id VARCHAR(36) NOT NULL,
  bill_number VARCHAR(100) NOT NULL,
  bill_date DATE NOT NULL,
  bill_time TIME NULL,
  party_id VARCHAR(36) NOT NULL,
  party_name VARCHAR(255) NOT NULL,
  party_phone VARCHAR(50) NULL,
  grand_total DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  received_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  remaining_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  status ENUM('Paid', 'Partially Paid', 'Unpaid') NOT NULL DEFAULT 'Unpaid',
  proof_url TEXT NULL,
  proof_status VARCHAR(50) NOT NULL DEFAULT 'Not Required',
  notes TEXT NULL,
  is_deleted TINYINT(1) NOT NULL DEFAULT 0,
  deleted_at TIMESTAMP NULL,
  deleted_by VARCHAR(100) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_factory_sales_bill (factory_id, bill_number),
  INDEX idx_sb_party (party_id),
  INDEX idx_sb_date (bill_date),
  INDEX idx_sb_status (status),
  FOREIGN KEY (factory_id) REFERENCES factories(id) ON DELETE RESTRICT,
  FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sales_bill_items (
  id VARCHAR(36) PRIMARY KEY,
  bill_id VARCHAR(36) NOT NULL,
  product_id VARCHAR(36) NULL,
  product_name VARCHAR(255) NOT NULL,
  quantity DECIMAL(15, 2) NOT NULL DEFAULT 1.00,
  unit VARCHAR(50) NOT NULL DEFAULT 'KG',
  rate DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sbi_bill (bill_id),
  FOREIGN KEY (bill_id) REFERENCES sales_bills(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS payments_received (
  id VARCHAR(36) PRIMARY KEY,
  factory_id VARCHAR(36) NOT NULL,
  receipt_number VARCHAR(100) NOT NULL,
  party_id VARCHAR(36) NOT NULL,
  party_name VARCHAR(255) NOT NULL,
  party_phone VARCHAR(50) NULL,
  amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  payment_date DATE NOT NULL,
  payment_time TIME NULL,
  payment_method VARCHAR(50) NOT NULL DEFAULT 'Cash',
  reference_no VARCHAR(100) NULL,
  proof_url TEXT NULL,
  proof_status VARCHAR(50) NOT NULL DEFAULT 'Verified',
  status VARCHAR(50) NOT NULL DEFAULT 'Completed',
  is_initial_payment TINYINT(1) NOT NULL DEFAULT 0,
  notes TEXT NULL,
  is_deleted TINYINT(1) NOT NULL DEFAULT 0,
  deleted_at TIMESTAMP NULL,
  deleted_by VARCHAR(100) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_factory_receipt (factory_id, receipt_number),
  INDEX idx_pr_party (party_id),
  INDEX idx_pr_date (payment_date),
  FOREIGN KEY (factory_id) REFERENCES factories(id) ON DELETE RESTRICT,
  FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS payment_allocations (
  id VARCHAR(36) PRIMARY KEY,
  payment_id VARCHAR(36) NOT NULL,
  bill_id VARCHAR(36) NOT NULL,
  bill_number VARCHAR(100) NOT NULL,
  allocated_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_pa_payment (payment_id),
  INDEX idx_pa_bill (bill_id),
  FOREIGN KEY (payment_id) REFERENCES payments_received(id) ON DELETE CASCADE,
  FOREIGN KEY (bill_id) REFERENCES sales_bills(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS purchases (
  id VARCHAR(36) PRIMARY KEY,
  factory_id VARCHAR(36) NOT NULL,
  bill_number VARCHAR(100) NOT NULL,
  supplier_id VARCHAR(36) NOT NULL,
  supplier_name VARCHAR(255) NOT NULL,
  bill_date DATE NOT NULL,
  grand_total DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  paid_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  outstanding_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  status ENUM('Paid', 'Partially Paid', 'Unpaid') NOT NULL DEFAULT 'Unpaid',
  proof_url TEXT NULL,
  proof_status VARCHAR(50) NOT NULL DEFAULT 'Not Required',
  notes TEXT NULL,
  is_deleted TINYINT(1) NOT NULL DEFAULT 0,
  deleted_at TIMESTAMP NULL,
  deleted_by VARCHAR(100) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_factory_purchase (factory_id, bill_number),
  INDEX idx_pur_supplier (supplier_id),
  INDEX idx_pur_date (bill_date),
  FOREIGN KEY (factory_id) REFERENCES factories(id) ON DELETE RESTRICT,
  FOREIGN KEY (supplier_id) REFERENCES parties(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS purchase_items (
  id VARCHAR(36) PRIMARY KEY,
  purchase_id VARCHAR(36) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  quantity DECIMAL(15, 2) NOT NULL DEFAULT 1.00,
  unit VARCHAR(50) NOT NULL DEFAULT 'KG',
  rate DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_pi_purchase (purchase_id),
  FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS supplier_payments (
  id VARCHAR(36) PRIMARY KEY,
  factory_id VARCHAR(36) NOT NULL,
  purchase_id VARCHAR(36) NULL,
  receipt_number VARCHAR(100) NOT NULL,
  purchase_bill_number VARCHAR(100) NOT NULL,
  supplier_id VARCHAR(36) NOT NULL,
  supplier_name VARCHAR(255) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  payment_date DATE NOT NULL,
  payment_time TIME NULL,
  payment_method VARCHAR(50) NOT NULL DEFAULT 'Cash',
  reference_no VARCHAR(100) NULL,
  proof_url TEXT NULL,
  proof_status VARCHAR(50) NOT NULL DEFAULT 'Verified',
  remaining_payable DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  notes TEXT NULL,
  is_deleted TINYINT(1) NOT NULL DEFAULT 0,
  deleted_at TIMESTAMP NULL,
  deleted_by VARCHAR(100) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_factory_supp_pay (factory_id, receipt_number),
  INDEX idx_sp_supplier (supplier_id),
  FOREIGN KEY (factory_id) REFERENCES factories(id) ON DELETE RESTRICT,
  FOREIGN KEY (supplier_id) REFERENCES parties(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS expenses (
  id VARCHAR(36) PRIMARY KEY,
  factory_id VARCHAR(36) NOT NULL,
  expense_number VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  expense_date DATE NOT NULL,
  expense_time TIME NULL,
  paid_to VARCHAR(255) NOT NULL,
  payment_method VARCHAR(50) NOT NULL DEFAULT 'Cash',
  reference_no VARCHAR(100) NULL,
  proof_url TEXT NULL,
  proof_status VARCHAR(50) NOT NULL DEFAULT 'Not Required',
  description TEXT NULL,
  notes TEXT NULL,
  is_deleted TINYINT(1) NOT NULL DEFAULT 0,
  deleted_at TIMESTAMP NULL,
  deleted_by VARCHAR(100) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_factory_expense (factory_id, expense_number),
  INDEX idx_exp_factory (factory_id),
  INDEX idx_exp_date (expense_date),
  FOREIGN KEY (factory_id) REFERENCES factories(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS payment_schedules (
  id VARCHAR(36) PRIMARY KEY,
  factory_id VARCHAR(36) NOT NULL,
  type ENUM('ToReceive', 'ToPay', 'Receive', 'Pay') NOT NULL DEFAULT 'ToReceive',
  party_id VARCHAR(36) NULL,
  party_name VARCHAR(255) NOT NULL,
  party_phone VARCHAR(50) NULL,
  related_bill_number VARCHAR(100) NULL,
  due_date DATE NOT NULL,
  scheduled_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  paid_received_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  remaining_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  status VARCHAR(50) NOT NULL DEFAULT 'Pending',
  description TEXT NULL,
  notes TEXT NULL,
  parent_schedule_id VARCHAR(36) NULL,
  installment_no INT NULL,
  is_deleted TINYINT(1) NOT NULL DEFAULT 0,
  deleted_at TIMESTAMP NULL,
  deleted_by VARCHAR(100) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_sch_due (due_date),
  INDEX idx_sch_status (status),
  FOREIGN KEY (factory_id) REFERENCES factories(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS schedule_installments (
  id VARCHAR(36) PRIMARY KEY,
  schedule_id VARCHAR(36) NOT NULL,
  installment_number INT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  due_date DATE NOT NULL,
  paid_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  status VARCHAR(50) NOT NULL DEFAULT 'Pending',
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_si_schedule (schedule_id),
  FOREIGN KEY (schedule_id) REFERENCES payment_schedules(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
