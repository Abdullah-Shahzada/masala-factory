/**
 * WhatsApp Helper Utilities
 * Provides phone normalization, deep-linking, message formatting, and document sharing guidance.
 * Note: WhatsApp URLs cannot automatically attach local files. When a document exists,
 * the helper provides download/copy instructions so the user knows to attach it manually.
 */

import { formatPKR, formatDate } from './formatters';

export function normalizePakistanPhone(phone: string): string {
  if (!phone) return '';
  // Remove all non-digit characters except +
  let cleaned = phone.trim().replace(/[^\d+]/g, '');

  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  // If Pakistani local number starting with 03xx
  if (cleaned.startsWith('03')) {
    cleaned = '92' + cleaned.substring(1);
  } else if (cleaned.startsWith('3') && cleaned.length === 10) {
    cleaned = '92' + cleaned;
  }

  return cleaned;
}

export function generateWhatsAppLink(phone: string, text: string): string {
  const normalized = normalizePakistanPhone(phone);
  const encodedText = encodeURIComponent(text);
  if (!normalized) {
    // If no valid phone number, open web WhatsApp ready for contact selection
    return `https://wa.me/?text=${encodedText}`;
  }
  return `https://wa.me/${normalized}?text=${encodedText}`;
}

export function formatSalesBillWAMessage(params: {
  customerName: string;
  billNumber: string;
  date: string;
  itemsCount: number;
  grandTotal: number;
  receivedAmount: number;
  remainingAmount: number;
  branchName: string;
}): string {
  return (
    `*MASALA FACTORY MANAGEMENT*\n` +
    `*SALES INVOICE / BILL*\n` +
    `--------------------------------\n` +
    `*Customer:* ${params.customerName}\n` +
    `*Bill No:* ${params.billNumber}\n` +
    `*Date:* ${formatDate(params.date)}\n` +
    `*Items:* ${params.itemsCount} spice products\n` +
    `*Branch:* ${params.branchName}\n` +
    `--------------------------------\n` +
    `*Total Bill:* ${formatPKR(params.grandTotal)}\n` +
    `*Paid Amount:* ${formatPKR(params.receivedAmount)}\n` +
    `*Balance Due:* ${formatPKR(params.remainingAmount)}\n` +
    `--------------------------------\n` +
    `Thank you for your business!`
  );
}

export function formatPaymentReceiptWAMessage(params: {
  customerName: string;
  receiptNumber: string;
  date: string;
  amountReceived: number;
  paymentMethod: string;
  referenceNo?: string;
  allocatedBills: string;
  branchName: string;
}): string {
  return (
    `*MASALA FACTORY MANAGEMENT*\n` +
    `*OFFICIAL PAYMENT RECEIPT*\n` +
    `--------------------------------\n` +
    `*Customer:* ${params.customerName}\n` +
    `*Receipt No:* ${params.receiptNumber}\n` +
    `*Date:* ${formatDate(params.date)}\n` +
    `*Method:* ${params.paymentMethod} ${params.referenceNo ? `(${params.referenceNo})` : ''}\n` +
    `*Branch:* ${params.branchName}\n` +
    `--------------------------------\n` +
    `*Amount Received:* ${formatPKR(params.amountReceived)}\n` +
    `*Allocated To:* ${params.allocatedBills}\n` +
    `--------------------------------\n` +
    `Payment acknowledged with thanks.`
  );
}

export function formatSupplierPaymentWAMessage(params: {
  supplierName: string;
  receiptNumber: string;
  purchaseBillNumber: string;
  date: string;
  amountPaid: number;
  paymentMethod: string;
  referenceNo?: string;
  remainingPayable: number;
  branchName: string;
}): string {
  return (
    `*MASALA FACTORY MANAGEMENT*\n` +
    `*SUPPLIER PAYMENT VOUCHER*\n` +
    `--------------------------------\n` +
    `*Supplier:* ${params.supplierName}\n` +
    `*Voucher No:* ${params.receiptNumber}\n` +
    `*Purchase Bill:* ${params.purchaseBillNumber}\n` +
    `*Date:* ${formatDate(params.date)}\n` +
    `*Method:* ${params.paymentMethod} ${params.referenceNo ? `(${params.referenceNo})` : ''}\n` +
    `*Branch:* ${params.branchName}\n` +
    `--------------------------------\n` +
    `*Amount Disbursed:* ${formatPKR(params.amountPaid)}\n` +
    `*Remaining Payable:* ${formatPKR(params.remainingPayable)}\n` +
    `--------------------------------\n` +
    `Factory Accounts & Dispatch Division`
  );
}

