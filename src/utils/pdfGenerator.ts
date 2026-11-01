import { jsPDF } from 'jspdf';
import { formatPKR, formatDate } from './formatters';
import { 
  Party, 
  LedgerTransaction, 
  SalesBill, 
  PurchaseBill, 
  Expense, 
  PaymentReceived, 
  SupplierPayment, 
  CompanyProfile,
  Factory
} from '../types';
import { INITIAL_FACTORIES } from '../data/mockData';
import { computePaymentReceiptBreakdown, DetailedBillPaymentBreakdown } from './paymentReceiptHelper';

export const resolveFactoryName = (branchId?: string, fallbackName?: string): string => {
  if (!branchId || branchId === 'all') return fallbackName || 'All Factories';
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = localStorage.getItem('masala_factories');
      if (raw) {
        const parsed: Factory[] = JSON.parse(raw);
        const f = parsed.find(item => item.id === branchId || item.code === branchId);
        if (f) return `${f.name} (${f.city})`;
      }
    } catch {}
  }
  const initF = INITIAL_FACTORIES.find(item => item.id === branchId || item.code === branchId);
  if (initF) return `${initF.name} (${initF.city})`;
  return fallbackName || branchId;
};

const DEFAULT_COMPANY: CompanyProfile = {
  name: 'Masala Manufacturing & B2B Supply Factory',
  address: 'Plot 42-A, Industrial Estate Phase II',
  city: 'Multan',
  phone: '+92 61 4567890',
  email: 'info@masalafactory.pk',
  taxNumber: 'NTN: 4419201-7 | STRN: 3277876123456'
};

/**
 * Retrieve stored company profile from localStorage if not fully provided
 */
export const getStoredCompanyProfile = (provided?: CompanyProfile): CompanyProfile => {
  if (provided && provided.name && (provided.logoUrl || provided.address)) {
    return provided;
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = localStorage.getItem('masala_company_profile');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          return {
            ...DEFAULT_COMPANY,
            ...parsed
          };
        }
      }
    } catch {
      // fallback
    }
  }
  return provided || DEFAULT_COMPANY;
};

/**
 * Fallback helpers to read stored bills and payments if not explicitly passed
 */
const getStoredSalesBills = (): SalesBill[] => {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = localStorage.getItem('masala_sales_bills');
      if (raw) return JSON.parse(raw);
    } catch {}
  }
  return [];
};

const getStoredPaymentsReceived = (): PaymentReceived[] => {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = localStorage.getItem('masala_payments_received');
      if (raw) return JSON.parse(raw);
    } catch {}
  }
  return [];
};

/**
 * Draw official watermark on every page of document
 * Uses the exact saved company logo from Settings as a subtle, semi-transparent watermark.
 * Centered on each page without distorting or obscuring text/amounts/signatures.
 */
export const addWatermark = (
  doc: jsPDF, 
  company: CompanyProfile = DEFAULT_COMPANY, 
  fallbackText = 'MASALA FACTORY ORIGINAL'
) => {
  const activeCompany = getStoredCompanyProfile(company);
  const logoUrl = activeCompany.logoUrl;
  const totalPages = doc.getNumberOfPages();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.saveGraphicsState();

    if (logoUrl) {
      try {
        let aspect = 1;
        let format = 'PNG';
        try {
          const props = doc.getImageProperties(logoUrl);
          if (props && props.width && props.height) {
            aspect = props.width / props.height;
            format = props.fileType || (logoUrl.includes('jpeg') || logoUrl.includes('jpg') ? 'JPEG' : 'PNG');
          }
        } catch {
          format = (logoUrl.includes('jpeg') || logoUrl.includes('jpg')) ? 'JPEG' : 'PNG';
        }

        // Bounding box: 105mm x 105mm max, maintaining exact aspect ratio without stretching
        let w = 105;
        let h = w / aspect;
        if (h > 105) {
          h = 105;
          w = h * aspect;
        }

        // Center on standard A4 page (210mm x 297mm)
        const x = (210 - w) / 2;
        const y = (297 - h) / 2;

        // Apply semi-transparent graphic state (0.07 opacity so table text & numbers remain crisp)
        const gState = new (doc as any).GState({ opacity: 0.07 });
        doc.setGState(gState);
        doc.addImage(logoUrl, format, x, y, w, h);
      } catch (err) {
        console.warn('Could not render logo watermark, using subtle text fallback', err);
        const gState = new (doc as any).GState({ opacity: 0.07 });
        doc.setGState(gState);
        doc.setTextColor(200, 210, 220);
        doc.setFontSize(32);
        doc.setFont('helvetica', 'bold');
        doc.text(fallbackText, 105, 155, { align: 'center', angle: 45 });
      }
    } else {
      // Fallback text watermark when no logo is set
      const gState = new (doc as any).GState({ opacity: 0.07 });
      doc.setGState(gState);
      doc.setTextColor(200, 210, 220);
      doc.setFontSize(32);
      doc.setFont('helvetica', 'bold');
      doc.text(fallbackText, 105, 155, { align: 'center', angle: 45 });
    }

    doc.restoreGraphicsState();
  }
};

/**
 * Draw Company Header & Document Details on Page 1
 * Displays the same saved logo clearly in the header alongside company details.
 */
