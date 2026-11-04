import { 
  Factory,
  Branch, 
  Party, 
  Product, 
  SalesBill, 
  PaymentReceived, 
  PaymentScheduleItem, 
  PurchaseBill, 
  Expense,
  NotificationItem
} from '../types';

export const INITIAL_FACTORIES: Factory[] = [
  {
    id: 'b1',
    name: 'Multan Main Processing Plant',
    code: 'MLT-01',
    city: 'Multan',
    address: 'Plot 12-A, Industrial Estate Phase II, Multan',
    phone: '+92 61 6512345',
    phone2: '+92 300 1234567',
    ownerName: 'Haji Muhammad Awais',
    licenceNumber: 'MF-PFA-88421',
    licenceCategory: 'Punjab Food Authority (PFA) Category-A',
    email: 'processing.multan@masalafactory.pk',
    status: 'Active',
    isMain: true,
    notes: 'Primary spice cleaning, roasting, grinding, and automated pouch packaging plant.',
    createdAt: '2026-01-01T08:00:00Z',
    updatedAt: '2026-01-01T08:00:00Z'
  },
  {
    id: 'b2',
    name: 'Multan South Milling Facility',
    code: 'MLT-02',
    city: 'Multan',
    address: 'Shershah Bypass Road, Near Grain Market, Multan',
    phone: '+92 61 6789012',
    phone2: '+92 301 9876543',
    ownerName: 'Chaudhry Tariq Mehmood',
    licenceNumber: 'MF-IND-32119',
    licenceCategory: 'Industrial Processing & Milling Category-B',
    email: 'milling.multan@masalafactory.pk',
    status: 'Active',
    isMain: false,
    notes: 'Secondary whole-spice pulverizing, milling, and bulk warehouse facility.',
    createdAt: '2026-01-05T09:30:00Z',
    updatedAt: '2026-01-05T09:30:00Z'
  }
];

export const INITIAL_BRANCHES: Branch[] = INITIAL_FACTORIES;

