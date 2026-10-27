/**
 * Supabase Data Service Layer
 * Seamlessly connects the frontend React application to PostgreSQL/Supabase database tables.
 * Maps between database snake_case columns and TypeScript camelCase interfaces.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  Factory,
  Party,
  Product,
  SalesBill,
  BillItem,
  PaymentReceived,
  PaymentAllocation,
  PurchaseBill,
  SupplierPayment,
  Expense,
  PaymentScheduleItem,
  ScheduleInstallment,
  CompanyProfile
} from '../types';

/* =========================================================================
   1. FACTORIES MODULE
   ========================================================================= */

export const fetchFactoriesFromSupabase = async (): Promise<Factory[] | null> => {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase
      .from('factories')
      .select('*')
      .order('created_at', { ascending: true });

    if (error || !data || data.length === 0) return null;

    return data.map((f: any): Factory => ({
      id: f.id,
      code: f.code,
      name: f.name,
      city: f.city,
      address: f.address,
      phone: f.phone,
      email: f.email || undefined,
      status: f.status,
      isMain: !!f.is_main,
      notes: f.notes || undefined,
      createdAt: f.created_at,
      updatedAt: f.updated_at
    }));
  } catch (err) {
    console.warn('Error fetching factories from Supabase:', err);
    return null;
  }
};

export const saveFactoryToSupabase = async (factory: Factory): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;
  try {
    const payload = {
      code: factory.code,
      name: factory.name,
      city: factory.city,
      address: factory.address,
      phone: factory.phone,
      email: factory.email || null,
      status: factory.status,
      is_main: !!factory.isMain,
      notes: factory.notes || null
    };

    const { error } = await supabase
      .from('factories')
      .upsert(payload, { onConflict: 'code' });

    if (error) {
      console.warn('Supabase factory save error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase factory save exception:', err);
    return false;
  }
};

/* =========================================================================
   2. CONTACT PARTIES (CUSTOMERS / SUPPLIERS)
   ========================================================================= */

export const fetchPartiesFromSupabase = async (): Promise<Party[] | null> => {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase
      .from('parties')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) return null;

    return data.map((p: any): Party => ({
      id: p.id,
      name: p.name,
      companyName: p.company_name || undefined,
      phone: p.phone,
      whatsapp: p.whatsapp || p.phone,
      address: p.address || '',
      city: p.city || '',
      type: p.type,
      notes: p.notes || undefined,
      createdAt: p.created_at,
      isDeleted: !!p.is_deleted,
      deletedAt: p.deleted_at || undefined,
      deletedBy: p.deleted_by || undefined
    }));
  } catch (err) {
    console.warn('Error fetching parties from Supabase:', err);
    return null;
  }
};

export const savePartyToSupabase = async (party: Party): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;
  try {
    const payload = {
      id: party.id.length === 36 ? party.id : undefined,
      name: party.name,
      company_name: party.companyName || null,
      phone: party.phone,
      whatsapp: party.whatsapp || party.phone,
      address: party.address || '',
      city: party.city || '',
      type: party.type,
      notes: party.notes || null,
      is_deleted: !!party.isDeleted,
      deleted_at: party.deletedAt || null,
      deleted_by: party.deletedBy || null
    };

    const { error } = await supabase
      .from('parties')
      .upsert(payload);

    if (error) {
      console.warn('Supabase party save error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase party save exception:', err);
    return false;
  }
};

/* =========================================================================
   3. PRODUCTS CATALOG
   ========================================================================= */

export const fetchProductsFromSupabase = async (): Promise<Product[] | null> => {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name', { ascending: true });

    if (error || !data || data.length === 0) return null;

    return data.map((pr: any): Product => ({
      id: pr.id,
      name: pr.name,
      category: pr.category,
      unit: pr.unit || 'KG',
      defaultRate: Number(pr.default_rate) || 0,
      stockQty: pr.stock_qty !== null ? Number(pr.stock_qty) : undefined,
      description: pr.description || undefined
    }));
  } catch (err) {
    console.warn('Error fetching products from Supabase:', err);
    return null;
  }
};