export function formatPurchaseBillWAMessage(params: {
  supplierName: string;
  billNumber: string;
  date: string;
  grandTotal: number;
  amountPaid: number;
  outstandingAmount: number;
  branchName: string;
}): string {
  return (
    `*MASALA FACTORY MANAGEMENT*\n` +
    `*SUPPLIER PURCHASE RECORD*\n` +
    `--------------------------------\n` +
    `*Supplier:* ${params.supplierName}\n` +
    `*Supplier Bill No:* ${params.billNumber}\n` +
    `*Date:* ${formatDate(params.date)}\n` +
    `*Branch:* ${params.branchName}\n` +
    `--------------------------------\n` +
    `*Total Purchase:* ${formatPKR(params.grandTotal)}\n` +
    `*Advance Paid:* ${formatPKR(params.amountPaid)}\n` +
    `*Payable Balance:* ${formatPKR(params.outstandingAmount)}\n` +
    `--------------------------------\n` +
    `Procurement Registry`
  );
}

export function formatExpenseWAMessage(params: {
  expenseNumber: string;
  title: string;
  category: string;
  date: string;
  amount: number;
  paidTo: string;
  paymentMethod: string;
  branchName: string;
}): string {
  return (
    `*MASALA FACTORY MANAGEMENT*\n` +
    `*EXPENSE VOUCHER*\n` +
    `--------------------------------\n` +
    `*Voucher No:* ${params.expenseNumber}\n` +
    `*Category:* ${params.category}\n` +
    `*Description:* ${params.title}\n` +
    `*Date:* ${formatDate(params.date)}\n` +
    `*Disbursed To:* ${params.paidTo}\n` +
    `*Method:* ${params.paymentMethod}\n` +
    `*Branch:* ${params.branchName}\n` +
    `--------------------------------\n` +
    `*Amount Paid:* ${formatPKR(params.amount)}`
  );
}

export function formatScheduleReminderWAMessage(params: {
  partyName: string;
  type: 'Customer Receivable' | 'Supplier Payable';
  relatedBillNumber?: string;
  dueDate: string;
  amount: number;
  branchName: string;
  installmentInfo?: string;
}): string {
  return (
    `*MASALA FACTORY MANAGEMENT*\n` +
    `*PAYMENT REMINDER*\n` +
    `--------------------------------\n` +
    `*Party:* ${params.partyName}\n` +
    `*Category:* ${params.type}\n` +
    (params.relatedBillNumber ? `*Ref Bill:* ${params.relatedBillNumber}\n` : '') +
    (params.installmentInfo ? `*Schedule:* ${params.installmentInfo}\n` : '') +
    `*Due Date:* ${formatDate(params.dueDate)}\n` +
    `*Amount Due:* ${formatPKR(params.amount)}\n` +
    `*Branch:* ${params.branchName}\n` +
    `--------------------------------\n` +
    `Please ensure timely settlement. Thank you.`
  );
}

export function formatLedgerStatementWAMessage(params: {
  partyName: string;
  partyType: string;
  startDate?: string;
  endDate?: string;
  totalSales: number;
  totalPayments: number;
  closingBalance: number;
  branchName: string;
}): string {
  return (
    `*MASALA FACTORY MANAGEMENT*\n` +
    `*STATEMENT OF ACCOUNT*\n` +
    `--------------------------------\n` +
    `*Party:* ${params.partyName} (${params.partyType})\n` +
    `*Period:* ${params.startDate ? formatDate(params.startDate) : 'Beginning'} to ${params.endDate ? formatDate(params.endDate) : 'Present'}\n` +
    `*Branch Scope:* ${params.branchName}\n` +
    `--------------------------------\n` +
    `*Total Invoiced:* ${formatPKR(params.totalSales)}\n` +
    `*Payments Received:* ${formatPKR(params.totalPayments)}\n` +
    `*Net Balance Due:* ${formatPKR(params.closingBalance)}\n` +
    `--------------------------------\n` +
    `Official Audit Statement`
  );
}