export const INITIAL_PARTIES: Party[] = [
  {
    id: 'p-101',
    name: 'Al-Madina Cash & Carry',
    companyName: 'Al-Madina Group',
    phone: '+92 300 1234567',
    whatsapp: '+92 300 1234567',
    address: 'Main Boulevard, Gulberg III',
    city: 'Lahore',
    type: 'Customer',
    notes: 'Key retail chain buyer. 15-day credit window.',
    createdAt: '2026-01-10'
  },
  {
    id: 'p-102',
    name: 'Lahore Spice Center',
    companyName: 'LHR Traders',
    phone: '+92 321 9876543',
    whatsapp: '+92 321 9876543',
    address: 'Akbari Mandi, Walled City',
    city: 'Lahore',
    type: 'Customer',
    notes: 'Wholesale distributor for Central Punjab.',
    createdAt: '2026-01-15'
  },
  {
    id: 'p-103',
    name: 'Subhan Wholesale Traders',
    companyName: 'Subhan Enterprises',
    phone: '+92 333 4567890',
    whatsapp: '+92 333 4567890',
    address: 'Jodia Bazaar',
    city: 'Karachi',
    type: 'Customer',
    notes: 'Bulk purchaser of Tikka and Kabab Masala.',
    createdAt: '2026-02-01'
  },
  {
    id: 'p-104',
    name: 'Khyber Hotel & Restaurant Chain',
    companyName: 'Khyber Hospitality Ltd',
    phone: '+92 345 6789012',
    whatsapp: '+92 345 6789012',
    address: 'University Road',
    city: 'Peshawar',
    type: 'Customer',
    notes: 'Regular monthly commercial supply.',
    createdAt: '2026-02-10'
  },
  {
    id: 'p-201',
    name: 'Chilli Growers Farmers Co-op',
    companyName: 'Sindh Spice Farms',
    phone: '+92 301 5554433',
    whatsapp: '+92 301 5554433',
    address: 'Kunar Road, Kunri',
    city: 'Umerkot',
    type: 'Supplier',
    notes: 'Direct supplier of premium Red Whole Chilli.',
    createdAt: '2026-01-05'
  },
  {
    id: 'p-202',
    name: 'Packages Limited',
    companyName: 'Packages Packaging Div',
    phone: '+92 42 35811111',
    whatsapp: '+92 42 35811111',
    address: 'Shahrah-e-Roomi, P.O. Amer Sidhu',
    city: 'Lahore',
    type: 'Supplier',
    notes: 'Supplier of printed aluminum foil & carton boxes.',
    createdAt: '2026-01-08'
  },
  {
    id: 'p-301',
    name: 'National Agro & Spices',
    companyName: 'National Spice Importers',
    phone: '+92 312 8887766',
    whatsapp: '+92 312 8887766',
    address: 'Grain Market',
    city: 'Multan',
    type: 'Both',
    notes: 'Buys finished masala packets and supplies raw Cumin/Turmeric.',
    createdAt: '2026-02-20'
  }
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-01',
    name: 'Special Chicken Masala',
    category: 'Formulated Spice Mix',
    unit: '1kg Pack',
    defaultRate: 1250,
    stockQty: 450,
    description: 'Premium aromatic chicken spice blend'
  },
  {
    id: 'prod-02',
    name: 'Smoky Tikka Masala',
    category: 'Formulated Spice Mix',
    unit: '500g Pack',
    defaultRate: 700,
    stockQty: 600,
    description: 'Barbecue style tikka spice mixture'
  },
  {
    id: 'prod-03',
    name: 'Seekh Kabab Masala',
    category: 'Formulated Spice Mix',
    unit: '1kg Pack',
    defaultRate: 1400,
    stockQty: 320,
    description: 'Authentic coal-smoked seekh kabab blend'
  },
  {
    id: 'prod-04',
    name: 'Royal Garam Masala',
    category: 'Pure Spice Powder',
    unit: '1kg Pack',
    defaultRate: 1800,
    stockQty: 250,
    description: 'High-grade whole spices finely ground'
  },
  {
    id: 'prod-05',
    name: 'Bombay Biryani Masala',
    category: 'Formulated Spice Mix',
    unit: '1kg Pack',
    defaultRate: 1300,
    stockQty: 500,
    description: 'Rich spiced biryani flavor enhancer'
  },
  {
    id: 'prod-06',
    name: 'Crushed Red Chilli (Stemless)',
    category: 'Raw Spice Material',
    unit: '25kg Bag',
    defaultRate: 18500,
    stockQty: 80,
    description: 'Directly sourced processed Kunri red chilli'
  },
  {
    id: 'prod-07',
    name: 'Pure Turmeric Powder (Haldi)',
    category: 'Pure Spice Powder',
    unit: '50kg Bag',
    defaultRate: 32000,
    stockQty: 45,
    description: 'High-curcumin organic turmeric ground'
  },
  {
    id: 'prod-08',
    name: 'Laminated Printed Pouches (1kg)',
    category: 'Packaging Materials',
    unit: '1000 Pcs',
    defaultRate: 8500,
    stockQty: 120,
    description: 'High barrier food-grade foil pouches'
  }
];