export const saveProductToSupabase = async (product: Product): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;
  try {
    const payload = {
      id: product.id.length === 36 ? product.id : undefined,
      name: product.name,
      category: product.category,
      unit: product.unit || 'KG',
      default_rate: product.defaultRate,
      stock_qty: product.stockQty || 0,
      description: product.description || null
    };

    const { error } = await supabase
      .from('products')
      .upsert(payload);

    if (error) {
      console.warn('Supabase product save error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase product save exception:', err);
    return false;
  }
};

/* =========================================================================
   4. SALES BILLS & LINE ITEMS
   ========================================================================= */

export const fetchSalesBillsFromSupabase = async (): Promise<SalesBill[] | null> => {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase
      .from('sales_bills')
      .select(`
        *,
        sales_bill_items (*)
      `)
      .order('bill_date', { ascending: false });

    if (error || !data || data.length === 0) return null;

    return data.map((b: any): SalesBill => ({
      id: b.id,
      billNumber: b.bill_number,
      partyId: b.party_id,
      partyName: b.party_name,
      partyPhone: b.party_phone || '',
      billDate: b.bill_date,
      billTime: b.bill_time || undefined,
      branchId: b.factory_id,
      branchName: b.party_name,
      items: (b.sales_bill_items || []).map((item: any): BillItem => ({
        id: item.id,
        productId: item.product_id || '',
        productName: item.product_name,
        quantity: Number(item.quantity),
        unit: item.unit || 'KG',
        rate: Number(item.rate),
        lineTotal: Number(item.line_total)
      })),
      grandTotal: Number(b.grand_total),
      receivedAmount: Number(b.received_amount) || 0,
      remainingAmount: Number(b.remaining_amount) || 0,
      status: b.status,
      proofUrl: b.proof_url || undefined,
      proofStatus: b.proof_status || undefined,
      notes: b.notes || undefined,
      createdAt: b.created_at,
      isDeleted: !!b.is_deleted,
      deletedAt: b.deleted_at || undefined,
      deletedBy: b.deleted_by || undefined
    }));
  } catch (err) {
    console.warn('Error fetching sales bills from Supabase:', err);
    return null;
  }
};

export const saveSalesBillToSupabase = async (bill: SalesBill, factoryDbId?: string, partyDbId?: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;
  try {
    const targetFactoryId = factoryDbId || (bill.branchId.length === 36 ? bill.branchId : '00000000-0000-0000-0000-000000000001');
    const targetPartyId = partyDbId || (bill.partyId.length === 36 ? bill.partyId : null);

    if (!targetPartyId) {
      // Find party UUID from parties table by name
      const { data: pData } = await supabase
        .from('parties')
        .select('id')
        .eq('name', bill.partyName)
        .maybeSingle();
      if (pData?.id) {
        bill.partyId = pData.id;
      }
    }

    const billPayload = {
      id: bill.id.length === 36 ? bill.id : undefined,
      factory_id: targetFactoryId,
      bill_number: bill.billNumber,
      party_id: bill.partyId.length === 36 ? bill.partyId : '10000000-0000-0000-0000-000000000001',
      party_name: bill.partyName,
      party_phone: bill.partyPhone || '',
      bill_date: bill.billDate,
      bill_time: bill.billTime || null,
      grand_total: bill.grandTotal,
      received_amount: bill.receivedAmount,
      remaining_amount: bill.remainingAmount,
      status: bill.status,
      proof_url: bill.proofUrl || null,
      proof_status: bill.proofStatus || 'Not Required',
      notes: bill.notes || null,
      is_deleted: !!bill.isDeleted,
      deleted_at: bill.deletedAt || null,
      deleted_by: bill.deletedBy || null
    };

    const { data: savedBill, error: billError } = await supabase
      .from('sales_bills')
      .upsert(billPayload, { onConflict: 'factory_id,bill_number' })
      .select('id')
      .single();

    if (billError) {
      console.warn('Supabase sales bill save error:', billError.message);
      return false;
    }

    // Save line items
    if (savedBill && bill.items && bill.items.length > 0) {
      // Clear existing items for this bill then insert fresh
      await supabase.from('sales_bill_items').delete().eq('bill_id', savedBill.id);

      const itemsPayload = bill.items.map(item => ({
        bill_id: savedBill.id,
        product_id: item.productId?.length === 36 ? item.productId : null,
        product_name: item.productName,
        quantity: item.quantity,
        unit: item.unit || 'KG',
        rate: item.rate,
        line_total: item.lineTotal
      }));

      await supabase.from('sales_bill_items').insert(itemsPayload);
    }

    return true;
  } catch (err) {
    console.warn('Supabase sales bill exception:', err);
    return false;
  }
};

