/**
 * Supabase Data Service Layer
 * Seamlessly connects the frontend React application to PostgreSQL/Supabase database tables.
 * Maps between database snake_case columns and TypeScript camelCase interfaces.
 * Provides resilient foreign-key auto-resolution and offline-safe operation.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import * as mysqlService from './mysqlService';

export const isUsingMySQL = (): boolean => {
  const env = (typeof import.meta !== 'undefined' && (import.meta as any)?.env) || {};
  const mode = ((env.VITE_DATABASE || '') as string).toLowerCase();
  // Always use MySQL (TiDB Cloud) backend by default
  return mode !== 'supabase';
};
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
   HELPER: RESOLVE OR ENSURE FOREIGN KEYS
   ========================================================================= */

const resolveFactoryId = async (providedId?: string): Promise<string> => {
  if (providedId && providedId.length === 36) return providedId;
  try {
    const { data } = await supabase.from('factories').select('id').limit(1).maybeSingle();
    return data?.id || '00000000-0000-0000-0000-000000000001';
  } catch {
    return '00000000-0000-0000-0000-000000000001';
  }
};

const resolveOrCreatePartyId = async (
  partyId?: string,
  partyName?: string,
  partyPhone?: string,
  partyType: 'Customer' | 'Supplier' | 'Both' = 'Customer'
): Promise<string> => {
  if (partyId && partyId.length === 36) return partyId;
  const nameToSearch = (partyName || '').trim();

  try {
    if (nameToSearch) {
      // 1. Look up existing party by name
      const { data: existing } = await supabase
        .from('parties')
        .select('id')
        .ilike('name', nameToSearch)
        .limit(1)
        .maybeSingle();

      if (existing?.id) return existing.id;

      // 2. Auto-create party to satisfy foreign key constraint
      const { data: created, error } = await supabase
        .from('parties')
        .insert({
          name: nameToSearch,
          phone: partyPhone || '03000000000',
          whatsapp: partyPhone || '03000000000',
          type: partyType,
          city: 'Multan',
          address: ''
        })
        .select('id')
        .single();

      if (!error && created?.id) return created.id;
    }

    // 3. Fallback to any active party in the database
    const { data: fallback } = await supabase.from('parties').select('id').limit(1).maybeSingle();
    if (fallback?.id) return fallback.id;

    // 4. Emergency auto-create if parties table is completely empty
    const { data: emergency } = await supabase
      .from('parties')
      .insert({
        name: 'General Customer',
        phone: '03000000000',
        type: 'Customer',
        city: 'Multan'
      })
      .select('id')
      .single();

    return emergency?.id || '';
  } catch (err) {
    console.error('Error resolving party ID:', err);
    try {
      const { data: fallback } = await supabase.from('parties').select('id').limit(1).maybeSingle();
      return fallback?.id || '';
    } catch {
      return '';
    }
  }
};

/* =========================================================================
   1. FACTORIES MODULE
   ========================================================================= */