export const INITIAL_SALES_BILLS: SalesBill[] = [
  {
    id: 'sb-1001',
    billNumber: 'B-1547',
    partyId: 'p-101',
    partyName: 'Al-Madina Cash & Carry',
    partyPhone: '+92 300 1234567',
    billDate: '2026-10-02',
    branchId: 'b1',
    branchName: 'Multan Main Processing Plant',
    items: [
      {
        id: 'bi-1',
        productId: 'prod-01',
        productName: 'Special Chicken Masala',
        quantity: 40,
        unit: '1kg Pack',
        rate: 1250,
        lineTotal: 50000
      },
      {
        id: 'bi-2',
        productId: 'prod-03',
        productName: 'Seekh Kabab Masala',
        quantity: 25,
        unit: '1kg Pack',
        rate: 1400,
        lineTotal: 35000
      },
      {
        id: 'bi-3',
        productId: 'prod-02',
        productName: 'Smoky Tikka Masala',
        quantity: 21.428,
        unit: '500g Pack',
        rate: 700,
        lineTotal: 15000
      }
    ],
    grandTotal: 100000,
    receivedAmount: 60000,
    remainingAmount: 40000,
    status: 'Partially Paid',
    proofUrl: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=500&auto=format&fit=crop&q=60',
    notes: 'Initial dispatch 40 cartons. Balance expected next week.',
    createdAt: '2026-10-02T10:30:00Z',
    isDeleted: false
  },
  {
    id: 'sb-1002',
    billNumber: 'B-1548',
    partyId: 'p-102',
    partyName: 'Lahore Spice Center',
    partyPhone: '+92 321 9876543',
    billDate: '2026-10-04',
    branchId: 'b1',
    branchName: 'Multan Main Processing Plant',
    items: [
      {
        id: 'bi-4',
        productId: 'prod-05',
        productName: 'Bombay Biryani Masala',
        quantity: 100,
        unit: '1kg Pack',
        rate: 1300,
        lineTotal: 130000
      },
      {
        id: 'bi-5',
        productId: 'prod-04',
        productName: 'Royal Garam Masala',
        quantity: 50,
        unit: '1kg Pack',
        rate: 1800,
        lineTotal: 90000
      }
    ],
    grandTotal: 220000,
    receivedAmount: 220000,
    remainingAmount: 0,
    status: 'Paid',
    proofUrl: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=500&auto=format&fit=crop&q=60',
    notes: 'Full payment cleared via Bank Transfer on delivery.',
    createdAt: '2026-10-04T14:15:00Z',
    isDeleted: false
  },
  {
    id: 'sb-1003',
    billNumber: 'B-1549',
    partyId: 'p-103',
    partyName: 'Subhan Wholesale Traders',
    partyPhone: '+92 333 4567890',
    billDate: '2026-10-07',
    branchId: 'b2',
    branchName: 'Multan South Milling Facility',
    items: [
      {
        id: 'bi-6',
        productId: 'prod-02',
        productName: 'Smoky Tikka Masala',
        quantity: 200,
        unit: '500g Pack',
        rate: 700,
        lineTotal: 140000
      },
      {
        id: 'bi-7',
        productId: 'prod-03',
        productName: 'Seekh Kabab Masala',
        quantity: 50,
        unit: '1kg Pack',
        rate: 1400,
        lineTotal: 70000
      }
    ],
    grandTotal: 210000,
    receivedAmount: 0,
    remainingAmount: 210000,
    status: 'Unpaid',
    notes: 'Dispatch sent via M&P Cargo to Jodia Bazaar Karachi.',
    createdAt: '2026-10-07T09:00:00Z',
    isDeleted: false
  },
  {
    id: 'sb-1004',
    billNumber: 'B-1550',
    partyId: 'p-104',
    partyName: 'Khyber Hotel & Restaurant Chain',
    partyPhone: '+92 345 6789012',
    billDate: '2026-10-08',
    branchId: 'b2',
    branchName: 'Multan South Milling Facility',
    items: [
      {
        id: 'bi-8',
        productId: 'prod-01',
        productName: 'Special Chicken Masala',
        quantity: 60,
        unit: '1kg Pack',
        rate: 1250,
        lineTotal: 75000
      }
    ],
    grandTotal: 75000,
    receivedAmount: 25000,
    remainingAmount: 50000,
    status: 'Partially Paid',
    notes: 'Advance Rs.25,000 paid via JazzCash. Remaining due upon arrival.',
    createdAt: '2026-10-08T11:45:00Z',
    isDeleted: false
  }
];

export const INITIAL_PAYMENTS_RECEIVED: PaymentReceived[] = [
  {
    id: 'pr-501',
    receiptNumber: 'REC-098',
    partyId: 'p-101',
    partyName: 'Al-Madina Cash & Carry',
    amountReceived: 60000,
    paymentDate: '2026-10-03',
    paymentMethod: 'Bank Transfer',
    allocatedBillIds: ['sb-1001'],
    allocations: [{ billId: 'sb-1001', billNumber: 'B-1547', amount: 60000 }],
    status: 'Completed',
    referenceNo: 'Meezan-TXN-8849102',
    proofUrl: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=500&auto=format&fit=crop&q=60',
    notes: 'Partial payment against bill B-1547',
    branchId: 'b1',
    createdAt: '2026-10-03T11:00:00Z'
  },
  {
    id: 'pr-502',
    receiptNumber: 'REC-099',
    partyId: 'p-102',
    partyName: 'Lahore Spice Center',
    amountReceived: 220000,
    paymentDate: '2026-10-04',
    paymentMethod: 'Cheque',
    allocatedBillIds: ['sb-1002'],
    allocations: [{ billId: 'sb-1002', billNumber: 'B-1548', amount: 220000 }],
    status: 'Completed',
    referenceNo: 'HBL-Cheque-441209',
    proofUrl: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=500&auto=format&fit=crop&q=60',
    notes: 'Full payment for Bill B-1548 cleared.',
    branchId: 'b1',
    createdAt: '2026-10-04T15:00:00Z'
  },
  {
    id: 'pr-503',
    receiptNumber: 'REC-100',
    partyId: 'p-104',
    partyName: 'Khyber Hotel & Restaurant Chain',
    amountReceived: 25000,
    paymentDate: '2026-10-08',
    paymentMethod: 'JazzCash',
    allocatedBillIds: ['sb-1004'],
    allocations: [{ billId: 'sb-1004', billNumber: 'B-1550', amount: 25000 }],
    status: 'Completed',
    referenceNo: 'JC-883921',
    notes: 'Token advance for Bill B-1550',
    branchId: 'b2',
    createdAt: '2026-10-08T12:00:00Z'
  }
];