/* =========================================================================
   5. PAYMENTS RECEIVED & ALLOCATIONS
   ========================================================================= */

export const fetchPaymentsReceivedFromSupabase = async (): Promise<PaymentReceived[] | null> => {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase
      .from('payments_received')
      .select(`
        *,
        payment_allocations (*)
      `)
      .order('payment_date', { ascending: false });

    if (error || !data || data.length === 0) return null;

    return data.map((p: any): PaymentReceived => ({
      id: p.id,
      receiptNumber: p.receipt_number,
      partyId: p.party_id,
      partyName: p.party_name,
      partyPhone: p.party_phone || undefined,
      amountReceived: Number(p.amount_received),
      paymentDate: p.payment_date,
      paymentTime: p.payment_time || undefined,
      paymentMethod: p.payment_method,
      referenceNo: p.reference_no || undefined,
      proofUrl: p.proof_url || undefined,
      proofStatus: p.proof_status || undefined,
      status: p.status,
      isInitialPayment: !!p.is_initial_payment,
      notes: p.notes || undefined,
      branchId: p.factory_id,
      createdAt: p.created_at,
      allocatedBillIds: (p.payment_allocations || []).map((a: any) => a.bill_id),
      allocations: (p.payment_allocations || []).map((a: any): PaymentAllocation => ({
        billId: a.bill_id,
        billNumber: a.bill_number,
        amount: Number(a.amount)
      })),
      isDeleted: !!p.is_deleted,
      deletedAt: p.deleted_at || undefined,
      deletedBy: p.deleted_by || undefined
    }));
  } catch (err) {
    console.warn('Error fetching payments received from Supabase:', err);
    return null;
  }
};

export const savePaymentReceivedToSupabase = async (payment: PaymentReceived, factoryDbId?: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;
  try {
    const targetFactoryId = factoryDbId || (payment.branchId.length === 36 ? payment.branchId : '00000000-0000-0000-0000-000000000001');

    const paymentPayload = {
      id: payment.id.length === 36 ? payment.id : undefined,
      factory_id: targetFactoryId,
      receipt_number: payment.receiptNumber,
      party_id: payment.partyId.length === 36 ? payment.partyId : '10000000-0000-0000-0000-000000000001',
      party_name: payment.partyName,
      party_phone: payment.partyPhone || null,
      amount_received: payment.amountReceived,
      payment_date: payment.paymentDate,
      payment_time: payment.paymentTime || null,
      payment_method: payment.paymentMethod,
      reference_no: payment.referenceNo || null,
      proof_url: payment.proofUrl || null,
      proof_status: payment.proofStatus || 'Not Required',
      status: payment.status || 'Completed',
      is_initial_payment: !!payment.isInitialPayment,
      notes: payment.notes || null,
      is_deleted: !!payment.isDeleted,
      deleted_at: payment.deletedAt || null,
      deleted_by: payment.deletedBy || null
    };

    const { data: savedPayment, error: paymentError } = await supabase
      .from('payments_received')
      .upsert(paymentPayload, { onConflict: 'factory_id,receipt_number' })
      .select('id')
      .single();

    if (paymentError) {
      console.warn('Supabase payment received save error:', paymentError.message);
      return false;
    }

    if (savedPayment && payment.allocations && payment.allocations.length > 0) {
      await supabase.from('payment_allocations').delete().eq('payment_id', savedPayment.id);
      const allocPayload = payment.allocations.map(a => ({
        payment_id: savedPayment.id,
        bill_id: a.billId.length === 36 ? a.billId : '30000000-0000-0000-0000-000000000001',
        bill_number: a.billNumber,
        amount: a.amount
      }));
      await supabase.from('payment_allocations').insert(allocPayload);
    }

    return true;
  } catch (err) {
    console.warn('Supabase payment received exception:', err);
    return false;
  }
};

