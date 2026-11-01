/**
 * MySQL API Data Service Layer
 * Connects the React frontend to the Node.js / Express MySQL backend API.
 * Maps between database and React state with clean TypeScript interfaces.
 */

import {
  Factory,
  Party,
  Product,
  SalesBill,
  PaymentReceived,
  PurchaseBill,
  SupplierPayment,
  Expense,
  PaymentScheduleItem,
  CompanyProfile
} from '../types';

const env = (typeof import.meta !== 'undefined' && (import.meta as any)?.env) || {};
const getDefaultApiBase = () => {
  if (env.VITE_API_URL) return env.VITE_API_URL;
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return '/api';
  }
  return 'http://localhost:5000/api';
};
const API_BASE = getDefaultApiBase().replace(/\/+$/, '');

const request = async <T>(endpoint: string, options: RequestInit = {}): Promise<T | null> => {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      ...options
    });
    if (!res.ok) {
      console.warn(`[API] ${options.method || 'GET'} ${endpoint} failed with status ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (err: any) {
    // If backend is not running yet, fail gracefully
    return null;
  }
};

// 1. FACTORIES
export const fetchFactoriesFromMySQL = async (): Promise<Factory[] | null> => {
  return request<Factory[]>('/factories');
};

export const saveFactoryToMySQL = async (factory: Factory): Promise<boolean> => {
  const res = await request<{ success: boolean }>('/factories', {
    method: 'POST',
    body: JSON.stringify(factory)
  });
  return Boolean(res?.success);
};

// 2. COMPANY PROFILE
export const fetchCompanyProfileFromMySQL = async (): Promise<CompanyProfile | null> => {
  return request<CompanyProfile>('/company-profile');
};

export const saveCompanyProfileToMySQL = async (profile: CompanyProfile): Promise<boolean> => {
  const res = await request<{ success: boolean }>('/company-profile', {
    method: 'POST',
    body: JSON.stringify(profile)
  });
  return Boolean(res?.success);
};

// 3. PARTIES
export const fetchPartiesFromMySQL = async (): Promise<Party[] | null> => {
  return request<Party[]>('/parties');
};

export const savePartyToMySQL = async (party: Party): Promise<boolean> => {
  const res = await request<{ success: boolean }>('/parties', {
    method: 'POST',
    body: JSON.stringify(party)
  });
  return Boolean(res?.success);
};

export const insertPartyToMySQL = async (party: Omit<Party, 'id'> & { id?: string }): Promise<string | null> => {
  const res = await request<{ success: boolean; id?: string }>('/parties', {
    method: 'POST',
    body: JSON.stringify(party)
  });
  return res?.id || null;
};

// 4. PRODUCTS
export const fetchProductsFromMySQL = async (): Promise<Product[] | null> => {
  return request<Product[]>('/products');
};

export const saveProductToMySQL = async (product: Product): Promise<boolean> => {
  const res = await request<{ success: boolean }>('/products', {
    method: 'POST',
    body: JSON.stringify(product)
  });
  return Boolean(res?.success);
};

export const insertProductToMySQL = async (product: Omit<Product, 'id'> & { id?: string }): Promise<string | null> => {
  const res = await request<{ success: boolean; id?: string }>('/products', {
    method: 'POST',
    body: JSON.stringify(product)
  });
  return res?.id || null;
};

// 5. SALES BILLS
export const fetchSalesBillsFromMySQL = async (): Promise<SalesBill[] | null> => {
  return request<SalesBill[]>('/sales-bills');
};

export const saveSalesBillToMySQL = async (bill: SalesBill): Promise<boolean> => {
  const res = await request<{ success: boolean }>('/sales-bills', {
    method: 'POST',
    body: JSON.stringify(bill)
  });
  return Boolean(res?.success);
};

// 6. PAYMENTS RECEIVED
export const fetchPaymentsReceivedFromMySQL = async (): Promise<PaymentReceived[] | null> => {
  return request<PaymentReceived[]>('/payments-received');
};

export const savePaymentReceivedToMySQL = async (payment: PaymentReceived): Promise<boolean> => {
  const res = await request<{ success: boolean }>('/payments-received', {
    method: 'POST',
    body: JSON.stringify(payment)
  });
  return Boolean(res?.success);
};

// 7. PURCHASES
export const fetchPurchasesFromMySQL = async (): Promise<PurchaseBill[] | null> => {
  return request<PurchaseBill[]>('/purchases');
};

export const savePurchaseToMySQL = async (purchase: PurchaseBill): Promise<boolean> => {
  const res = await request<{ success: boolean }>('/purchases', {
    method: 'POST',
    body: JSON.stringify(purchase)
  });
  return Boolean(res?.success);
};

// 8. SUPPLIER PAYMENTS
export const fetchSupplierPaymentsFromMySQL = async (): Promise<SupplierPayment[] | null> => {
  return request<SupplierPayment[]>('/supplier-payments');
};

export const saveSupplierPaymentToMySQL = async (payment: SupplierPayment): Promise<boolean> => {
  const res = await request<{ success: boolean }>('/supplier-payments', {
    method: 'POST',
    body: JSON.stringify(payment)
  });
  return Boolean(res?.success);
};

// 9. EXPENSES
export const fetchExpensesFromMySQL = async (): Promise<Expense[] | null> => {
  return request<Expense[]>('/expenses');
};

export const saveExpenseToMySQL = async (expense: Expense): Promise<boolean> => {
  const res = await request<{ success: boolean }>('/expenses', {
    method: 'POST',
    body: JSON.stringify(expense)
  });
  return Boolean(res?.success);
};

// 10. PAYMENT SCHEDULES
export const fetchPaymentSchedulesFromMySQL = async (): Promise<PaymentScheduleItem[] | null> => {
  return request<PaymentScheduleItem[]>('/payment-schedules');
};

export const savePaymentScheduleToMySQL = async (item: PaymentScheduleItem): Promise<boolean> => {
  const res = await request<{ success: boolean }>('/payment-schedules', {
    method: 'POST',
    body: JSON.stringify(item)
  });
  return Boolean(res?.success);
};

export const insertPaymentScheduleToMySQL = async (item: PaymentScheduleItem): Promise<string | null> => {
  const res = await request<{ success: boolean; id?: string }>('/payment-schedules', {
    method: 'POST',
    body: JSON.stringify(item)
  });
  return res?.id || null;
};