export const INITIAL_PURCHASES: PurchaseBill[] = [
  {
    id: 'pb-701',
    billNumber: 'SUP-882',
    supplierId: 'p-201',
    supplierName: 'Chilli Growers Farmers Co-op',
    billDate: '2026-09-28',
    dueDate: '2026-10-15',
    branchId: 'b1',
    items: [
      {
        id: 'pbi-1',
        productId: 'prod-06',
        productName: 'Crushed Red Chilli (Stemless)',
        quantity: 10,
        unit: '25kg Bag',
        rate: 18500,
        lineTotal: 185000
      }
    ],
    grandTotal: 185000,
    amountPaid: 85000,
    outstandingAmount: 100000,
    status: 'Partially Paid',
    proofUrl: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=500&auto=format&fit=crop&q=60',
    notes: 'Imported from Kunri Chilli Market. Rs.100,000 balance due Oct 15.',
    createdAt: '2026-09-28T10:00:00Z'
  },
  {
    id: 'pb-702',
    billNumber: 'SUP-883',
    supplierId: 'p-202',
    supplierName: 'Packages Limited',
    billDate: '2026-10-01',
    dueDate: '2026-10-20',
    branchId: 'b1',
    items: [
      {
        id: 'pbi-2',
        productId: 'prod-08',
        productName: 'Laminated Printed Pouches (1kg)',
        quantity: 15,
        unit: '1000 Pcs',
        rate: 8500,
        lineTotal: 127500
      }
    ],
    grandTotal: 127500,
    amountPaid: 127500,
    outstandingAmount: 0,
    status: 'Paid',
    notes: 'Custom foil packaging printing complete.',
    createdAt: '2026-10-01T11:30:00Z'
  }
];

export const INITIAL_EXPENSES: Expense[] = [
  {
    id: 'exp-301',
    expenseNumber: 'EXP-101',
    title: 'Kot Lakhpat Main Factory Electricity Bill',
    category: 'Electricity',
    amount: 145000,
    expenseDate: '2026-10-05',
    branchId: 'b1',
    paidTo: 'LESCO Lahore',
    paymentMethod: 'Bank Transfer',
    referenceNo: 'LESCO-998231',
    proofUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=500&auto=format&fit=crop&q=60',
    notes: 'Commercial 3-Phase Industrial Connection Bill',
    createdAt: '2026-10-05T09:00:00Z'
  },
  {
    id: 'exp-302',
    expenseNumber: 'EXP-102',
    title: 'Staff Monthly Salary Allocation - Sept 2026',
    category: 'Salaries',
    amount: 380000,
    expenseDate: '2026-10-01',
    branchId: 'b1',
    paidTo: 'Factory Floor Staff & Machine Operators',
    paymentMethod: 'Bank Transfer',
    referenceNo: 'Meezan-Payroll-992',
    notes: 'Salaries disbursed for 18 staff members',
    createdAt: '2026-10-01T10:00:00Z'
  },
  {
    id: 'exp-303',
    expenseNumber: 'EXP-103',
    title: 'High-Density Packaging Corrugated Boxes',
    category: 'Packaging',
    amount: 42000,
    expenseDate: '2026-10-06',
    branchId: 'b2',
    paidTo: 'Master Box Packaging Printers',
    paymentMethod: 'Cash',
    notes: '500 master export boxes for Multan South plant',
    createdAt: '2026-10-06T14:30:00Z'
  },
  {
    id: 'exp-304',
    expenseNumber: 'EXP-104',
    title: 'Diesel Fuel for Backup Factory Generator',
    category: 'Fuel',
    amount: 35000,
    expenseDate: '2026-10-08',
    branchId: 'b1',
    paidTo: 'PSO Fuel Pump Kot Lakhpat',
    paymentMethod: 'Cash',
    notes: '120 Liters Diesel during loadshedding hours',
    createdAt: '2026-10-08T16:00:00Z'
  },
  {
    id: 'exp-305',
    expenseNumber: 'EXP-105',
    title: 'Grinding Mill Motor Bearing Repair & Servicing',
    category: 'Machinery / Repairs',
    amount: 28000,
    expenseDate: '2026-10-09',
    branchId: 'b2',
    paidTo: 'Ittefaq Mechanical Workshop Fsd',
    paymentMethod: 'Easypaisa',
    referenceNo: 'EP-44129',
    notes: 'Replaced heavy duty bearings on Mill #2',
    createdAt: '2026-10-09T11:20:00Z'
  }
];