/* =========================================================================
   6. PURCHASES (RAW MATERIALS)
   ========================================================================= */

export const fetchPurchasesFromSupabase = async (): Promise<PurchaseBill[] | null> => {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase
      .from('purchases')
      .select(`
        *,
        purchase_items (*)
      `)
      .order('bill_date', { ascending: false });

    if (error || !data || data.length === 0) return null;

    return data.map((p: any): PurchaseBill => ({
      id: p.id,
      billNumber: p.bill_number,
      supplierId: p.supplier_id,
      supplierName: p.supplier_name,
      billDate: p.bill_date,
      billTime: p.bill_time || undefined,
      dueDate: p.due_date,
      branchId: p.factory_id,
      items: (p.purchase_items || []).map((item: any): BillItem => ({
        id: item.id,
        productId: '',
        productName: item.product_name,
        quantity: Number(item.quantity),
        unit: item.unit || 'KG',
        rate: Number(item.rate),
        lineTotal: Number(item.line_total)
      })),
      grandTotal: Number(p.grand_total),
      amountPaid: Number(p.amount_paid) || 0,
      outstandingAmount: Number(p.outstanding_amount) || 0,
      status: p.status,
      proofUrl: p.proof_url || undefined,
      proofStatus: p.proof_status || undefined,
      notes: p.notes || undefined,
      createdAt: p.created_at,
      isDeleted: !!p.is_deleted,
      deletedAt: p.deleted_at || undefined,
      deletedBy: p.deleted_by || undefined
    }));
  } catch (err) {
    console.warn('Error fetching purchases from Supabase:', err);
    return null;
  }
};

export const savePurchaseToSupabase = async (purchase: PurchaseBill, factoryDbId?: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;
  try {
    const targetFactoryId = factoryDbId || (purchase.branchId.length === 36 ? purchase.branchId : '00000000-0000-0000-0000-000000000001');

    const purchasePayload = {
      id: purchase.id.length === 36 ? purchase.id : undefined,
      factory_id: targetFactoryId,
      bill_number: purchase.billNumber,
      supplier_id: purchase.supplierId.length === 36 ? purchase.supplierId : '10000000-0000-0000-0000-000000000003',
      supplier_name: purchase.supplierName,
      bill_date: purchase.billDate,
      bill_time: purchase.billTime || null,
      due_date: purchase.dueDate || purchase.billDate,
      grand_total: purchase.grandTotal,
      amount_paid: purchase.amountPaid,
      outstanding_amount: purchase.outstandingAmount,
      status: purchase.status,
      proof_url: purchase.proofUrl || null,
      proof_status: purchase.proofStatus || 'Not Required',
      notes: purchase.notes || null,
      is_deleted: !!purchase.isDeleted,
      deleted_at: purchase.deletedAt || null,
      deleted_by: purchase.deletedBy || null
    };

    const { data: savedPurchase, error: pError } = await supabase
      .from('purchases')
      .upsert(purchasePayload, { onConflict: 'factory_id,bill_number' })
      .select('id')
      .single();

    if (pError) {
      console.warn('Supabase purchase save error:', pError.message);
      return false;
    }

    if (savedPurchase && purchase.items && purchase.items.length > 0) {
      await supabase.from('purchase_items').delete().eq('purchase_id', savedPurchase.id);
      const itemsPayload = purchase.items.map(item => ({
        purchase_id: savedPurchase.id,
        product_name: item.productName,
        quantity: Math.round(item.quantity), // Enforce whole integer
        unit: item.unit || 'KG',
        rate: item.rate,
        line_total: item.lineTotal
      }));
      await supabase.from('purchase_items').insert(itemsPayload);
    }

    return true;
  } catch (err) {
    console.warn('Supabase purchase exception:', err);
    return false;
  }
};