const drawCompanyHeader = (
  doc: jsPDF, 
  company: CompanyProfile = DEFAULT_COMPANY, 
  docTitle: string, 
  docNumber?: string
): number => {
  const activeCompany = getStoredCompanyProfile(company);
  const leftX = 14;
  let topY = 14;

  // Draw top emerald accent line
  doc.setFillColor(5, 150, 105); // emerald-600
  doc.rect(14, topY, 182, 3, 'F');
  topY += 8;

  // Add Company Logo if available (proportional, non-distorted)
  let textLeftX = leftX;
  if (activeCompany.logoUrl) {
    try {
      let aspect = 1;
      let format = 'PNG';
      try {
        const props = doc.getImageProperties(activeCompany.logoUrl);
        if (props && props.width && props.height) {
          aspect = props.width / props.height;
          format = props.fileType || (activeCompany.logoUrl.includes('jpeg') || activeCompany.logoUrl.includes('jpg') ? 'JPEG' : 'PNG');
        }
      } catch {
        format = (activeCompany.logoUrl.includes('jpeg') || activeCompany.logoUrl.includes('jpg')) ? 'JPEG' : 'PNG';
      }

      // Max header logo box: 24mm wide, 20mm high
      let w = 24;
      let h = w / aspect;
      if (h > 20) {
        h = 20;
        w = h * aspect;
      }

      const imgY = topY + (20 - h) / 2;
      doc.addImage(activeCompany.logoUrl, format, leftX, imgY, w, h);
      textLeftX = leftX + w + 5;
    } catch (e) {
      console.warn('Could not draw header logo', e);
      textLeftX = leftX;
    }
  }

  // Company Name & Info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(activeCompany.name, textLeftX, topY + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105); // slate-600
  const addressLine = [activeCompany.address, activeCompany.city].filter(Boolean).join(', ');
  if (addressLine) {
    doc.text(addressLine, textLeftX, topY + 9);
  }
  const contactLine = [
    activeCompany.phone ? `Phone: ${activeCompany.phone}` : '', 
    activeCompany.email ? `Email: ${activeCompany.email}` : ''
  ].filter(Boolean).join(' | ');
  if (contactLine) {
    doc.text(contactLine, textLeftX, topY + 13.5);
  }
  if (activeCompany.taxNumber) {
    doc.setFont('courier', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(activeCompany.taxNumber, textLeftX, topY + 18);
  }

  // Right Side: Document Title Badge
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(5, 150, 105);
  doc.text(docTitle.toUpperCase(), 196, topY + 5, { align: 'right', maxWidth: 85 });

  if (docNumber) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(`Doc #: ${docNumber}`, 196, topY + 11, { align: 'right' });
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Date: ${formatDate(new Date().toISOString())}`, 196, topY + 16, { align: 'right' });

  // Divider Line
  const headerBottomY = topY + 23;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, headerBottomY, 196, headerBottomY);

  return headerBottomY + 5;
};

/**
 * Draw Compact Header on Continued Pages
 */
const drawContinuationHeader = (
  doc: jsPDF, 
  company: CompanyProfile = DEFAULT_COMPANY, 
  docTitle: string, 
  docNumber?: string
): number => {
  const activeCompany = getStoredCompanyProfile(company);
  const topY = 12;

  // Thin top accent
  doc.setFillColor(5, 150, 105);
  doc.rect(14, topY, 182, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`${activeCompany.name} — ${docTitle} (Continued)`, 14, topY + 6);

  if (docNumber) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(5, 150, 105);
    doc.text(`Doc #: ${docNumber}`, 196, topY + 6, { align: 'right' });
  }

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, topY + 9, 196, topY + 9);

  return topY + 13;
};

/**
 * Draw Document Footer on All Pages
 */
const drawFooter = (doc: jsPDF, totalPages: number) => {
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(14, 282, 196, 282);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Masala Factory Business Management System — B2B Operations', 14, 286.5);
    doc.text(`Page ${i} of ${totalPages}`, 196, 286.5, { align: 'right' });
  }
};

/* =========================================================================
   1. SALES BILL PDF GENERATOR
   ========================================================================= */