export const INITIAL_SCHEDULE: PaymentScheduleItem[] = [
  {
    id: 'sch-01',
    type: 'ToReceive',
    partyId: 'p-101',
    partyName: 'Al-Madina Cash & Carry',
    partyPhone: '+92 300 1234567',
    relatedBillNumber: 'B-1547',
    dueDate: '2026-10-10', // Due today
    scheduledAmount: 40000,
    paidReceivedAmount: 0,
    remainingAmount: 40000,
    branchId: 'b1',
    status: 'Due Today',
    notes: 'Promised remaining Rs.40k balance clearance by Oct 10.'
  },
  {
    id: 'sch-02',
    type: 'ToReceive',
    partyId: 'p-103',
    partyName: 'Subhan Wholesale Traders',
    partyPhone: '+92 333 4567890',
    relatedBillNumber: 'B-1549',
    dueDate: '2026-10-09', // Overdue
    scheduledAmount: 210000,
    paidReceivedAmount: 0,
    remainingAmount: 210000,
    branchId: 'b2',
    status: 'Overdue',
    notes: 'Cargo received in Karachi. Follow up for online transfer.'
  },
  {
    id: 'sch-03',
    type: 'ToReceive',
    partyId: 'p-104',
    partyName: 'Khyber Hotel & Restaurant Chain',
    partyPhone: '+92 345 6789012',
    relatedBillNumber: 'B-1550',
    dueDate: '2026-10-14',
    scheduledAmount: 50000,
    paidReceivedAmount: 0,
    remainingAmount: 50000,
    branchId: 'b2',
    status: 'Upcoming',
    notes: 'Remaining Rs.50,000 due after delivery inspection.'
  },
  {
    id: 'sch-04',
    type: 'ToPay',
    partyId: 'p-201',
    partyName: 'Chilli Growers Farmers Co-op',
    partyPhone: '+92 301 5554433',
    relatedBillNumber: 'SUP-882',
    dueDate: '2026-10-15',
    scheduledAmount: 100000,
    paidReceivedAmount: 0,
    remainingAmount: 100000,
    branchId: 'b1',
    status: 'Upcoming',
    notes: 'Supplier payment for Red Chilli shipment.'
  },
  {
    id: 'sch-05',
    type: 'ToPay',
    partyId: 'p-202',
    partyName: 'SUI Northern Gas Pipelines (SNGPL)',
    dueDate: '2026-10-10', // Due today
    scheduledAmount: 68000,
    paidReceivedAmount: 0,
    remainingAmount: 68000,
    branchId: 'b1',
    status: 'Due Today',
    notes: 'Factory roasting unit monthly gas bill.'
  }
];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'Payment Due Today',
    message: 'Al-Madina Cash & Carry balance of Rs.40,000 for Bill B-1547 is due today.',
    date: '10 Oct 2026',
    type: 'alert',
    read: false,
    link: '/schedule'
  },
  {
    id: 'notif-2',
    title: 'Overdue Receivables',
    message: 'Subhan Wholesale Traders Bill B-1549 (Rs.210,000) is past due date.',
    date: '09 Oct 2026',
    type: 'warning',
    read: false,
    link: '/schedule'
  },
  {
    id: 'notif-3',
    title: 'New Sale Recorded',
    message: 'Bill B-1550 recorded for Khyber Hotel Chain (Rs.75,000).',
    date: '08 Oct 2026',
    type: 'info',
    read: true,
    link: '/sales'
  }
];