/* =========================================================================
   7. FACTORY OPERATING EXPENSES
   ========================================================================= */

export const fetchExpensesFromSupabase = async (): Promise<Expense[] | null> => {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('expense_date', { ascending: false });

    if (error || !data || data.length === 0) return null;

    return data.map((e: any): Expense => ({
      id: e.id,
      expenseNumber: e.expense_number,
      title: e.title,
      category: e.category,
      amount: Number(e.amount),
      expenseDate: e.expense_date,
      expenseTime: e.expense_time || undefined,
      branchId: e.factory_id,
      paidTo: e.paid_to,
      paymentMethod: e.payment_method,
      referenceNo: e.reference_no || undefined,
      proofUrl: e.proof_url || undefined,
      proofStatus: e.proof_status || undefined,
      notes: e.notes || undefined,
      createdAt: e.created_at,
      isDeleted: !!e.is_deleted,
      deletedAt: e.deleted_at || undefined,
      deletedBy: e.deleted_by || undefined
    }));
  } catch (err) {
    console.warn('Error fetching expenses from Supabase:', err);
    return null;
  }
};

export const saveExpenseToSupabase = async (expense: Expense, factoryDbId?: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;
  try {
    const targetFactoryId = factoryDbId || (expense.branchId.length === 36 ? expense.branchId : '00000000-0000-0000-0000-000000000001');

    const payload = {
      id: expense.id.length === 36 ? expense.id : undefined,
      factory_id: targetFactoryId,
      expense_number: expense.expenseNumber,
      title: expense.title,
      category: expense.category,
      amount: expense.amount,
      expense_date: expense.expenseDate,
      expense_time: expense.expenseTime || null,
      paid_to: expense.paidTo,
      payment_method: expense.paymentMethod,
      reference_no: expense.referenceNo || null,
      proof_url: expense.proofUrl || null,
      proof_status: expense.proofStatus || 'Not Required',
      notes: expense.notes || null,
      is_deleted: !!expense.isDeleted,
      deleted_at: expense.deletedAt || null,
      deleted_by: expense.deletedBy || null
    };

    const { error } = await supabase
      .from('expenses')
      .upsert(payload, { onConflict: 'factory_id,expense_number' });

    if (error) {
      console.warn('Supabase expense save error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase expense exception:', err);
    return false;
  }
};

/* =========================================================================
   8. COMPANY BRANDING PROFILE
   ========================================================================= */

export const fetchCompanyProfileFromSupabase = async (): Promise<CompanyProfile | null> => {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase
      .from('company_profiles')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;

    return {
      name: data.name,
      logoUrl: data.logo_url || undefined,
      address: data.address,
      city: data.city,
      phone: data.phone,
      email: data.email || undefined,
      taxNumber: data.tax_number || undefined
    };
  } catch (err) {
    console.warn('Error fetching company profile from Supabase:', err);
    return null;
  }
};

export const saveCompanyProfileToSupabase = async (profile: CompanyProfile): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;
  try {
    const payload = {
      id: '00000000-0000-0000-0000-000000000010',
      name: profile.name,
      logo_url: profile.logoUrl || null,
      address: profile.address,
      city: profile.city,
      phone: profile.phone,
      email: profile.email || null,
      tax_number: profile.taxNumber || null
    };

    const { error } = await supabase
      .from('company_profiles')
      .upsert(payload);

    if (error) {
      console.warn('Supabase company profile save error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase company profile exception:', err);
    return false;
  }
};

/* =========================================================================
   9. SUPPLIER PAYMENTS MODULE
   ========================================================================= */

