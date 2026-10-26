import { 
  generateSalesBillPDF, 
  generatePurchaseBillPDF, 
  generatePaymentReceivedPDF, 
  generateExpensePDF, 
  generateSupplierPaymentPDF, 
  generateLedgerStatementPDF 
} from '../utils/pdfGenerator';
import { 
  INITIAL_SALES_BILLS, 
  INITIAL_PARTIES, 
  INITIAL_PURCHASES, 
  INITIAL_PAYMENTS_RECEIVED, 
  INITIAL_EXPENSES 
} from '../data/mockData';
import { CompanyProfile } from '../types';
import * as fs from 'fs';
import * as path from 'path';

// Valid 1x1 test PNG base64
const testLogoPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const company: CompanyProfile = {
  name: 'Al-Madina Spice & Masala Mills',
  logoUrl: testLogoPng,
  address: 'Plot 42-A, Industrial Estate, Kot Lakhpat',
  city: 'Lahore',
  phone: '+92 42 35891234',
  email: 'info@masalafactory.pk',
  taxNumber: 'NTN: 4419201-7 | STRN: 3277876123456'
};

console.log('--- Testing PDF Generation with Company Logo & Watermark ---');

// 1. Sales Bill
const salesDoc = generateSalesBillPDF(INITIAL_SALES_BILLS[0], company);
const salesBytes = Buffer.from(salesDoc.output('arraybuffer'));
console.log(`[PASS] Sales Bill PDF generated: ${salesBytes.length} bytes, pages: ${salesDoc.getNumberOfPages()}`);

// 2. Purchase Bill
const purchaseDoc = generatePurchaseBillPDF(INITIAL_PURCHASES[0], company);
const purchaseBytes = Buffer.from(purchaseDoc.output('arraybuffer'));
console.log(`[PASS] Purchase Bill PDF generated: ${purchaseBytes.length} bytes, pages: ${purchaseDoc.getNumberOfPages()}`);

// 3. Payment Received
const paymentDoc = generatePaymentReceivedPDF(INITIAL_PAYMENTS_RECEIVED[0], company, INITIAL_PARTIES[0]);
const paymentBytes = Buffer.from(paymentDoc.output('arraybuffer'));
console.log(`[PASS] Payment Received PDF generated: ${paymentBytes.length} bytes, pages: ${paymentDoc.getNumberOfPages()}`);

// 4. Expense Voucher
const expenseDoc = generateExpensePDF(INITIAL_EXPENSES[0], company);
const expenseBytes = Buffer.from(expenseDoc.output('arraybuffer'));
console.log(`[PASS] Expense Voucher PDF generated: ${expenseBytes.length} bytes, pages: ${expenseDoc.getNumberOfPages()}`);

// 5. Supplier Payment Disbursement
const supplierDoc = generateSupplierPaymentPDF({
  id: 'sp-test',
  receiptNumber: 'VCH-SUP-882',
  supplierId: INITIAL_PARTIES[1].id,
  supplierName: INITIAL_PARTIES[1].name,
  purchaseBillId: INITIAL_PURCHASES[0].id,
  purchaseBillNumber: INITIAL_PURCHASES[0].billNumber,
  paymentDate: '2026-10-10',
  amountPaid: 65000,
  paymentMethod: 'Bank Transfer',
  branchId: 'b1',
  remainingPayable: 15000,
  createdAt: '2026-10-10T11:00:00Z'
}, company);
const supplierBytes = Buffer.from(supplierDoc.output('arraybuffer'));
console.log(`[PASS] Supplier Disbursement PDF generated: ${supplierBytes.length} bytes, pages: ${supplierDoc.getNumberOfPages()}`);

// 6. Multi-page Ledger Statement
const dummyTransactions = Array.from({ length: 35 }, (_, idx) => ({
  id: `tx-audit-${idx}`,
  date: '2026-10-08',
  type: 'Sales Bill' as const,
  billNumber: `B-100${idx}`,
  description: `Bulk wholesale spice dispatch carton #${idx + 1}`,
  billTotal: 45000,
  paymentAmount: 0,
  remainingBalance: 45000,
  branchId: 'b1' as const
}));
const ledgerDoc = generateLedgerStatementPDF(
  INITIAL_PARTIES[0],
  dummyTransactions,
  '2026-10-01',
  '2026-10-31',
  company,
  'Lahore Plant'
);
const ledgerBytes = Buffer.from(ledgerDoc.output('arraybuffer'));
const ledgerPages = ledgerDoc.getNumberOfPages();
console.log(`[PASS] Multi-page Ledger Statement PDF generated: ${ledgerBytes.length} bytes, pages: ${ledgerPages}`);

if (ledgerPages < 2) {
  console.error('[FAIL] Expected ledger statement to span at least 2 pages for multi-page test');
  process.exit(1);
}

// Write a test PDF file to verify actual file creation
const outPath = path.resolve(process.cwd(), 'sample_official_invoice.pdf');
fs.writeFileSync(outPath, salesBytes);
console.log(`[SUCCESS] Sample official PDF written to disk at ${outPath} (${salesBytes.length} bytes)`);
process.exit(0);