export const generateSalesBillPDF = (bill: SalesBill, company: CompanyProfile = DEFAULT_COMPANY): jsPDF => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = drawCompanyHeader(doc, company, 'Sales Tax Invoice', bill.billNumber);

  // Bill Meta & Customer Info Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, y, 182, 26, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, y, 182, 26, 2, 2, 'S');

  // Customer Details (Left)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('BILLED TO (CUSTOMER):', 18, y + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  // Truncate or wrap customer name if very long
  const customerNameLines = doc.splitTextToSize(bill.partyName || 'Customer', 95);
  doc.text(customerNameLines[0], 18, y + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Contact: ${bill.partyPhone || 'N/A'}`, 18, y + 15);
  doc.text(`Branch: ${resolveFactoryName(bill.branchId, bill.branchName)}`, 18, y + 20);

  // Invoice Details (Right)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('INVOICE METRICS:', 125, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Invoice Date: ${formatDate(bill.billDate)}`, 125, y + 10);
  doc.text(`Factory Branch: ${bill.branchName || resolveFactoryName(bill.branchId)}`, 125, y + 15);
  
  // Status pill
  const statusColor = bill.status === 'Paid' ? [22, 163, 74] : (bill.status === 'Partially Paid' ? [217, 119, 6] : [220, 38, 38]);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.text(`Status: ${bill.status.toUpperCase()}`, 125, y + 20);

  y += 31;

  // Table Drawing Function
  const drawTableHeader = (curY: number): number => {
    doc.setFillColor(15, 23, 42);
    doc.rect(14, curY, 182, 6.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text('#', 17, curY + 4.5);
    doc.text('Product / Spice Item', 26, curY + 4.5);
    doc.text('Packaging / Unit', 104, curY + 4.5);
    doc.text('Qty', 138, curY + 4.5, { align: 'right' });
    doc.text('Rate (PKR)', 166, curY + 4.5, { align: 'right' });
    doc.text('Total (PKR)', 192, curY + 4.5, { align: 'right' });
    return curY + 6.5;
  };

  y = drawTableHeader(y);

  // Line items with dynamic wrapping and page break protection
  bill.items.forEach((item, idx) => {
    // Wrap product name and unit
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    const prodLines = doc.splitTextToSize(item.productName || 'Item', 74);
    const unitLines = doc.splitTextToSize(item.unit || 'Standard', 26);
    const lineCount = Math.max(prodLines.length, unitLines.length, 1);
    const rowHeight = Math.max(6.5, lineCount * 3.8 + 2.5);

    // Page break check
    if (y + rowHeight > 255) {
      doc.addPage();
      y = drawContinuationHeader(doc, company, 'Sales Tax Invoice', bill.billNumber);
      y = drawTableHeader(y);
    }

    const isOdd = idx % 2 === 1;
    if (isOdd) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y, 182, rowHeight, 'F');
    }
    doc.setDrawColor(241, 245, 249);
    doc.line(14, y + rowHeight, 196, y + rowHeight);

    doc.setTextColor(15, 23, 42);
    doc.text((idx + 1).toString(), 17, y + 4.2);
    doc.text(prodLines, 26, y + 4.2);
    doc.text(unitLines, 104, y + 4.2);
    doc.text(item.quantity.toLocaleString(), 138, y + 4.2, { align: 'right' });
    doc.text(item.rate.toLocaleString(), 166, y + 4.2, { align: 'right' });
    
    doc.setFont('helvetica', 'bold');
    doc.text(item.lineTotal.toLocaleString(), 192, y + 4.2, { align: 'right' });
    doc.setFont('helvetica', 'normal');

    y += rowHeight;
  });

  y += 4;

  // Check if totals box and signatures fit on current page; otherwise add new page
  if (y + 55 > 265) {
    doc.addPage();
    y = drawContinuationHeader(doc, company, 'Sales Tax Invoice', bill.billNumber);
  }

  // Totals Box
  const totalsBoxX = 115;
  const totalsBoxW = 81;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(totalsBoxX, y, totalsBoxW, 30, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(totalsBoxX, y, totalsBoxW, 30, 2, 2, 'S');

  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Invoice Grand Total:', totalsBoxX + 4, y + 6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(formatPKR(bill.grandTotal), totalsBoxX + totalsBoxW - 4, y + 6.5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Amount Received:', totalsBoxX + 4, y + 14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 163, 74);
  doc.text(formatPKR(bill.receivedAmount), totalsBoxX + totalsBoxW - 4, y + 14, { align: 'right' });

  doc.setDrawColor(226, 232, 240);
  doc.line(totalsBoxX + 4, y + 18, totalsBoxX + totalsBoxW - 4, y + 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(bill.remainingAmount > 0 ? 220 : 22, bill.remainingAmount > 0 ? 38 : 163, bill.remainingAmount > 0 ? 38 : 74);
  doc.text('Balance Due:', totalsBoxX + 4, y + 25);
  doc.text(formatPKR(bill.remainingAmount), totalsBoxX + totalsBoxW - 4, y + 25, { align: 'right' });

  // Notes & Instructions on Left
  if (bill.notes) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('SPECIAL NOTES / INSTRUCTIONS:', 14, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    const noteLines = doc.splitTextToSize(bill.notes, 92);
    doc.text(noteLines, 14, y + 11);
  }

  // Signatures on last page
  const sigY = 250;
  doc.setDrawColor(203, 213, 225);
  doc.line(14, sigY, 65, sigY);
  doc.line(145, sigY, 196, sigY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Customer Signature & Stamp', 14, sigY + 4);
  doc.text('For Masala Factory Authorized Signatory', 145, sigY + 4);

  addWatermark(doc, company, 'MASALA FACTORY ORIGINAL');
  drawFooter(doc, doc.getNumberOfPages());
  return doc;
};

/* =========================================================================
   2. PURCHASE BILL PDF GENERATOR
   ========================================================================= */
export const generatePurchaseBillPDF = (purchase: PurchaseBill, company: CompanyProfile = DEFAULT_COMPANY): jsPDF => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = drawCompanyHeader(doc, company, 'Purchase Voucher', purchase.billNumber);

  // Supplier & Voucher Meta Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, y, 182, 26, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, y, 182, 26, 2, 2, 'S');

  // Supplier Details (Left)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('SUPPLIER / VENDOR:', 18, y + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  const supplierLines = doc.splitTextToSize(purchase.supplierName || 'Supplier', 95);
  doc.text(supplierLines[0], 18, y + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Supplier Bill Ref: ${purchase.billNumber || 'N/A'}`, 18, y + 15);
  doc.text(`Branch: ${resolveFactoryName(purchase.branchId)}`, 18, y + 20);

  // Metrics (Right)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('VOUCHER METRICS:', 125, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Purchase Date: ${formatDate(purchase.billDate)}`, 125, y + 10);
  doc.text(`Factory Branch: ${resolveFactoryName(purchase.branchId)}`, 125, y + 15);

  const statusColor = purchase.status === 'Paid' ? [22, 163, 74] : (purchase.status === 'Partially Paid' ? [217, 119, 6] : [220, 38, 38]);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.text(`Status: ${(purchase.status || 'Unpaid').toUpperCase()}`, 125, y + 20);

  y += 31;

  const drawTableHeader = (curY: number): number => {
    doc.setFillColor(15, 23, 42);
    doc.rect(14, curY, 182, 6.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text('#', 17, curY + 4.5);
    doc.text('Raw Material / Spice Item', 26, curY + 4.5);
    doc.text('Packaging / Unit', 104, curY + 4.5);
    doc.text('Qty', 138, curY + 4.5, { align: 'right' });
    doc.text('Rate (PKR)', 166, curY + 4.5, { align: 'right' });
    doc.text('Total (PKR)', 192, curY + 4.5, { align: 'right' });
    return curY + 6.5;
  };

  y = drawTableHeader(y);

  // Line items
  purchase.items.forEach((item, idx) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    const prodLines = doc.splitTextToSize(item.productName || 'Raw Material', 74);
    const unitLines = doc.splitTextToSize(item.unit || 'Kg', 26);
    const lineCount = Math.max(prodLines.length, unitLines.length, 1);
    const rowHeight = Math.max(6.5, lineCount * 3.8 + 2.5);

    if (y + rowHeight > 255) {
      doc.addPage();
      y = drawContinuationHeader(doc, company, 'Purchase Voucher', purchase.billNumber);
      y = drawTableHeader(y);
    }

    const isOdd = idx % 2 === 1;
    if (isOdd) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y, 182, rowHeight, 'F');
    }
    doc.setDrawColor(241, 245, 249);
    doc.line(14, y + rowHeight, 196, y + rowHeight);

    doc.setTextColor(15, 23, 42);
    doc.text((idx + 1).toString(), 17, y + 4.2);
    doc.text(prodLines, 26, y + 4.2);
    doc.text(unitLines, 104, y + 4.2);
    doc.text(item.quantity.toLocaleString(), 138, y + 4.2, { align: 'right' });
    doc.text(item.rate.toLocaleString(), 166, y + 4.2, { align: 'right' });
    
    doc.setFont('helvetica', 'bold');
    doc.text(item.lineTotal.toLocaleString(), 192, y + 4.2, { align: 'right' });
    doc.setFont('helvetica', 'normal');

    y += rowHeight;
  });

  y += 4;

  if (y + 55 > 265) {
    doc.addPage();
    y = drawContinuationHeader(doc, company, 'Purchase Voucher', purchase.billNumber);
  }

  // Totals Box
  const totalsBoxX = 115;
  const totalsBoxW = 81;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(totalsBoxX, y, totalsBoxW, 30, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(totalsBoxX, y, totalsBoxW, 30, 2, 2, 'S');

  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Purchase Grand Total:', totalsBoxX + 4, y + 6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(formatPKR(purchase.grandTotal), totalsBoxX + totalsBoxW - 4, y + 6.5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Amount Paid:', totalsBoxX + 4, y + 14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 163, 74);
  doc.text(formatPKR(purchase.amountPaid), totalsBoxX + totalsBoxW - 4, y + 14, { align: 'right' });

  doc.setDrawColor(226, 232, 240);
  doc.line(totalsBoxX + 4, y + 18, totalsBoxX + totalsBoxW - 4, y + 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(purchase.outstandingAmount > 0 ? 220 : 22, purchase.outstandingAmount > 0 ? 38 : 163, purchase.outstandingAmount > 0 ? 38 : 74);
  doc.text('Payable Balance:', totalsBoxX + 4, y + 25);
  doc.text(formatPKR(purchase.outstandingAmount), totalsBoxX + totalsBoxW - 4, y + 25, { align: 'right' });

  if (purchase.notes) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('SUPPLIER NOTES / MEMO:', 14, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    const noteLines = doc.splitTextToSize(purchase.notes, 92);
    doc.text(noteLines, 14, y + 11);
  }

  const sigY = 250;
  doc.setDrawColor(203, 213, 225);
  doc.line(14, sigY, 65, sigY);
  doc.line(145, sigY, 196, sigY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Supplier Signature / Delivery Stamp', 14, sigY + 4);
  doc.text('Factory Receiving Officer & Stamp', 145, sigY + 4);

  addWatermark(doc, company, 'PURCHASE VOUCHER');
  drawFooter(doc, doc.getNumberOfPages());
  return doc;
};

/* =========================================================================
   3. PAYMENT RECEIVED PDF GENERATOR (WITH EXACT FINANCIAL BREAKDOWN & NARRATIVE)
   ========================================================================= */
export const generatePaymentReceivedPDF = (
  payment: PaymentReceived, 
  company: CompanyProfile = DEFAULT_COMPANY,
  party?: Party,
  allBills?: SalesBill[],
  allPayments?: PaymentReceived[]
): jsPDF => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = drawCompanyHeader(doc, company, 'Official Payment Receipt', payment.receiptNumber);

  // Compute exact financial breakdown
  const bills = (allBills && allBills.length > 0) ? allBills : getStoredSalesBills();
  const payments = (allPayments && allPayments.length > 0) ? allPayments : getStoredPaymentsReceived();
  const breakdowns: DetailedBillPaymentBreakdown[] = computePaymentReceiptBreakdown(payment, bills, payments);

  // Payer and Receipt Card
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, y, 182, 30, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, y, 182, 30, 2, 2, 'S');

  // Party info (Left)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('RECEIVED FROM (CUSTOMER):', 18, y + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(payment.partyName || 'Customer Party', 18, y + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Phone: ${payment.partyPhone || party?.phone || 'N/A'}`, 18, y + 16.5);
  doc.text(`Branch: ${resolveFactoryName(payment.branchId)}`, 18, y + 21.5);

  // Receipt details (Right)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('PAYMENT DETAILS:', 125, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  const timeStr = payment.paymentTime ? ` at ${payment.paymentTime}` : '';
  doc.text(`Date: ${formatDate(payment.paymentDate)}${timeStr}`, 125, y + 11);
  doc.text(`Method: ${payment.paymentMethod}`, 125, y + 16.5);
  if (payment.referenceNo) {
    doc.text(`Ref / Trx #: ${payment.referenceNo}`, 125, y + 21.5);
  } else {
    doc.text(`Status: ${(payment.status || 'Completed').toUpperCase()}`, 125, y + 21.5);
  }

  y += 35;

  // Prominent Amount Collected Banner
  doc.setFillColor(236, 253, 245); // emerald-50
  doc.roundedRect(14, y, 182, 16, 2, 2, 'F');
  doc.setDrawColor(167, 243, 208); // emerald-200
  doc.roundedRect(14, y, 182, 16, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(6, 95, 70);
  doc.text('TOTAL AMOUNT RECEIVED IN THIS TRANSACTION:', 20, y + 10);

  doc.setFontSize(13);
  doc.setTextColor(4, 120, 87);
  doc.text(formatPKR(payment.amountReceived), 188, y + 10.5, { align: 'right' });

  y += 22;

  // Detailed Bill Allocation & Financial Breakdown
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('DETAILED BILL-WISE FINANCIAL BREAKDOWN', 14, y);
  y += 4.5;

  if (breakdowns.length === 0) {
    // General Ledger Payment
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, y, 182, 16, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, y, 182, 16, 2, 2, 'S');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('General customer account deposit. Amount credited directly to customer ledger balance.', 18, y + 9);
    y += 22;
  } else {
    // Render Breakdown Table Header
    const drawBreakdownHeader = (curY: number): number => {
      doc.setFillColor(15, 23, 42);
      doc.rect(14, curY, 182, 6.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      doc.text('Bill Number', 18, curY + 4.5);
      doc.text('Bill Date', 45, curY + 4.5);
      doc.text('Original Bill', 85, curY + 4.5, { align: 'right' });
      doc.text('Previously Paid', 120, curY + 4.5, { align: 'right' });
      doc.text('This Payment', 155, curY + 4.5, { align: 'right' });
      doc.text('Remaining Balance', 192, curY + 4.5, { align: 'right' });
      return curY + 6.5;
    };

    y = drawBreakdownHeader(y);

    breakdowns.forEach((item, idx) => {
      // Calculate height needed for row + narrative callout
      const narrativeLines = doc.splitTextToSize(item.narrative, 172);
      const narrativeHeight = Math.max(10, narrativeLines.length * 3.8 + 5);
      const totalBlockHeight = 8 + narrativeHeight + 4;

      if (y + totalBlockHeight > 255) {
        doc.addPage();
        y = drawContinuationHeader(doc, company, 'Official Payment Receipt', payment.receiptNumber);
        y = drawBreakdownHeader(y);
      }

      // Numeric row
      const isOdd = idx % 2 === 1;
      if (isOdd) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y, 182, 7, 'F');
      }
      doc.setDrawColor(241, 245, 249);
      doc.line(14, y + 7, 196, y + 7);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(5, 150, 105);
      doc.text(item.billNumber, 18, y + 4.8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(formatDate(item.billDate), 45, y + 4.8);

      doc.setTextColor(15, 23, 42);
      doc.text(formatPKR(item.originalBillTotal), 85, y + 4.8, { align: 'right' });
      doc.text(formatPKR(item.previouslyReceived), 120, y + 4.8, { align: 'right' });

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(5, 150, 105);
      doc.text(formatPKR(item.amountThisPayment), 155, y + 4.8, { align: 'right' });

      doc.setTextColor(item.remainingBalance > 0 ? 220 : 22, item.remainingBalance > 0 ? 38 : 163, item.remainingBalance > 0 ? 38 : 74);
      doc.text(formatPKR(item.remainingBalance), 192, y + 4.8, { align: 'right' });

      y += 8.5;

      // Exact Clear Narrative Callout Card
      doc.setFillColor(240, 253, 244); // emerald-50
      doc.roundedRect(14, y, 182, narrativeHeight, 1.5, 1.5, 'F');
      doc.setDrawColor(187, 247, 208); // emerald-200
      doc.roundedRect(14, y, 182, narrativeHeight, 1.5, 1.5, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(22, 101, 52);
      doc.text('Breakdown Note:', 18, y + 4.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(21, 128, 61);
      doc.text(narrativeLines, 42, y + 4.5);

      y += narrativeHeight + 4;
    });
  }

  // Notes & Signatures
  if (payment.notes) {
    if (y + 20 > 255) {
      doc.addPage();
      y = drawContinuationHeader(doc, company, 'Official Payment Receipt', payment.receiptNumber);
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('REMARKS / AUDIT NOTES:', 14, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    const noteLines = doc.splitTextToSize(payment.notes, 178);
    doc.text(noteLines, 14, y + 4.5);
    y += noteLines.length * 3.8 + 6;
  }

  // Signatures on last page
  const sigY = 250;
  doc.setDrawColor(203, 213, 225);
  doc.line(14, sigY, 65, sigY);
  doc.line(145, sigY, 196, sigY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Payer Signature', 14, sigY + 4);
  doc.text('Cashier / Authorized Receiver Stamp', 145, sigY + 4);

  addWatermark(doc, company, 'PAYMENT RECEIVED');
  drawFooter(doc, doc.getNumberOfPages());
  return doc;
};

/* =========================================================================
   4. EXPENSE VOUCHER PDF GENERATOR
   ========================================================================= */
export const generateExpensePDF = (expense: Expense, company: CompanyProfile = DEFAULT_COMPANY): jsPDF => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = drawCompanyHeader(doc, company, 'Factory Expense Voucher', expense.expenseNumber);

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, y, 182, 32, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, y, 182, 32, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('EXPENSE CLASSIFICATION:', 18, y + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(expense.category, 18, y + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Paid To / Vendor: ${expense.paidTo || 'N/A'}`, 18, y + 16.5);
  doc.text(`Branch: ${resolveFactoryName(expense.branchId)}`, 18, y + 22);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('VOUCHER METRICS:', 125, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Expense Date: ${formatDate(expense.expenseDate)}`, 125, y + 11);
  doc.text(`Payment Method: ${expense.paymentMethod}`, 125, y + 16.5);
  doc.text(`Proof Status: ${expense.proofStatus || 'Not Required'}`, 125, y + 22);

  y += 38;

  // Expense Amount Box
  doc.setFillColor(254, 242, 242); // rose-50
  doc.roundedRect(14, y, 182, 16, 2, 2, 'F');
  doc.setDrawColor(254, 202, 202); // rose-200
  doc.roundedRect(14, y, 182, 16, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(153, 27, 27);
  doc.text('TOTAL EXPENSE AMOUNT:', 20, y + 10);

  doc.setFontSize(13);
  doc.setTextColor(185, 28, 28);
  doc.text(formatPKR(expense.amount), 188, y + 10.5, { align: 'right' });

  y += 22;

  // Purpose & Details Box with Dynamic Wrapping
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('EXPLANATION & PURPOSE OF EXPENSE', 14, y);
  y += 5;

  const descText = expense.notes || expense.title || 'Factory operating and production maintenance expense.';
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const descLines = doc.splitTextToSize(descText, 172);
  const boxHeight = Math.max(22, descLines.length * 4.2 + 8);

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, y, 182, boxHeight, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, y, 182, boxHeight, 2, 2, 'S');

  doc.setTextColor(71, 85, 105);
  doc.text(descLines, 18, y + 7);

  y += boxHeight + 10;

  // Signatures
  const sigY = 250;
  doc.setDrawColor(203, 213, 225);
  doc.line(14, sigY, 65, sigY);
  doc.line(145, sigY, 196, sigY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Prepared By / Cashier', 14, sigY + 4);
  doc.text('Factory Manager Approval & Stamp', 145, sigY + 4);

  addWatermark(doc, company, 'EXPENSE VOUCHER');
  drawFooter(doc, doc.getNumberOfPages());
  return doc;
};

/* =========================================================================
   5. SUPPLIER PAYMENT PDF GENERATOR
   ========================================================================= */
export const generateSupplierPaymentPDF = (payment: SupplierPayment, company: CompanyProfile = DEFAULT_COMPANY): jsPDF => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = drawCompanyHeader(doc, company, 'Supplier Payment Voucher', payment.receiptNumber);

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, y, 182, 32, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, y, 182, 32, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('PAID TO SUPPLIER:', 18, y + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(payment.supplierName, 18, y + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Purchase Bill Reference: ${payment.purchaseBillNumber}`, 18, y + 16.5);
  doc.text(`Branch: ${resolveFactoryName(payment.branchId)}`, 18, y + 22);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('DISBURSEMENT METRICS:', 125, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Date Paid: ${formatDate(payment.paymentDate)}`, 125, y + 11);
  doc.text(`Method: ${payment.paymentMethod}`, 125, y + 16.5);
  if (payment.referenceNo) {
    doc.text(`Bank / Trx Ref: ${payment.referenceNo}`, 125, y + 22);
  }

  y += 38;

  // Amount disbursed box
  doc.setFillColor(236, 253, 245);
  doc.roundedRect(14, y, 182, 16, 2, 2, 'F');
  doc.setDrawColor(167, 243, 208);
  doc.roundedRect(14, y, 182, 16, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(6, 95, 70);
  doc.text('AMOUNT DISBURSED TO SUPPLIER:', 20, y + 10);

  doc.setFontSize(13);
  doc.setTextColor(4, 120, 87);
  doc.text(formatPKR(payment.amountPaid), 188, y + 10.5, { align: 'right' });

  y += 22;

  if (payment.remainingPayable !== undefined) {
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, y, 182, 14, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, y, 182, 14, 2, 2, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`Remaining Balance on Purchase Bill ${payment.purchaseBillNumber}:`, 20, y + 8.5);
    doc.setTextColor(220, 38, 38);
    doc.text(formatPKR(payment.remainingPayable), 188, y + 8.5, { align: 'right' });
    y += 18;
  }

  if (payment.notes) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('PAYMENT MEMO / NOTES:', 14, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    const noteLines = doc.splitTextToSize(payment.notes, 178);
    doc.text(noteLines, 14, y + 4.5);
  }

  const sigY = 250;
  doc.setDrawColor(203, 213, 225);
  doc.line(14, sigY, 65, sigY);
  doc.line(145, sigY, 196, sigY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Authorized Finance Officer', 14, sigY + 4);
  doc.text('Supplier Signature / Acknowledgment', 145, sigY + 4);

  addWatermark(doc, company, 'SUPPLIER DISBURSEMENT');
  drawFooter(doc, doc.getNumberOfPages());
  return doc;
};

/* =========================================================================
   6. PARTY LEDGER STATEMENT PDF GENERATOR
   ========================================================================= */
export const generateLedgerStatementPDF = (
  party: Party,
  transactions: LedgerTransaction[],
  startDate: string,
  endDate: string,
  company: CompanyProfile = DEFAULT_COMPANY,
  branchName: string = 'All Branches'
): jsPDF => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = drawCompanyHeader(doc, company, 'Statement of Account', `STMT-${party.id.toUpperCase()}`);

  // Summary Metrics
  const totalSales = transactions
    .filter(t => t.type === 'Sales Bill')
    .reduce((sum, t) => sum + t.billTotal, 0);

  const totalPayments = transactions
    .filter(t => t.type === 'Payment Received')
    .reduce((sum, t) => sum + t.paymentAmount, 0);

  const totalPurchases = transactions
    .filter(t => t.type === 'Purchase Bill')
    .reduce((sum, t) => sum + t.billTotal, 0);

  const totalSupplierPayments = transactions
    .filter(t => t.type === 'Supplier Payment')
    .reduce((sum, t) => sum + t.paymentAmount, 0);

  const netBalance = (totalSales - totalPayments) + (totalPurchases - totalSupplierPayments);

  // Meta Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, y, 182, 26, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, y, 182, 26, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('PARTY ACCOUNT:', 18, y + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(party.name + (party.companyName ? ` (${party.companyName})` : ''), 18, y + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Phone: ${party.phone} | Type: ${party.type}`, 18, y + 15);
  doc.text(`Address: ${[party.address, party.city].filter(Boolean).join(', ') || 'N/A'}`, 18, y + 20);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('PERIOD & BRANCH:', 125, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`From: ${startDate ? formatDate(startDate) : 'Beginning'}`, 125, y + 10);
  doc.text(`To: ${endDate ? formatDate(endDate) : 'Present Date'}`, 125, y + 15);
  doc.text(`Scope: ${branchName}`, 125, y + 20);

  y += 30;

  // 4 Summary Metric Cards
  const cardW = 43;
  const cardGap = 3.3;
  const startX = 14;

  const cards = [
    { label: 'Total Invoiced', value: formatPKR(totalSales), color: [15, 23, 42] },
    { label: 'Payments Received', value: formatPKR(totalPayments), color: [22, 163, 74] },
    { label: 'Total Purchases', value: formatPKR(totalPurchases), color: [15, 23, 42] },
    { label: 'Net Balance Due', value: formatPKR(netBalance), color: netBalance > 0 ? [220, 38, 38] : [22, 163, 74] }
  ];

  cards.forEach((c, idx) => {
    const cx = startX + idx * (cardW + cardGap);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(cx, y, cardW, 14, 1.5, 1.5, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(cx, y, cardW, 14, 1.5, 1.5, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(c.label.toUpperCase(), cx + cardW / 2, y + 4.5, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(c.color[0], c.color[1], c.color[2]);
    doc.text(c.value, cx + cardW / 2, y + 10.5, { align: 'center' });
  });

  y += 18;

  // Ledger Table Header
  const drawTableHeader = (curY: number): number => {
    doc.setFillColor(15, 23, 42);
    doc.rect(14, curY, 182, 6.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text('Date & Time', 17, curY + 4.5);
    doc.text('Type', 46, curY + 4.5);
    doc.text('Bill / Ref #', 76, curY + 4.5);
    doc.text('Description', 104, curY + 4.5);
    doc.text('Invoice Total', 146, curY + 4.5, { align: 'right' });
    doc.text('Paid / Received', 171, curY + 4.5, { align: 'right' });
    doc.text('Balance', 193, curY + 4.5, { align: 'right' });
    return curY + 6.5;
  };

  y = drawTableHeader(y);

  // Transactions rows with dynamic line wrapping and pagination
  transactions.forEach((t, idx) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    const descLines = doc.splitTextToSize(t.description || '-', 38);
    const rowHeight = Math.max(6, descLines.length * 3.5 + 2);

    if (y + rowHeight > 265) {
      doc.addPage();
      y = drawContinuationHeader(doc, company, 'Statement of Account', `STMT-${party.id.toUpperCase()}`);
      y = drawTableHeader(y);
    }

    const isOdd = idx % 2 === 1;
    if (isOdd) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y, 182, rowHeight, 'F');
    }
    doc.setDrawColor(241, 245, 249);
    doc.line(14, y + rowHeight, 196, y + rowHeight);

    doc.setTextColor(15, 23, 42);
    const dateDisplay = t.displayTime ? `${t.displayDate || formatDate(t.date)} ${t.displayTime}` : (t.displayDate || formatDate(t.date));
    doc.text(dateDisplay, 17, y + 4.2);
    doc.text(t.type, 46, y + 4.2);
    doc.text(t.billNumber || '-', 76, y + 4.2);
    doc.text(descLines, 104, y + 4.2);
    
    // Debit / Bill Total
    doc.text(t.billTotal > 0 ? formatPKR(t.billTotal) : '-', 146, y + 4.2, { align: 'right' });

    // Credit / Payment
    if (t.paymentAmount > 0) {
      doc.setTextColor(22, 163, 74);
      doc.text(formatPKR(t.paymentAmount), 171, y + 4.2, { align: 'right' });
    } else {
      doc.setTextColor(100, 116, 139);
      doc.text('-', 171, y + 4.2, { align: 'right' });
    }

    // Remaining Balance
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(formatPKR(t.remainingBalance), 193, y + 4.2, { align: 'right' });
    doc.setFont('helvetica', 'normal');

    y += rowHeight;
  });

  addWatermark(doc, company, 'OFFICIAL STATEMENT');
  drawFooter(doc, doc.getNumberOfPages());
  return doc;
};

/* =========================================================================
   7. PDF DOWNLOAD & SHARING DISPATCHER
   ========================================================================= */
export const downloadPDFDirect = (
  doc: jsPDF,
  filename: string
): { downloaded: boolean } => {
  const cleanFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  doc.save(cleanFilename);
  return { downloaded: true };
};

export const shareOrDownloadPDF = async (
  doc: jsPDF, 
  filename: string, 
  _title?: string
): Promise<{ shared: boolean; downloaded: boolean }> => {
  const cleanFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  doc.save(cleanFilename);
  return { shared: false, downloaded: true };
};

export const generateAuditReportPDF = (params: {
  reportTitle: string;
  category: string;
  branchName: string;
  startDate?: string;
  endDate?: string;
  summaryCards: Array<{ label: string; value: string }>;
  headers: string[];
  rows: Array<string[]>;
}, company: CompanyProfile = DEFAULT_COMPANY): jsPDF => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const activeCompany = getStoredCompanyProfile(company);

  // 1. Top Emerald Accent Line
  const leftX = 14;
  let topY = 14;
  doc.setFillColor(5, 150, 105); // emerald-600
  doc.rect(14, topY, 182, 3, 'F');
  topY += 8;

  // 2. Company Logo (proportional, non-distorted)
  let textLeftX = leftX;
  if (activeCompany.logoUrl) {
    try {
      let aspect = 1;
      let format = 'PNG';
      try {
        const props = doc.getImageProperties(activeCompany.logoUrl);
        if (props && props.width && props.height) {
          aspect = props.width / props.height;
          format = props.fileType || (activeCompany.logoUrl.includes('jpeg') || activeCompany.logoUrl.includes('jpg') ? 'JPEG' : 'PNG');
        }
      } catch {
        format = (activeCompany.logoUrl.includes('jpeg') || activeCompany.logoUrl.includes('jpg')) ? 'JPEG' : 'PNG';
      }

      let w = 24;
      let h = w / aspect;
      if (h > 20) {
        h = 20;
        w = h * aspect;
      }

      const imgY = topY + (20 - h) / 2;
      doc.addImage(activeCompany.logoUrl, format, leftX, imgY, w, h);
      textLeftX = leftX + w + 5;
    } catch (e) {
      console.warn('Could not draw header logo', e);
      textLeftX = leftX;
    }
  }

  // 3. Factory Name & Details (strictly on left, width-constrained so it never collides with right side)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42); // slate-900
  const companyNameLines = doc.splitTextToSize(activeCompany.name, 95);
  doc.text(companyNameLines, textLeftX, topY + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  const addressLine = [activeCompany.address, activeCompany.city].filter(Boolean).join(', ');
  if (addressLine) {
    doc.text(addressLine, textLeftX, topY + 9);
  }
  const contactLine = [
    activeCompany.phone ? `Phone: ${activeCompany.phone}` : '', 
    activeCompany.email ? `Email: ${activeCompany.email}` : ''
  ].filter(Boolean).join(' | ');
  if (contactLine) {
    doc.text(contactLine, textLeftX, topY + 13);
  }
  if (activeCompany.taxNumber) {
    doc.setFont('courier', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(activeCompany.taxNumber, textLeftX, topY + 17);
  }

  // 4. Header Top-Right Meta Info (Clean, right-aligned, independent position)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(5, 150, 105);
  doc.text('MANAGEMENT AUDIT REPORT', 196, topY + 4, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated: ${formatDate(new Date().toISOString())}`, 196, topY + 9, { align: 'right' });
  doc.text(`Scope: ${params.branchName}`, 196, topY + 13.5, { align: 'right' });

  // 5. Divider Line separating company identity from report title
  const dividerY = topY + 21;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, dividerY, 196, dividerY);

  // 6. Dedicated Report Title & Filter Bar Banner (Below company info with proper vertical clearance)
  const bannerY = dividerY + 4;
  const bannerH = 16;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, bannerY, 182, bannerH, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, bannerY, 182, bannerH, 2, 2, 'S');

  // Report Title (Inside banner, bold and distinct)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(params.reportTitle.toUpperCase(), 18, bannerY + 6);

  // Date Range and Filter Subtitle (Inside banner, below title)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  const periodText = `Period: ${params.startDate ? formatDate(params.startDate) : 'All Records'} ${params.endDate ? `to ${formatDate(params.endDate)}` : ''}  |  Branch: ${params.branchName}`;
  doc.text(periodText, 18, bannerY + 11.5);

  // Status Badge on Right of Banner
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(5, 150, 105);
  doc.text('VERIFIED AUDIT', 192, bannerY + 9, { align: 'right' });

  // 7. Report Content Starts Cleanly Below the Header Banner
  let y = bannerY + bannerH + 5;

  // Summary Cards (up to 4)
  const cardCount = Math.min(4, params.summaryCards.length);
  if (cardCount > 0) {
    const cardGap = 3;
    const cardW = (182 - (cardCount - 1) * cardGap) / cardCount;
    params.summaryCards.slice(0, 4).forEach((c, idx) => {
      const cx = 14 + idx * (cardW + cardGap);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(cx, y, cardW, 14, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(c.label.toUpperCase(), cx + cardW / 2, y + 4.5, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(c.value, cx + cardW / 2, y + 10.5, { align: 'center' });
    });
    y += 18;
  }

  const colWidth = 182 / params.headers.length;

  const drawTableHeader = (curY: number): number => {
    doc.setFillColor(15, 23, 42);
    doc.rect(14, curY, 182, 6.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    params.headers.forEach((h, idx) => {
      const isRight = idx >= params.headers.length - 2;
      doc.text(h, isRight ? 14 + (idx + 1) * colWidth - 3 : 14 + idx * colWidth + 3, curY + 4.5, { align: isRight ? 'right' : 'left' });
    });
    return curY + 6.5;
  };

  y = drawTableHeader(y);

  // Table rows with dynamic line height & pagination
  params.rows.forEach((row, rIdx) => {
    // Check line wrapping
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    
    let maxLinesInRow = 1;
    const wrappedCells = row.map((cell, cIdx) => {
      const isRight = cIdx >= row.length - 2;
      const lines = doc.splitTextToSize(String(cell || ''), colWidth - 5);
      if (lines.length > maxLinesInRow) maxLinesInRow = lines.length;
      return { lines, isRight };
    });

    const rowHeight = Math.max(6, maxLinesInRow * 3.6 + 2);

    if (y + rowHeight > 265) {
      doc.addPage();
      y = drawContinuationHeader(doc, activeCompany, params.reportTitle);
      y = drawTableHeader(y);
    }

    if (rIdx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y, 182, rowHeight, 'F');
    }
    doc.setDrawColor(241, 245, 249);
    doc.line(14, y + rowHeight, 196, y + rowHeight);
    doc.setTextColor(15, 23, 42);

    wrappedCells.forEach((c, cIdx) => {
      doc.text(
        c.lines, 
        c.isRight ? 14 + (cIdx + 1) * colWidth - 3 : 14 + cIdx * colWidth + 3, 
        y + 4.2, 
        { align: c.isRight ? 'right' : 'left' }
      );
    });

    y += rowHeight;
  });

  addWatermark(doc, activeCompany, 'BUSINESS AUDIT REPORT');
  drawFooter(doc, doc.getNumberOfPages());
  return doc;
};

/* =========================================================================
   Legacy Print Helpers (Preserved for compatibility)
   ========================================================================= */
export const generateStatementPrintHTML = (
  party: Party,
  transactions: LedgerTransaction[],
  startDate: string,
  endDate: string,
  branchName: string = 'All Branches'
): string => {
  const totalSales = transactions
    .filter(t => t.type === 'Sales Bill')
    .reduce((sum, t) => sum + t.billTotal, 0);

  const totalPayments = transactions
    .filter(t => t.type === 'Payment Received')
    .reduce((sum, t) => sum + t.paymentAmount, 0);

  const totalPurchases = transactions
    .filter(t => t.type === 'Purchase Bill')
    .reduce((sum, t) => sum + t.billTotal, 0);

  const netBalance = totalSales - totalPayments + (totalPurchases - transactions
    .filter(t => t.type === 'Supplier Payment')
    .reduce((sum, t) => sum + t.paymentAmount, 0));

  const rows = transactions.map((t, idx) => `
    <tr style="border-bottom: 1px solid #e2e8f0; ${idx % 2 === 1 ? 'background-color: #f8fafc;' : ''}">
      <td style="padding: 8px 12px; font-size: 13px;">${t.displayDate || formatDate(t.date)}${t.displayTime ? `<br/><small style="color: #64748b;">${t.displayTime}</small>` : ''}</td>
      <td style="padding: 8px 12px; font-size: 13px; font-weight: 600;">${t.type}</td>
      <td style="padding: 8px 12px; font-size: 13px; font-family: monospace;">${t.billNumber}</td>
      <td style="padding: 8px 12px; font-size: 13px;">${t.description} ${t.itemsSummary ? `<br/><small style="color: #64748b;">${t.itemsSummary}</small>` : ''}</td>
      <td style="padding: 8px 12px; font-size: 13px; text-align: right;">${t.billTotal > 0 ? formatPKR(t.billTotal) : '-'}</td>
      <td style="padding: 8px 12px; font-size: 13px; text-align: right; color: #16a34a; font-weight: 600;">${t.paymentAmount > 0 ? formatPKR(t.paymentAmount) : '-'}</td>
      <td style="padding: 8px 12px; font-size: 13px; text-align: right; font-weight: 700;">${formatPKR(t.remainingBalance)}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Statement - ${party.name}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 30px; color: #1e293b; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #16a34a; padding-bottom: 15px; margin-bottom: 25px; }
          .company-title { font-size: 24px; font-weight: 700; color: #14532d; margin: 0; }
          .sub-title { font-size: 13px; color: #475569; margin-top: 4px; }
          .statement-title { text-align: right; }
          .statement-title h2 { margin: 0; color: #0f172a; font-size: 20px; text-transform: uppercase; }
          .meta-grid { display: flex; justify-content: space-between; background: #f1f5f9; padding: 15px; border-radius: 8px; margin-bottom: 25px; }
          .meta-box h4 { margin: 0 0 6px 0; color: #64748b; font-size: 11px; text-transform: uppercase; }
          .meta-box p { margin: 0; font-weight: 600; font-size: 14px; }
          .summary-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 25px; }
          .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; text-align: center; }
          .card-title { font-size: 11px; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
          .card-value { font-size: 16px; font-weight: 700; color: #0f172a; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th { background: #0f172a; color: white; padding: 10px 12px; font-size: 12px; text-align: left; text-transform: uppercase; }
          .footer { text-align: center; border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 12px; color: #94a3b8; }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="company-title">MASALA FACTORY MANAGEMENT</h1>
            <div class="sub-title">B2B Spices Manufacturing & Supply Network</div>
            <div class="sub-title">Branch Scope: ${branchName}</div>
          </div>
          <div class="statement-title">
            <h2>Party Statement</h2>
            <div class="sub-title">Generated: ${formatDate(new Date().toISOString())}</div>
          </div>
        </div>

        <div class="meta-grid">
          <div class="meta-box">
            <h4>Party Details</h4>
            <p>${party.name} ${party.companyName ? `(${party.companyName})` : ''}</p>
            <span style="font-size: 12px; color: #64748b;">Phone: ${party.phone} | Type: ${party.type}</span>
          </div>
          <div class="meta-box">
            <h4>Address</h4>
            <p>${party.address || 'N/A'}, ${party.city || ''}</p>
          </div>
          <div class="meta-box">
            <h4>Statement Period</h4>
            <p>${startDate ? formatDate(startDate) : 'Beginning'} to ${endDate ? formatDate(endDate) : 'Present'}</p>
          </div>
        </div>

        <div class="summary-cards">
          <div class="card">
            <div class="card-title">Total Sales</div>
            <div class="card-value">${formatPKR(totalSales)}</div>
          </div>
          <div class="card">
            <div class="card-title">Payments Received</div>
            <div class="card-value" style="color: #16a34a;">${formatPKR(totalPayments)}</div>
          </div>
          <div class="card">
            <div class="card-title">Total Purchases</div>
            <div class="card-value">${formatPKR(totalPurchases)}</div>
          </div>
          <div class="card">
            <div class="card-title">Net Balance Due</div>
            <div class="card-value" style="color: #dc2626;">${formatPKR(netBalance)}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>Type</th>
              <th>Bill / Ref #</th>
              <th>Description / Products</th>
              <th style="text-align: right;">Bill Total</th>
              <th style="text-align: right;">Payment</th>
              <th style="text-align: right;">Balance</th>
            </tr>
          </thead>
          <tbody>
            ${rows.length > 0 ? rows : `<tr><td colspan="7" style="text-align:center; padding: 20px; color: #94a3b8;">No transactions found for the selected period.</td></tr>`}
          </tbody>
        </table>

        <div class="footer">
          <p>This is a computer-generated statement for Masala Factory B2B Operations. Thank you for your business!</p>
        </div>
      </body>
    </html>
  `;
};

export const generateAuditReportPrintHTML = (params: {
  reportTitle: string;
  category: string;
  branchName: string;
  startDate?: string;
  endDate?: string;
  summaryCards: Array<{ label: string; value: string }>;
  headers: string[];
  rows: Array<string[]>;
}): string => {
  const cardsHtml = params.summaryCards.map(c => `
    <div class="card">
      <div class="card-title">${c.label}</div>
      <div class="card-value">${c.value}</div>
    </div>
  `).join('');

  const tableHeaders = params.headers.map(h => `<th>${h}</th>`).join('');
  const tableRows = params.rows.map((row, idx) => `
    <tr style="border-bottom: 1px solid #e2e8f0; ${idx % 2 === 1 ? 'background-color: #f8fafc;' : ''}">
      ${row.map((cell, cIdx) => `<td style="padding: 8px 12px; font-size: 12px; ${cIdx >= row.length - 2 ? 'text-align: right;' : ''}">${cell}</td>`).join('')}
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${params.reportTitle} - Masala Factory</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 30px; color: #1e293b; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #16a34a; padding-bottom: 15px; margin-bottom: 20px; }
          .company-title { font-size: 22px; font-weight: 700; color: #14532d; margin: 0; }
          .sub-title { font-size: 12px; color: #475569; margin-top: 4px; }
          .summary-cards { display: grid; grid-template-columns: repeat(${params.summaryCards.length || 4}, 1fr); gap: 12px; margin-bottom: 20px; }
          .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; text-align: center; }
          .card-title { font-size: 11px; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
          .card-value { font-size: 16px; font-weight: 700; color: #0f172a; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
          th { background: #0f172a; color: white; padding: 9px 12px; font-size: 11px; text-align: left; text-transform: uppercase; }
          .footer { text-align: center; border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 11px; color: #94a3b8; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="company-title">MASALA FACTORY MANAGEMENT</h1>
            <div class="sub-title">Financial Audit & Operations Report | ${params.branchName}</div>
          </div>
          <div style="text-align: right;">
            <h2 style="margin: 0; font-size: 18px; color: #0f172a;">${params.reportTitle}</h2>
            <div class="sub-title">Period: ${params.startDate ? formatDate(params.startDate) : 'All Records'} ${params.endDate ? `to ${formatDate(params.endDate)}` : ''}</div>
          </div>
        </div>

        <div class="summary-cards">
          ${cardsHtml}
        </div>

        <table>
          <thead>
            <tr>${tableHeaders}</tr>
          </thead>
          <tbody>
            ${tableRows || `<tr><td colspan="${params.headers.length}" style="text-align:center; padding: 20px; color: #94a3b8;">No records found.</td></tr>`}
          </tbody>
        </table>

        <div class="footer">
          <p>Official Masala Factory B2B System Report — Generated on ${formatDate(new Date().toISOString())}</p>
        </div>
      </body>
    </html>
  `;
};

export const printDocument = (htmlContent: string) => {
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  }
};