export const fetchSupplierPaymentsFromSupabase = async (): Promise<SupplierPayment[] | null> => {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase
      .from('supplier_payments')
      .select('*')
      .order('payment_date', { ascending: false });

    if (error || !data || data.length === 0) return null;

    return data.map((sp: any): SupplierPayment => ({
      id: sp.id,
      receiptNumber: sp.receipt_number,
      supplierId: sp.supplier_id,
      supplierName: sp.supplier_name,
      purchaseBillId: sp.purchase_id,
      purchaseBillNumber: sp.purchase_bill_number,
      paymentDate: sp.payment_date,
      paymentTime: sp.payment_time || undefined,
      amountPaid: Number(sp.amount),
      paymentMethod: sp.payment_method,
      referenceNo: sp.reference_no || undefined,
      proofUrl: sp.proof_url || undefined,
      proofStatus: sp.proof_status || 'Verified',
      branchId: sp.factory_id,
      remainingPayable: Number(sp.remaining_payable || 0),
      notes: sp.notes || undefined,
      createdAt: sp.created_at,
      isDeleted: !!sp.is_deleted,
      deletedAt: sp.deleted_at || undefined,
      deletedBy: sp.deleted_by || undefined
    }));
  } catch (err) {
    console.warn('Error fetching supplier payments from Supabase:', err);
    return null;
  }
};

export const saveSupplierPaymentToSupabase = async (
  payment: SupplierPayment,
  factoryDbId?: string,
  supplierDbId?: string,
  purchaseDbId?: string
): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;
  try {
    const targetFactoryId = factoryDbId || (payment.branchId.length === 36 ? payment.branchId : '00000000-0000-0000-0000-000000000001');

    const payload = {
      id: payment.id.length === 36 ? payment.id : undefined,
      factory_id: targetFactoryId,
      purchase_id: purchaseDbId || (payment.purchaseBillId.length === 36 ? payment.purchaseBillId : null),
      receipt_number: payment.receiptNumber,
      purchase_bill_number: payment.purchaseBillNumber,
      supplier_id: supplierDbId || (payment.supplierId.length === 36 ? payment.supplierId : null),
      supplier_name: payment.supplierName,
      amount: payment.amountPaid,
      payment_date: payment.paymentDate,
      payment_time: payment.paymentTime || null,
      payment_method: payment.paymentMethod,
      reference_no: payment.referenceNo || null,
      notes: payment.notes || null,
      proof_url: payment.proofUrl || null,
      proof_status: payment.proofStatus || 'Verified',
      remaining_payable: payment.remainingPayable || 0,
      is_deleted: !!payment.isDeleted,
      deleted_at: payment.deletedAt || null,
      deleted_by: payment.deletedBy || null
    };

    const { error } = await supabase
      .from('supplier_payments')
      .upsert(payload, { onConflict: 'factory_id,receipt_number' });

    if (error) {
      console.warn('Supabase supplier payment save error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase supplier payment exception:', err);
    return false;
  }
};

/* =========================================================================
   10. PAYMENT SCHEDULES MODULE
   ========================================================================= */

export const fetchPaymentSchedulesFromSupabase = async (): Promise<PaymentScheduleItem[] | null> => {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase
      .from('payment_schedules')
      .select('*, schedule_installments(*)')
      .order('due_date', { ascending: true });

    if (error || !data || data.length === 0) return null;

    return data.map((s: any): PaymentScheduleItem => {
      const installments: ScheduleInstallment[] = (s.schedule_installments || []).map((ins: any) => ({
        id: ins.id,
        installmentNo: ins.installment_number,
        amount: Number(ins.amount),
        dueDate: ins.due_date,
        paidAmount: ins.paid_amount ? Number(ins.paid_amount) : 0,
        status: ins.status,
        notes: ins.notes || undefined
      }));

      return {
        id: s.id,
        type: (s.type === 'Pay' || s.type === 'ToPay') ? 'ToPay' : 'ToReceive',
        partyId: s.party_id,
        partyName: s.party_name,
        partyPhone: s.party_phone || undefined,
        relatedBillNumber: s.related_bill_number || undefined,
        dueDate: s.due_date,
        scheduledAmount: Number(s.scheduled_amount || s.amount || 0),
        paidReceivedAmount: Number(s.paid_received_amount || 0),
        remainingAmount: Number(s.remaining_amount || s.scheduled_amount || s.amount || 0),
        branchId: s.factory_id,
        status: s.status,
        notes: s.notes || s.description || undefined,
        parentScheduleId: s.parent_schedule_id || undefined,
        installmentNo: s.installment_no || undefined,
        installments: installments.length > 0 ? installments : undefined,
        isDeleted: !!s.is_deleted,
        deletedAt: s.deleted_at || undefined,
        deletedBy: s.deleted_by || undefined
      };
    });
  } catch (err) {
    console.warn('Error fetching payment schedules from Supabase:', err);
    return null;
  }
};

