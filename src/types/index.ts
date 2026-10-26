export type FactoryStatus = 'Active' | 'Inactive';

export interface Factory {
  id: string; // Unique identifier (e.g. 'b1', 'b2', 'fact-1738...')
  name: string; // Factory name (e.g. 'Multan Main Processing Plant')
  code: string; // Unique factory code (e.g. 'MLT-01', 'LHR-02')
  city: string; // City location (e.g. 'Multan', 'Lahore', 'Karachi')
  address: string; // Street address / Industrial plot
  phone: string; // Contact phone number
  email?: string; // Optional email address
  status: FactoryStatus; // 'Active' or 'Inactive' (permanent business records)
  isMain?: boolean; // Primary factory indicator
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

// Aliases for seamless backward compatibility across existing components
export type Branch = Factory;
export type BranchId = string;

export type PartyType = 'Customer' | 'Supplier' | 'Both';

export interface Party {
  id: string;
  name: string;
  companyName?: string;
  phone: string;
  whatsapp: string;
  address: string;
  city: string;
  type: PartyType;
  notes?: string;
  createdAt: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  unit: string; // e.g. '1kg Pack', '500g Pack', '25kg Bag', '50kg Bag'
  defaultRate: number;
  stockQty?: number;
  description?: string;
}

export interface BillItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  rate: number;
  lineTotal: number;
}

export type PaymentStatus = 'Paid' | 'Partially Paid' | 'Unpaid';

export interface SalesBill {
  id: string;
  billNumber: string; // Manually entered, e.g. B-1547
  partyId: string;
  partyName: string;
  partyPhone: string;
  billDate: string;
  billTime?: string; // Captured transaction time (e.g. "14:30")
  branchId: BranchId;
  branchName: string;
  items: BillItem[];
  grandTotal: number;
  receivedAmount: number;
  remainingAmount: number;
  status: PaymentStatus;
  proofUrl?: string;
  proofStatus?: ProofStatus;
  notes?: string;
  createdAt: string;
  // Soft deletion fields
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
}

export type PaymentMethod = 
  | 'Cash' 
  | 'Bank Transfer' 
  | 'Cheque' 
  | 'Online Transfer' 
  | 'JazzCash' 
  | 'Easypaisa' 
  | 'Other';

export type ProofStatus = 'Proof Attached' | 'Proof Missing' | 'Not Required';

export interface PaymentAllocation {
  billId: string;
  billNumber: string;
  amount: number;
}

export interface PaymentReceived {
  id: string;
  receiptNumber: string;
  partyId: string;
  partyName: string;
  partyPhone?: string;
  amountReceived: number;
  paymentDate: string;
  paymentTime?: string; // Captured transaction time (e.g. "14:30")
  paymentMethod: PaymentMethod;
  allocatedBillIds: string[];
  allocations?: PaymentAllocation[]; // Detailed per-bill allocation amounts
  referenceNo?: string;
  proofUrl?: string;
  proofStatus?: ProofStatus;
  status?: 'Completed' | 'Pending' | 'Reopened';
  isInitialPayment?: boolean;
  notes?: string;
  branchId: BranchId;
  createdAt: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
}

export interface CompanyProfile {
  name: string;
  logoUrl?: string;
  address: string;
  city: string;
  phone: string;
  email?: string;
  taxNumber?: string; // NTN / STRN / Registration
}

export interface SupplierPayment {
  id: string;
  receiptNumber: string;
  supplierId: string;
  supplierName: string;
  purchaseBillId: string;
  purchaseBillNumber: string;
  paymentDate: string;
  paymentTime?: string; // Captured transaction time (e.g. "14:30")
  amountPaid: number;
  paymentMethod: PaymentMethod;
  referenceNo?: string;
  proofUrl?: string;
  proofStatus?: ProofStatus;
  branchId: BranchId;
  remainingPayable: number;
  notes?: string;
  createdAt: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
}

export type ScheduleType = 'ToReceive' | 'ToPay';
export type ScheduleStatus = 'Upcoming' | 'Due Today' | 'Overdue' | 'Partially Paid' | 'Completed';

export interface ScheduleInstallment {
  id: string;
  installmentNo: number;
  amount: number;
  dueDate: string;
  notes?: string;
  paidAmount?: number;
  status: ScheduleStatus;
}

export interface PaymentScheduleItem {
  id: string;
  type: ScheduleType;
  partyId: string;
  partyName: string;
  partyPhone?: string;
  relatedBillNumber?: string;
  dueDate: string;
  scheduledAmount: number;
  paidReceivedAmount: number;
  remainingAmount: number;
  branchId: BranchId;
  status: ScheduleStatus;
  notes?: string;
  parentScheduleId?: string;
  installmentNo?: number;
  installments?: ScheduleInstallment[];
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
}

export interface PurchaseBill {
  id: string;
  billNumber: string; // Manually entered supplier bill no, e.g. SUP-882
  supplierId: string;
  supplierName: string;
  billDate: string;
  billTime?: string; // Captured transaction time (e.g. "14:30")
  dueDate: string;
  branchId: BranchId;
  items: BillItem[];
  grandTotal: number;
  amountPaid: number;
  outstandingAmount: number;
  status: PaymentStatus;
  proofUrl?: string;
  proofStatus?: ProofStatus;
  notes?: string;
  createdAt: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
}

export type ExpenseCategory =
  | 'Electricity'
  | 'Gas'
  | 'Salaries'
  | 'Rent'
  | 'Transport'
  | 'Maintenance'
  | 'Packaging'
  | 'Fuel'
  | 'Office Expenses'
  | 'Machinery / Repairs'
  | 'Other';

export interface Expense {
  id: string;
  expenseNumber: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  expenseDate: string;
  expenseTime?: string; // Captured transaction time (e.g. "14:30")
  branchId: BranchId;
  paidTo: string;
  paymentMethod: PaymentMethod;
  referenceNo?: string;
  proofUrl?: string;
  proofStatus?: ProofStatus;
  notes?: string;
  createdAt: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
}

export type DeletedRecordType = 
  | 'Sales Bill' 
  | 'Payment Received' 
  | 'Purchase Bill' 
  | 'Expense' 
  | 'Contact Party' 
  | 'Payment Schedule' 
  | 'Supplier Payment';

export interface RecentlyDeletedItem {
  id: string;
  recordType: DeletedRecordType;
  referenceNumber: string;
  title: string;
  partyName?: string;
  amount?: number;
  deletedAt: string;
  deletedBy?: string;
  originalRecord: any;
}

export interface LedgerTransaction {
  id: string;
  date: string;
  time?: string;
  hasExactTime?: boolean;
  displayDate?: string;
  displayTime?: string;
  sortTimestamp?: number;
  createdAt?: string;
  type: 'Sales Bill' | 'Payment Received' | 'Purchase Bill' | 'Supplier Payment';
  billNumber: string;
  description: string;
  itemsSummary?: string;
  billTotal: number;
  paymentAmount: number;
  remainingBalance: number;
  proofUrl?: string;
  proofStatus?: ProofStatus;
  notes?: string;
  branchId: BranchId;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  date: string;
  type: 'warning' | 'info' | 'alert' | 'success';
  read: boolean;
  link?: string;
}