export const fetchFactoriesFromSupabase = async (): Promise<Factory[] | null> => {
  if (isUsingMySQL()) {
    const data = await mysqlService.fetchFactoriesFromMySQL();
    if (data !== null) return data;
  }
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
  if (isUsingMySQL()) {
    return mysqlService.saveFactoryToMySQL(factory);
  }
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
  if (isUsingMySQL()) {
    const data = await mysqlService.fetchPartiesFromMySQL();
    if (data !== null) return data;
  }
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
      createdAt: p.created_at ? p.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
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
  if (isUsingMySQL()) {
    return mysqlService.savePartyToMySQL(party);
  }
  if (!isSupabaseConfigured()) return false;
  try {
    const payload: any = {
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

    if (party.id && party.id.length === 36) {
      payload.id = party.id;
    }

    const { error } = await supabase
      .from('parties')
      .upsert(payload);

    if (error) {
      console.error('Supabase party save error:', error.message, error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase party save exception:', err);
    return false;
  }
};

/**
 * Insert a new party into Supabase and return the database-generated UUID.
 * Used when creating a new party so local state gets the real DB UUID immediately.
 */
export const insertPartyToSupabase = async (party: Omit<Party, 'id'> & { id?: string }): Promise<string | null> => {
  if (isUsingMySQL()) {
    return mysqlService.insertPartyToMySQL(party);
  }
  if (!isSupabaseConfigured()) return null;
  try {
    const payload: any = {
      name: party.name,
      company_name: party.companyName || null,
      phone: party.phone,
      whatsapp: party.whatsapp || party.phone,
      address: party.address || '',
      city: party.city || '',
      type: party.type,
      notes: party.notes || null,
      is_deleted: false
    };

    // Only include id if it's already a valid UUID (36 chars)
    if (party.id && party.id.length === 36) {
      payload.id = party.id;
    }

    const { data, error } = await supabase
      .from('parties')
      .insert(payload)
      .select('id')
      .single();

    if (error) {
      console.error('Supabase insertParty error:', error.message, error);
      return null;
    }
    return data?.id || null;
  } catch (err) {
    console.error('Supabase insertParty exception:', err);
    return null;
  }
};

/* =========================================================================
   3. PRODUCTS CATALOG
   ========================================================================= */

export const fetchProductsFromSupabase = async (): Promise<Product[] | null> => {
  if (isUsingMySQL()) {
    const data = await mysqlService.fetchProductsFromMySQL();
    if (data !== null) return data;
  }
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
  if (isUsingMySQL()) {
    return mysqlService.saveProductToMySQL(product);
  }
  if (!isSupabaseConfigured()) return false;
  try {
    const payload: any = {
      name: product.name,
      category: product.category,
      unit: product.unit || 'KG',
      default_rate: product.defaultRate,
      stock_qty: product.stockQty || 0,
      description: product.description || null
    };

    if (product.id && product.id.length === 36) {
      payload.id = product.id;
    }

    const { error } = await supabase
      .from('products')
      .upsert(payload);

    if (error) {
      console.error('Supabase product save error:', error.message, error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase product save exception:', err);
    return false;
  }
};

/**
 * Insert a new product into Supabase and return the database-generated UUID.
 */
export const insertProductToSupabase = async (product: Omit<Product, 'id'> & { id?: string }): Promise<string | null> => {
  if (isUsingMySQL()) {
    return mysqlService.insertProductToMySQL(product);
  }
  if (!isSupabaseConfigured()) return null;
  try {
    const payload: any = {
      name: product.name,
      category: product.category,
      unit: product.unit || 'KG',
      default_rate: product.defaultRate,
      stock_qty: product.stockQty || 0,
      description: product.description || null
    };

    if (product.id && product.id.length === 36) {
      payload.id = product.id;
    }

    const { data, error } = await supabase
      .from('products')
      .insert(payload)
      .select('id')
      .single();

    if (error) {
      console.error('Supabase insertProduct error:', error.message, error);
      return null;
    }
    return data?.id || null;
  } catch (err) {
    console.error('Supabase insertProduct exception:', err);
    return null;
  }
};

/* =========================================================================
   4. SALES BILLS & LINE ITEMS
   ========================================================================= */

export const fetchSalesBillsFromSupabase = async (): Promise<SalesBill[] | null> => {
  if (isUsingMySQL()) {
    const data = await mysqlService.fetchSalesBillsFromMySQL();
    if (data !== null) return data;
  }
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
      branchName: b.party_name || 'Plant 1',
      items: (b.sales_bill_items || []).map((item: any): BillItem => ({
        id: item.id,
        productId: item.product_id || '',
        productName: item.product_name,
        quantity: Number(item.quantity),
        unit: item.unit || 'KG',
        rate: Number(item.rate),
        lineTotal: Number(item.amount ?? item.line_total ?? (Number(item.quantity) * Number(item.rate)))
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
  if (isUsingMySQL()) {
    return mysqlService.saveSalesBillToMySQL(bill);
  }
  if (!isSupabaseConfigured()) return false;
  try {
    const targetFactoryId = await resolveFactoryId(factoryDbId || bill.branchId);
    const targetPartyId = await resolveOrCreatePartyId(partyDbId || bill.partyId, bill.partyName, bill.partyPhone, 'Customer');

    const billPayload: any = {
      factory_id: targetFactoryId,
      bill_number: bill.billNumber,
      party_id: targetPartyId,
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

    if (bill.id && bill.id.length === 36) {
      billPayload.id = bill.id;
    }

    const { data: savedBill, error: billError } = await supabase
      .from('sales_bills')
      .upsert(billPayload, { onConflict: 'factory_id,bill_number' })
      .select('id')
      .single();

    if (billError) {
      console.error('Supabase sales bill save error:', billError.message, billError);
      return false;
    }

    // Save line items
    if (savedBill?.id && bill.items && bill.items.length > 0) {
      await supabase.from('sales_bill_items').delete().eq('bill_id', savedBill.id);

      const itemsPayload = bill.items.map(item => ({
        bill_id: savedBill.id,
        product_id: item.productId?.length === 36 ? item.productId : null,
        product_name: item.productName,
        quantity: item.quantity,
        unit: item.unit || 'KG',
        rate: item.rate,
        amount: item.lineTotal // Database column is 'amount'
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
  if (isUsingMySQL()) {
    const data = await mysqlService.fetchPaymentsReceivedFromMySQL();
    if (data !== null) return data;
  }
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
      amountReceived: Number(p.amount ?? p.amount_received ?? 0),
      paymentDate: p.payment_date,
      paymentTime: p.payment_time || undefined,
      paymentMethod: p.payment_method,
      referenceNo: p.reference_no || undefined,
      proofUrl: p.proof_url || undefined,
      proofStatus: p.proof_status || 'Verified',
      status: p.status || 'Completed',
      isInitialPayment: !!p.is_initial_payment,
      notes: p.notes || undefined,
      branchId: p.factory_id,
      createdAt: p.created_at,
      allocatedBillIds: (p.payment_allocations || []).map((a: any) => a.bill_id),
      allocations: (p.payment_allocations || []).map((a: any): PaymentAllocation => ({
        billId: a.bill_id,
        billNumber: a.bill_number || '',
        amount: Number(a.allocated_amount ?? a.amount ?? 0)
      })),
      isDeleted: !!p.is_deleted,
      deletedAt: p.deleted_at || undefined,
      deletedBy: p.deleted_by || undefined
    }));
  } catch (err) {
    console.warn('Error fetching payments from Supabase:', err);
    return null;
  }
};

export const savePaymentReceivedToSupabase = async (payment: PaymentReceived, factoryDbId?: string): Promise<boolean> => {
  if (isUsingMySQL()) {
    return mysqlService.savePaymentReceivedToMySQL(payment);
  }
  if (!isSupabaseConfigured()) return false;
  try {
    const targetFactoryId = await resolveFactoryId(factoryDbId || payment.branchId);
    const targetPartyId = await resolveOrCreatePartyId(payment.partyId, payment.partyName, payment.partyPhone, 'Customer');

    const paymentPayload: any = {
      factory_id: targetFactoryId,
      receipt_number: payment.receiptNumber,
      party_id: targetPartyId,
      party_name: payment.partyName,
      party_phone: payment.partyPhone || null,
      amount: payment.amountReceived, // Database column is 'amount'
      payment_date: payment.paymentDate,
      payment_time: payment.paymentTime || null,
      payment_method: payment.paymentMethod,
      reference_no: payment.referenceNo || null,
      proof_url: payment.proofUrl || null,
      proof_status: payment.proofStatus || 'Verified',
      status: payment.status || 'Completed',
      is_initial_payment: !!payment.isInitialPayment,
      notes: payment.notes || null,
      is_deleted: !!payment.isDeleted,
      deleted_at: payment.deletedAt || null,
      deleted_by: payment.deletedBy || null
    };

    if (payment.id && payment.id.length === 36) {
      paymentPayload.id = payment.id;
    }

    const { data: savedPayment, error: paymentError } = await supabase
      .from('payments_received')
      .upsert(paymentPayload, { onConflict: 'factory_id,receipt_number' })
      .select('id')
      .single();

    if (paymentError) {
      console.warn('Supabase payment received save error:', paymentError.message);
      return false;
    }

    if (savedPayment?.id && payment.allocations && payment.allocations.length > 0) {
      await supabase.from('payment_allocations').delete().eq('payment_id', savedPayment.id);
      
      const allocPayload = [];
      for (const a of payment.allocations) {
        // Resolve bill UUID
        let billId = a.billId;
        if (!billId || billId.length !== 36) {
          const { data: bData } = await supabase
            .from('sales_bills')
            .select('id')
            .eq('bill_number', a.billNumber)
            .limit(1)
            .maybeSingle();
          if (bData?.id) billId = bData.id;
        }

        if (billId && billId.length === 36) {
          allocPayload.push({
            payment_id: savedPayment.id,
            bill_id: billId,
            bill_number: a.billNumber,
            allocated_amount: a.amount // Database column is 'allocated_amount'
          });
        }
      }

      if (allocPayload.length > 0) {
        await supabase.from('payment_allocations').insert(allocPayload);
      }
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
  if (isUsingMySQL()) {
    const data = await mysqlService.fetchPurchasesFromMySQL();
    if (data !== null) return data;
  }
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
      dueDate: p.due_date || p.bill_date,
      branchId: p.factory_id,
      items: (p.purchase_items || []).map((item: any): BillItem => ({
        id: item.id,
        productId: '',
        productName: item.product_name,
        quantity: Number(item.quantity),
        unit: item.unit || 'KG',
        rate: Number(item.rate),
        lineTotal: Number(item.amount ?? item.line_total ?? (Number(item.quantity) * Number(item.rate)))
      })),
      grandTotal: Number(p.grand_total),
      amountPaid: Number(p.paid_amount ?? p.amount_paid ?? 0),
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
  if (isUsingMySQL()) {
    return mysqlService.savePurchaseToMySQL(purchase);
  }
  if (!isSupabaseConfigured()) return false;
  try {
    const targetFactoryId = await resolveFactoryId(factoryDbId || purchase.branchId);
    const targetSupplierId = await resolveOrCreatePartyId(purchase.supplierId, purchase.supplierName, undefined, 'Supplier');

    const purchasePayload: any = {
      factory_id: targetFactoryId,
      bill_number: purchase.billNumber,
      supplier_id: targetSupplierId,
      supplier_name: purchase.supplierName,
      bill_date: purchase.billDate,
      grand_total: purchase.grandTotal,
      paid_amount: purchase.amountPaid, // Database column is 'paid_amount'
      outstanding_amount: purchase.outstandingAmount,
      status: purchase.status,
      proof_url: purchase.proofUrl || null,
      proof_status: purchase.proofStatus || 'Not Required',
      notes: purchase.notes || null,
      is_deleted: !!purchase.isDeleted,
      deleted_at: purchase.deletedAt || null,
      deleted_by: purchase.deletedBy || null
    };

    if (purchase.id && purchase.id.length === 36) {
      purchasePayload.id = purchase.id;
    }

    const { data: savedPurchase, error: pError } = await supabase
      .from('purchases')
      .upsert(purchasePayload, { onConflict: 'factory_id,bill_number' })
      .select('id')
      .single();

    if (pError) {
      console.warn('Supabase purchase save error:', pError.message);
      return false;
    }

    if (savedPurchase?.id && purchase.items && purchase.items.length > 0) {
      await supabase.from('purchase_items').delete().eq('purchase_id', savedPurchase.id);
      const itemsPayload = purchase.items.map(item => ({
        purchase_id: savedPurchase.id,
        product_name: item.productName,
        quantity: Math.round(item.quantity),
        unit: item.unit || 'KG',
        rate: item.rate,
        amount: item.lineTotal // Database column is 'amount'
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
  if (isUsingMySQL()) {
    const data = await mysqlService.fetchExpensesFromMySQL();
    if (data !== null) return data;
  }
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
      title: e.title || e.category,
      category: e.category,
      amount: Number(e.amount),
      expenseDate: e.expense_date,
      expenseTime: e.expense_time || undefined,
      paidTo: e.paid_to,
      paymentMethod: e.payment_method,
      referenceNo: e.reference_no || undefined,
      proofUrl: e.proof_url || undefined,
      proofStatus: e.proof_status || undefined,
      notes: e.notes || e.description || undefined,
      branchId: e.factory_id,
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
  if (isUsingMySQL()) {
    return mysqlService.saveExpenseToMySQL(expense);
  }
  if (!isSupabaseConfigured()) return false;
  try {
    const targetFactoryId = await resolveFactoryId(factoryDbId || expense.branchId);

    const payload: any = {
      factory_id: targetFactoryId,
      expense_number: expense.expenseNumber,
      title: expense.title || expense.category,
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

    if (expense.id && expense.id.length === 36) {
      payload.id = expense.id;
    }

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
  if (isUsingMySQL()) {
    const data = await mysqlService.fetchCompanyProfileFromMySQL();
    if (data !== null) return data;
  }
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
  if (isUsingMySQL()) {
    return mysqlService.saveCompanyProfileToMySQL(profile);
  }
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
  if (isUsingMySQL()) {
    const data = await mysqlService.fetchSupplierPaymentsFromMySQL();
    if (data !== null) return data;
  }
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
      purchaseBillId: sp.purchase_id || '',
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
  if (isUsingMySQL()) {
    return mysqlService.saveSupplierPaymentToMySQL(payment);
  }
  if (!isSupabaseConfigured()) return false;
  try {
    const targetFactoryId = await resolveFactoryId(factoryDbId || payment.branchId);
    const targetSupplierId = await resolveOrCreatePartyId(supplierDbId || payment.supplierId, payment.supplierName, undefined, 'Supplier');

    // Resolve purchase UUID if needed
    let targetPurchaseId = purchaseDbId || (payment.purchaseBillId.length === 36 ? payment.purchaseBillId : null);
    if (!targetPurchaseId && payment.purchaseBillNumber) {
      const { data: pData } = await supabase
        .from('purchases')
        .select('id')
        .eq('bill_number', payment.purchaseBillNumber)
        .limit(1)
        .maybeSingle();
      if (pData?.id) targetPurchaseId = pData.id;
    }

    const payload: any = {
      factory_id: targetFactoryId,
      purchase_id: targetPurchaseId,
      receipt_number: payment.receiptNumber,
      purchase_bill_number: payment.purchaseBillNumber || `PB-${payment.receiptNumber}`, // NOT NULL in DB
      supplier_id: targetSupplierId,
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

    if (payment.id && payment.id.length === 36) {
      payload.id = payment.id;
    }

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
  if (isUsingMySQL()) {
    const data = await mysqlService.fetchPaymentSchedulesFromMySQL();
    if (data !== null) return data;
  }
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
  if (isUsingMySQL()) {
    return mysqlService.savePaymentScheduleToMySQL(item);
  }
  if (!isSupabaseConfigured()) return false;
  try {
    const targetFactoryId = await resolveFactoryId(factoryDbId || item.branchId);
    const targetPartyId = await resolveOrCreatePartyId(partyDbId || item.partyId, item.partyName, item.partyPhone);

    const payload: any = {
      factory_id: targetFactoryId,
      type: item.type === 'ToPay' ? 'ToPay' : 'ToReceive',
      party_id: targetPartyId,
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

    if (item.id && item.id.length === 36) {
      payload.id = item.id;
    }

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
    console.error('Supabase schedule exception:', err);
    return false;
  }
};

/**
 * Insert a new payment schedule into Supabase and return the database-generated UUID.
 */
export const insertPaymentScheduleToSupabase = async (
  item: PaymentScheduleItem,
  factoryDbId?: string,
  partyDbId?: string
): Promise<string | null> => {
  if (isUsingMySQL()) {
    return mysqlService.insertPaymentScheduleToMySQL(item);
  }
  if (!isSupabaseConfigured()) return null;
  try {
    const targetFactoryId = await resolveFactoryId(factoryDbId || item.branchId);
    const targetPartyId = await resolveOrCreatePartyId(partyDbId || item.partyId, item.partyName, item.partyPhone);

    const payload: any = {
      factory_id: targetFactoryId,
      type: item.type === 'ToPay' ? 'ToPay' : 'ToReceive',
      party_id: targetPartyId,
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

    if (item.id && item.id.length === 36) {
      payload.id = item.id;
    }

    const { data, error } = await supabase
      .from('payment_schedules')
      .insert(payload)
      .select('id')
      .single();

    if (error) {
      console.error('Supabase schedule insert error:', error.message, error);
      return null;
    }

    // Save installments if present
    if (data?.id && item.installments && item.installments.length > 0) {
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

    return data?.id || null;
  } catch (err) {
    console.error('Supabase schedule insert exception:', err);
    return null;
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

export const softDeleteSalesBillCascadeToDatabase = async (id: string): Promise<boolean> => {
  if (isUsingMySQL()) {
    return mysqlService.softDeleteSalesBillCascadeMySQL(id);
  }
  return true;
};

export const restoreSalesBillCascadeToDatabase = async (id: string): Promise<boolean> => {
  if (isUsingMySQL()) {
    return mysqlService.restoreSalesBillCascadeMySQL(id);
  }
  return true;
};

/* =========================================================================
   12. PERMANENT DELETE RECORD FROM DATABASE
   ========================================================================= */

export const permanentDeleteRecordFromDatabase = async (
  tableName: 'parties' | 'products' | 'sales_bills' | 'payments_received' | 'purchases' | 'supplier_payments' | 'expenses' | 'payment_schedules',
  id: string
): Promise<boolean> => {
  if (!id) return false;
  if (isUsingMySQL()) {
    switch (tableName) {
      case 'sales_bills':
        return mysqlService.permanentDeleteSalesBillFromMySQL(id);
      case 'payments_received':
        return mysqlService.permanentDeletePaymentReceivedFromMySQL(id);
      case 'purchases':
        return mysqlService.permanentDeletePurchaseFromMySQL(id);
      case 'supplier_payments':
        return mysqlService.permanentDeleteSupplierPaymentFromMySQL(id);
      case 'expenses':
        return mysqlService.permanentDeleteExpenseFromMySQL(id);
      case 'payment_schedules':
        return mysqlService.permanentDeletePaymentScheduleFromMySQL(id);
      case 'parties':
        return mysqlService.permanentDeletePartyFromMySQL(id);
      case 'products':
        return mysqlService.permanentDeleteProductFromMySQL(id);
    }
  }

  if (!isSupabaseConfigured()) return false;
  try {
    const { error } = await supabase.from(tableName).delete().eq('id', id);
    if (error) {
      console.warn(`Supabase permanent delete error in ${tableName}:`, error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn(`Supabase permanent delete exception in ${tableName}:`, err);
    return false;
  }
};