export const savePaymentScheduleToSupabase = async (
  item: PaymentScheduleItem,
  factoryDbId?: string,
  partyDbId?: string
): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;
  try {
    const targetFactoryId = factoryDbId || (item.branchId.length === 36 ? item.branchId : '00000000-0000-0000-0000-000000000001');

    const payload = {
      id: item.id.length === 36 ? item.id : undefined,
      factory_id: targetFactoryId,
      type: item.type === 'ToPay' ? 'ToPay' : 'ToReceive',
      party_id: partyDbId || (item.partyId.length === 36 ? item.partyId : null),
      party_name: item.partyName,
      party_phone: item.partyPhone || null,
      related_bill_number: item.relatedBillNumber || null,
      due_date: item.dueDate,
      scheduled_amount: item.scheduledAmount,
      paid_received_amount: item.paidReceivedAmount || 0,
      remaining_amount: item.remainingAmount,
      status: item.status,
      description: item.notes || null,
      notes: item.notes || null,
      installment_no: item.installmentNo || null,
      parent_schedule_id: item.parentScheduleId && item.parentScheduleId.length === 36 ? item.parentScheduleId : null,
      is_deleted: !!item.isDeleted,
      deleted_at: item.deletedAt || null,
      deleted_by: item.deletedBy || null
    };

    const { data, error } = await supabase
      .from('payment_schedules')
      .upsert(payload)
      .select('id')
      .single();

    if (error) {
      console.warn('Supabase schedule save error:', error.message);
      return false;
    }

    // Save installments if present
    if (data?.id && item.installments && item.installments.length > 0) {
      await supabase.from('schedule_installments').delete().eq('schedule_id', data.id);
      const installmentRows = item.installments.map((ins, idx) => ({
        schedule_id: data.id,
        installment_number: ins.installmentNo || (idx + 1),
        amount: ins.amount,
        due_date: ins.dueDate,
        paid_amount: ins.paidAmount || 0,
        status: ins.status || 'Pending',
        notes: ins.notes || null
      }));
      await supabase.from('schedule_installments').insert(installmentRows);
    }

    return true;
  } catch (err) {
    console.warn('Supabase schedule exception:', err);
    return false;
  }
};

/* =========================================================================
   11. GENERIC SOFT DELETE & RESTORE HELPER
   ========================================================================= */

export const softDeleteRecordInSupabase = async (
  tableName: 'parties' | 'products' | 'sales_bills' | 'payments_received' | 'purchases' | 'supplier_payments' | 'expenses' | 'payment_schedules',
  id: string,
  deletedReason?: string,
  deletedBy = 'Factory Admin'
): Promise<boolean> => {
  if (!isSupabaseConfigured() || !id) return false;
  try {
    const { error } = await supabase
      .from(tableName)
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: deletedBy,
        ...(deletedReason ? { notes: `[Deleted: ${deletedReason}]` } : {})
      })
      .eq('id', id);

    if (error) {
      console.warn(`Supabase soft-delete error in ${tableName}:`, error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn(`Supabase soft-delete exception in ${tableName}:`, err);
    return false;
  }
};

export const restoreRecordInSupabase = async (
  tableName: 'parties' | 'products' | 'sales_bills' | 'payments_received' | 'purchases' | 'supplier_payments' | 'expenses' | 'payment_schedules',
  id: string
): Promise<boolean> => {
  if (!isSupabaseConfigured() || !id) return false;
  try {
    const { error } = await supabase
      .from(tableName)
      .update({
        is_deleted: false,
        deleted_at: null,
        deleted_by: null
      })
      .eq('id', id);

    if (error) {
      console.warn(`Supabase restore error in ${tableName}:`, error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn(`Supabase restore exception in ${tableName}:`, err);
    return false;
  }
};
