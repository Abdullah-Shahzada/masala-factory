import { SalesBill, PaymentReceived } from '../types';
import { formatPKR } from './formatters';

export interface DetailedBillPaymentBreakdown {
  billId: string;
  billNumber: string;
  billDate: string;
  originalBillTotal: number;
  previouslyReceived: number;
  amountThisPayment: number;
  remainingBalance: number;
  statusAfterPayment: 'Paid' | 'Partially Paid' | 'Unpaid';
  description: string;
  narrative: string;
}

/**
 * Determine exact timestamp for chronological sorting of payments
 */
const getPaymentTimestamp = (p: PaymentReceived): number => {
  const dateOnly = (p.paymentDate || p.createdAt || '').slice(0, 10);
  const dt = new Date(`${dateOnly}T00:00:00`);
  if (p.paymentTime && p.paymentTime.trim()) {
    const [hh, mm] = p.paymentTime.split(':').map(n => parseInt(n, 10) || 0);
    dt.setHours(hh, mm, 0, 0);
  } else if (p.createdAt && p.createdAt.includes('T')) {
    const cdt = new Date(p.createdAt);
    if (!isNaN(cdt.getTime())) return cdt.getTime();
  }
  return isNaN(dt.getTime()) ? 0 : dt.getTime();
};

/**
 * Compute detailed bill-level financial breakdown for a payment receipt.
 * Accurately calculates:
 * - Original total bill amount
 * - Total amount received before current payment
 * - Amount received in current transaction
 * - Remaining balance after current payment
 * - Clear narrative explanation
 */
export const computePaymentReceiptBreakdown = (
  payment: PaymentReceived,
  allBills: SalesBill[],
  allPayments: PaymentReceived[]
): DetailedBillPaymentBreakdown[] => {
  // Determine bill allocations
  const targetAllocations = payment.allocations && payment.allocations.length > 0
    ? payment.allocations
    : payment.allocatedBillIds.map(bid => {
        const b = allBills.find(x => x.id === bid);
        return {
          billId: bid,
          billNumber: b?.billNumber || bid,
          amount: payment.amountReceived
        };
      });

  if (targetAllocations.length === 0) {
    return [];
  }

  const currentPayTimestamp = getPaymentTimestamp(payment);

  return targetAllocations.map(alloc => {
    const bill = allBills.find(b => b.id === alloc.billId || b.billNumber === alloc.billNumber);
    const originalBillTotal = bill ? bill.grandTotal : alloc.amount;
    const billDate = bill ? bill.billDate : payment.paymentDate;

    // Calculate sum of all prior payments strictly before this payment
    let previouslyReceived = 0;

    allPayments.forEach(p => {
      if (p.id === payment.id || p.isDeleted) return;

      const pAlloc = p.allocations?.find(
        a => a.billId === alloc.billId || (bill && a.billId === bill.id) || a.billNumber === alloc.billNumber
      );
      const isAllocated = Boolean(
        pAlloc || 
        (p.allocatedBillIds && (p.allocatedBillIds.includes(alloc.billId) || (bill && p.allocatedBillIds.includes(bill.id))))
      );

      if (!isAllocated) return;

      const pAmount = pAlloc ? pAlloc.amount : p.amountReceived;
      const pTimestamp = getPaymentTimestamp(p);

      // Must be chronologically earlier
      const isPrior = 
        pTimestamp < currentPayTimestamp || 
        (pTimestamp === currentPayTimestamp && (p.createdAt || p.id).localeCompare(payment.createdAt || payment.id) < 0);

      if (isPrior) {
        previouslyReceived += pAmount;
      }
    });

    const amountThisPayment = alloc.amount;
    const totalReceivedAfterThis = previouslyReceived + amountThisPayment;
    const remainingBalance = Math.max(0, originalBillTotal - totalReceivedAfterThis);
    const statusAfterPayment = remainingBalance === 0 
      ? 'Paid' 
      : (totalReceivedAfterThis > 0 ? 'Partially Paid' : 'Unpaid');

    const description = `Payment received against Bill ${alloc.billNumber}.`;
    const narrative = `Out of the original bill of ${formatPKR(originalBillTotal)}, ${formatPKR(amountThisPayment)} has been received in this transaction, and ${formatPKR(remainingBalance)} remains outstanding.`;

    return {
      billId: alloc.billId,
      billNumber: alloc.billNumber,
      billDate,
      originalBillTotal,
      previouslyReceived,
      amountThisPayment,
      remainingBalance,
      statusAfterPayment,
      description,
      narrative
    };
  });
};
