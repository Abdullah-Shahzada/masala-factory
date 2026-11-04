import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { 
  Factory,
  FactoryStatus,
  Branch, 
  Party, 
  Product, 
  SalesBill, 
  PaymentReceived, 
  PaymentScheduleItem, 
  PurchaseBill, 
  Expense, 
  NotificationItem, 
  BranchId,
  SupplierPayment,
  PaymentAllocation,
  ScheduleInstallment,
  CompanyProfile
} from '../types';
import { 
  INITIAL_FACTORIES,
  INITIAL_BRANCHES, 
  INITIAL_PARTIES, 
  INITIAL_PRODUCTS, 
  INITIAL_SALES_BILLS, 
  INITIAL_PAYMENTS_RECEIVED, 
  INITIAL_PURCHASES, 
  INITIAL_EXPENSES, 
  INITIAL_SCHEDULE,
  INITIAL_NOTIFICATIONS 
} from '../data/mockData';
import { calculatePaymentStatus } from '../utils/formatters';
import { isSupabaseConfigured, isDatabaseConnected } from '../lib/supabase';
import {
  fetchFactoriesFromSupabase,
  saveFactoryToSupabase,
  fetchPartiesFromSupabase,
  savePartyToSupabase,
  insertPartyToSupabase,
  fetchProductsFromSupabase,
  saveProductToSupabase,
  insertProductToSupabase,
  fetchSalesBillsFromSupabase,
  saveSalesBillToSupabase,
  fetchPaymentsReceivedFromSupabase,
  savePaymentReceivedToSupabase,
  fetchPurchasesFromSupabase,
  savePurchaseToSupabase,
  fetchExpensesFromSupabase,
  saveExpenseToSupabase,
  fetchCompanyProfileFromSupabase,
  saveCompanyProfileToSupabase,
  fetchSupplierPaymentsFromSupabase,
  saveSupplierPaymentToSupabase,
  fetchPaymentSchedulesFromSupabase,
  savePaymentScheduleToSupabase,
  insertPaymentScheduleToSupabase,
  softDeleteRecordInSupabase,
  restoreRecordInSupabase,
  permanentDeleteRecordFromDatabase,
  softDeleteSalesBillCascadeToDatabase,
  restoreSalesBillCascadeToDatabase
} from '../services/supabaseService';
import { generateUUID } from '../utils/uuid';

interface AppContextType {
  // Factory & Branch State
  factories: Factory[];
  branches: Factory[]; // Alias for backward compatibility
  selectedFactoryId: string; // 'all' or specific factory ID
  selectedBranchId: string; // Alias for backward compatibility
  setSelectedFactoryId: (id: string) => void;
  setSelectedBranchId: (id: string) => void;
  addFactory: (factoryData: Omit<Factory, 'id' | 'createdAt' | 'updatedAt'>) => { success: boolean; message: string; factory?: Factory };
  updateFactory: (id: string, updates: Partial<Factory>) => { success: boolean; message: string };
  toggleFactoryStatus: (id: string) => { success: boolean; message: string };
  getFactoryName: (id?: string) => string;
  addBranch: (branch: { name: string; code: string; city: string; address?: string; phone?: string; email?: string; status?: FactoryStatus; isMain?: boolean }) => void;

  // Dark Mode
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  toggleDarkMode: () => void;

  // Notifications
  notifications: NotificationItem[];
  markNotificationRead: (id: string) => void;
  deleteNotification: (id: string) => void;
  clearAllNotifications: () => void;

  // Parties
  parties: Party[];
  addParty: (party: Omit<Party, 'id' | 'createdAt'>) => Party;
  updateParty: (id: string, party: Partial<Party>) => { success: boolean; message: string };
  softDeleteParty: (id: string, passwordInput?: string) => { success: boolean; message: string };
  restoreParty: (id: string, passwordInput?: string) => { success: boolean; message: string };
  permanentDeleteParty: (id: string, passwordInput?: string) => { success: boolean; message: string };

  // Products
  products: Product[];
  addProduct: (product: Omit<Product, 'id'>) => Product;
  updateProduct: (id: string, product: Partial<Product>) => void;

  // Sales Bills
  salesBills: SalesBill[];
  addSalesBill: (bill: Omit<SalesBill, 'id' | 'createdAt' | 'remainingAmount' | 'status'>) => SalesBill;
  updateSalesBill: (id: string, bill: Partial<SalesBill>) => { success: boolean; message: string };
  softDeleteSalesBill: (id: string, cascadeLinkedReceipts?: boolean) => { success: boolean; message: string; deletedPaymentCount?: number };
  restoreSalesBill: (id: string, restoreLinkedReceipts?: boolean) => { success: boolean; message: string };
  permanentDeleteSalesBill: (id: string, passwordInput?: string) => { success: boolean; message: string };

  // Payments Received
  paymentsReceived: PaymentReceived[];
  recordPayment: (payment: Omit<PaymentReceived, 'id' | 'receiptNumber' | 'createdAt'>) => { success: boolean; message: string };
  updatePaymentReceived: (id: string, updates: Partial<PaymentReceived>) => { success: boolean; message: string };
  softDeletePaymentReceived: (id: string, passwordInput?: string) => { success: boolean; message: string };
  restorePaymentReceived: (id: string, passwordInput?: string) => { success: boolean; message: string };
  permanentDeletePaymentReceived: (id: string, passwordInput?: string) => { success: boolean; message: string };
  completePayment: (paymentId: string, passwordInput?: string) => { success: boolean; message: string };

  // Payment Schedule
  scheduleItems: PaymentScheduleItem[];
  addScheduleItem: (item: Omit<PaymentScheduleItem, 'id'>) => void;
  addScheduleWithInstallments: (parentItem: Omit<PaymentScheduleItem, 'id'>, installments: Array<{ amount: number; dueDate: string; notes?: string }>) => void;
  updateScheduleStatus: (id: string, status: PaymentScheduleItem['status']) => void;
  updateScheduleItem: (id: string, updates: Partial<PaymentScheduleItem>) => { success: boolean; message: string };
  createAdditionalSchedule: (item: Omit<PaymentScheduleItem, 'id'>) => void;
  softDeleteScheduleItem: (id: string, passwordInput?: string) => { success: boolean; message: string };
  restoreScheduleItem: (id: string, passwordInput?: string) => { success: boolean; message: string };
  permanentDeleteScheduleItem: (id: string, passwordInput?: string) => { success: boolean; message: string };

  // Purchase Bills & Supplier Payments
  purchases: PurchaseBill[];
  supplierPayments: SupplierPayment[];
  addPurchase: (purchase: Omit<PurchaseBill, 'id' | 'createdAt' | 'outstandingAmount' | 'status'>) => PurchaseBill;
  updatePurchase: (id: string, updates: Partial<PurchaseBill>) => { success: boolean; message: string };
  softDeletePurchase: (id: string, passwordInput?: string) => { success: boolean; message: string };
  restorePurchase: (id: string, passwordInput?: string) => { success: boolean; message: string };
  permanentDeletePurchase: (id: string, passwordInput?: string) => { success: boolean; message: string };
  recordSupplierPayment: (payment: {
    purchaseId: string;
    amount: number;
    paymentMethod: PaymentReceived['paymentMethod'];
    paymentDate?: string;
    paymentTime?: string;
    referenceNo?: string;
    proofUrl?: string;
    proofStatus?: import('../types').ProofStatus;
    notes?: string;
  }) => { success: boolean; message: string; receipt?: SupplierPayment };
  softDeleteSupplierPayment: (id: string, passwordInput?: string) => { success: boolean; message: string };
  restoreSupplierPayment: (id: string, passwordInput?: string) => { success: boolean; message: string };
  permanentDeleteSupplierPayment: (id: string, passwordInput?: string) => { success: boolean; message: string };

  // Expenses
  expenses: Expense[];
  addExpense: (expense: Omit<Expense, 'id' | 'expenseNumber' | 'createdAt'>) => Expense;
  updateExpense: (id: string, updates: Partial<Expense>) => { success: boolean; message: string };
  softDeleteExpense: (id: string, passwordInput?: string) => { success: boolean; message: string };
  restoreExpense: (id: string, passwordInput?: string) => { success: boolean; message: string };
  permanentDeleteExpense: (id: string, passwordInput?: string) => { success: boolean; message: string };

  // Recently Deleted Aggregation
  recentlyDeleted: import('../types').RecentlyDeletedItem[];
  totalRecentlyDeletedCount: number;

  // Business Details & Company Branding Profile
  businessName: string;
  setBusinessName: (name: string) => void;
  companyProfile: CompanyProfile;
  updateCompanyProfile: (profile: Partial<CompanyProfile>) => void;
  refreshData: () => Promise<void>;
  isSyncing: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const SAVED_PROFILE_KEY = 'masala_company_profile';

export const VALID_ADMIN_PASSWORDS = ['admin', '1234', 'masala123', 'admin123'];

export const verifyAdminPassword = (passwordInput: string): boolean => {
  if (!passwordInput) return false;
  return VALID_ADMIN_PASSWORDS.includes(passwordInput.trim().toLowerCase());
};

export const loadStoredCompanyProfile = (): CompanyProfile => {
  const fallback: CompanyProfile = {
    name: 'Masala Manufacturing & B2B Supply Factory',
    address: 'Plot 42-A, Industrial Estate, Kot Lakhpat',
    city: 'Lahore',
    phone: '+92 42 35891234',
    email: 'info@masalafactory.pk',
    taxNumber: 'NTN: 4419201-7 | STRN: 3277876123456'
  };

  if (typeof window === 'undefined' || !window.localStorage) {
    return fallback;
  }

  try {
    const raw = localStorage.getItem(SAVED_PROFILE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          ...fallback,
          ...parsed
        };
      }
    }
  } catch (err) {
    console.warn('Could not read company profile from localStorage', err);
  }
  return fallback;
};

const FACTORIES_STORAGE_KEY = 'masala_factories';

export const loadStoredFactories = (): Factory[] => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return INITIAL_FACTORIES;
  }
  try {
    const raw = localStorage.getItem(FACTORIES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Upgrade legacy mock data if it had Lahore/Karachi branches
        const hasLegacy = parsed.some((p: any) => p.code === 'LHR-01' || p.city === 'Lahore');
        if (hasLegacy) {
          localStorage.setItem(FACTORIES_STORAGE_KEY, JSON.stringify(INITIAL_FACTORIES));
          return INITIAL_FACTORIES;
        }
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Could not read factories from localStorage', err);
  }
  return INITIAL_FACTORIES;
};

const INITIAL_SUPPLIER_PAYMENTS: SupplierPayment[] = [
  {
    id: 'sp-101',
    receiptNumber: 'SP-101',
    supplierId: 'p-201',
    supplierName: 'Chilli Growers Farmers Co-op',
    purchaseBillId: 'pb-701',
    purchaseBillNumber: 'SUP-882',
    paymentDate: '2026-09-28',
    amountPaid: 85000,
    paymentMethod: 'Bank Transfer',
    referenceNo: 'Meezan-SUP-091',
    branchId: 'b1',
    remainingPayable: 100000,
    proofUrl: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=500&auto=format&fit=crop&q=60',
    proofStatus: 'Proof Attached',
    notes: 'Initial advance via bank transfer for red chilli lot.',
    createdAt: '2026-09-28T10:30:00Z'
  },
  {
    id: 'sp-102',
    receiptNumber: 'SP-INIT-SUP-883',
    supplierId: 'p-202',
    supplierName: 'Packages Limited',
    purchaseBillId: 'pb-702',
    purchaseBillNumber: 'SUP-883',
    paymentDate: '2026-10-01',
    amountPaid: 127500,
    paymentMethod: 'Bank Transfer',
    referenceNo: 'Meezan-PKG-7712',
    branchId: 'b1',
    remainingPayable: 0,
    proofStatus: 'Not Required',
    notes: 'Initial full payment for custom foil packaging.',
    createdAt: '2026-10-01T11:30:00Z'
  }
];

const loadLocalStorage = <T,>(key: string, fallback: T): T => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return fallback;
  }
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const sanitized = parsed.filter(item => {
          if (!item || typeof item !== 'object') return false;
          const id = (item as any).id;
          if (typeof id === 'string' && (id.startsWith('pr-50') || id.startsWith('sb-100') || id.startsWith('pur-20') || id.startsWith('exp-40'))) {
            return false;
          }
          return true;
        });
        return sanitized as unknown as T;
      }
      if (parsed !== null && parsed !== undefined) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn(`Could not read ${key} from localStorage`, err);
  }
  return fallback;
};

const saveLocalStorage = <T,>(key: string, data: T) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(key, JSON.stringify(data));
    }
  } catch (err) {
    console.warn(`Error saving ${key} to localStorage:`, err);
  }
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [factories, setFactories] = useState<Factory[]>(loadStoredFactories);
  const [selectedFactoryId, setSelectedFactoryId] = useState<string>('all');
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(loadStoredCompanyProfile);
  const [businessName, setBusinessName] = useState<string>(() => companyProfile.name || 'Masala Manufacturing & B2B Supply Factory');

  const saveFactories = (newFactories: Factory[]) => {
    setFactories(newFactories);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(FACTORIES_STORAGE_KEY, JSON.stringify(newFactories));
      } catch (e) {
        console.warn('Could not persist factories to localStorage', e);
      }
    }
  };

  const getFactoryName = (id?: string): string => {
    if (!id || id === 'all') return 'All Factories (Global)';
    const found = factories.find(f => f.id === id || f.code === id);
    if (found) return `${found.name} (${found.city})`;
    return id;
  };

  const addFactory = (factoryData: Omit<Factory, 'id' | 'createdAt' | 'updatedAt'>): { success: boolean; message: string; factory?: Factory } => {
    if (!factoryData.name?.trim()) {
      return { success: false, message: 'Factory name is required.' };
    }
    if (!factoryData.code?.trim()) {
      return { success: false, message: 'Unique factory code is required.' };
    }
    if (!factoryData.city?.trim()) {
      return { success: false, message: 'City is required.' };
    }
    if (!factoryData.address?.trim()) {
      return { success: false, message: 'Factory address is required.' };
    }
    if (!factoryData.phone?.trim()) {
      return { success: false, message: 'Contact phone number is required.' };
    }

    const cleanCode = factoryData.code.trim().toUpperCase();
    const isDuplicate = factories.some(f => f.code.trim().toUpperCase() === cleanCode);
    if (isDuplicate) {
      return { success: false, message: `Factory code "${factoryData.code}" already exists. Each factory must have a unique code.` };
    }

    const newId = `fact-${Date.now()}`;
    const newFactory: Factory = {
      ...factoryData,
      id: newId,
      code: cleanCode,
      name: factoryData.name.trim(),
      city: factoryData.city.trim(),
      address: factoryData.address.trim(),
      phone: factoryData.phone.trim(),
      email: factoryData.email?.trim() || undefined,
      status: factoryData.status || 'Active',
      isMain: factoryData.isMain || false,
      notes: factoryData.notes?.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updated = [...factories, newFactory];
    saveFactories(updated);
    if (isDatabaseConnected()) {
      saveFactoryToSupabase(newFactory);
    }
    return { success: true, message: `Factory "${newFactory.name}" (${newFactory.code}) created successfully.`, factory: newFactory };
  };

  const updateFactory = (id: string, updates: Partial<Factory>): { success: boolean; message: string } => {
    const existing = factories.find(f => f.id === id);
    if (!existing) {
      return { success: false, message: 'Factory record not found.' };
    }

    if (updates.code) {
      const cleanCode = updates.code.trim().toUpperCase();
      const isDuplicate = factories.some(f => f.id !== id && f.code.trim().toUpperCase() === cleanCode);
      if (isDuplicate) {
        return { success: false, message: `Factory code "${updates.code}" is already in use by another factory.` };
      }
      updates.code = cleanCode;
    }

    const updatedList = factories.map(f => {
      if (f.id !== id) return f;
      return {
        ...f,
        ...updates,
        updatedAt: new Date().toISOString()
      };
    });

    saveFactories(updatedList);
    if (isDatabaseConnected()) {
      const f = updatedList.find(item => item.id === id);
      if (f) saveFactoryToSupabase(f);
    }
    return { success: true, message: `Factory "${updates.name || existing.name}" updated successfully.` };
  };

  const toggleFactoryStatus = (id: string): { success: boolean; message: string } => {
    const existing = factories.find(f => f.id === id);
    if (!existing) {
      return { success: false, message: 'Factory record not found.' };
    }

    const newStatus: FactoryStatus = existing.status === 'Active' ? 'Inactive' : 'Active';
    const updatedList: Factory[] = factories.map(f => {
      if (f.id !== id) return f;
      return {
        ...f,
        status: newStatus,
        updatedAt: new Date().toISOString()
      };
    });

    saveFactories(updatedList);
    if (isDatabaseConnected()) {
      const f = updatedList.find(item => item.id === id);
      if (f) saveFactoryToSupabase(f);
    }
    return {
      success: true,
      message: `Factory "${existing.name}" is now marked as ${newStatus}. All historical transactions remain preserved.`
    };
  };

  // Backward-compatible addBranch
  const addBranch = (branchData: { name: string; code: string; city: string; address?: string; phone?: string; email?: string; status?: FactoryStatus; isMain?: boolean }) => {
    addFactory({
      name: branchData.name,
      code: branchData.code,
      city: branchData.city,
      address: branchData.address || '',
      phone: branchData.phone || '',
      email: branchData.email,
      status: branchData.status || 'Active',
      isMain: branchData.isMain
    });
  };

  const updateCompanyProfile = (profile: Partial<CompanyProfile>) => {
    setCompanyProfile(prev => {
      const updated = { ...prev, ...profile };
      if (profile.name) {
        setBusinessName(profile.name);
      }
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem(SAVED_PROFILE_KEY, JSON.stringify(updated));
        }
      } catch (err) {
        console.warn('Could not save company profile to localStorage', err);
      }
      if (isDatabaseConnected()) {
        saveCompanyProfileToSupabase(updated);
      }
      return updated;
    });
  };

  // Start with localStorage or INITIAL_* mock data for instant zero-flicker rendering.
  // Database data (MySQL or Supabase) synchronizes seamlessly via the useEffect below.
  const [parties, setParties] = useState<Party[]>(() =>
    loadLocalStorage('MF_PARTIES', INITIAL_PARTIES)
  );
  const [products, setProducts] = useState<Product[]>(() =>
    loadLocalStorage('MF_PRODUCTS', INITIAL_PRODUCTS)
  );
  const [salesBills, setSalesBills] = useState<SalesBill[]>(() =>
    loadLocalStorage('MF_SALES_BILLS', [])
  );
  const [paymentsReceived, setPaymentsReceived] = useState<PaymentReceived[]>(() =>
    loadLocalStorage('MF_PAYMENTS', [])
  );
  const [purchases, setPurchases] = useState<PurchaseBill[]>(() =>
    loadLocalStorage('MF_PURCHASES', [])
  );
  const [supplierPayments, setSupplierPayments] = useState<SupplierPayment[]>(() =>
    loadLocalStorage('MF_SUPPLIER_PAYMENTS', [])
  );
  const [expenses, setExpenses] = useState<Expense[]>(() =>
    loadLocalStorage('MF_EXPENSES', [])
  );
  const [scheduleItems, setScheduleItems] = useState<PaymentScheduleItem[]>(() =>
    loadLocalStorage('MF_SCHEDULES', [])
  );
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    const saved = loadLocalStorage<NotificationItem[] | null>('MF_NOTIFICATIONS', null);
    if (saved !== null) return saved;
    return INITIAL_NOTIFICATIONS;
  });

  const [dismissedNotifIds, setDismissedNotifIds] = useState<string[]>(() =>
    loadLocalStorage<string[]>('MF_DISMISSED_NOTIFICATIONS', [])
  );

  // Sync state to LocalStorage for instant offline persistence & zero data loss on refresh
  useEffect(() => { saveLocalStorage('MF_PARTIES', parties); }, [parties]);
  useEffect(() => { saveLocalStorage('MF_PRODUCTS', products); }, [products]);
  useEffect(() => { saveLocalStorage('MF_SALES_BILLS', salesBills); }, [salesBills]);
  useEffect(() => { saveLocalStorage('MF_PAYMENTS', paymentsReceived); }, [paymentsReceived]);
  useEffect(() => { saveLocalStorage('MF_PURCHASES', purchases); }, [purchases]);
  useEffect(() => { saveLocalStorage('MF_SUPPLIER_PAYMENTS', supplierPayments); }, [supplierPayments]);
  useEffect(() => { saveLocalStorage('MF_EXPENSES', expenses); }, [expenses]);
  useEffect(() => { saveLocalStorage('MF_SCHEDULES', scheduleItems); }, [scheduleItems]);
  useEffect(() => { saveLocalStorage('MF_NOTIFICATIONS', notifications); }, [notifications]);
  useEffect(() => { saveLocalStorage('MF_DISMISSED_NOTIFICATIONS', dismissedNotifIds); }, [dismissedNotifIds]);

  // -------------------------------------------------------------
  // Real-Time Multi-Device Synchronization Engine
  // -------------------------------------------------------------
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const isSyncingRef = useRef<boolean>(false);

  // Cross-Tab Broadcast Channel (instant sync across tabs on same device)
  const notifyBroadcastSync = useCallback(() => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const ch = new BroadcastChannel('mf_cross_device_sync');
        ch.postMessage({ type: 'MUTATION', timestamp: Date.now() });
        ch.close();
      } catch {
        // ignore
      }
    }
  }, []);

  const syncWithDatabase = useCallback(async (isInitial = false) => {
    if (!isDatabaseConnected() || isSyncingRef.current) return;
    isSyncingRef.current = true;
    setIsSyncing(true);

    try {
      const [
        dbFactories,
        dbParties,
        dbProducts,
        dbBills,
        dbPayments,
        dbPurchases,
        dbExpenses,
        dbProfile,
        dbSupplierPayments,
        dbSchedules
      ] = await Promise.all([
        fetchFactoriesFromSupabase(),
        fetchPartiesFromSupabase(),
        fetchProductsFromSupabase(),
        fetchSalesBillsFromSupabase(),
        fetchPaymentsReceivedFromSupabase(),
        fetchPurchasesFromSupabase(),
        fetchExpensesFromSupabase(),
        fetchCompanyProfileFromSupabase(),
        fetchSupplierPaymentsFromSupabase(),
        fetchPaymentSchedulesFromSupabase()
      ]);

      if (dbFactories && dbFactories.length > 0) setFactories(dbFactories);

      if (dbParties && dbParties.length > 0) {
        setParties(dbParties);
      } else if (isInitial && isDatabaseConnected()) {
        const seededParties: Party[] = [];
        for (const p of INITIAL_PARTIES) {
          const uuid = await insertPartyToSupabase(p);
          seededParties.push({ ...p, id: uuid || p.id });
        }
        if (seededParties.length > 0) setParties(seededParties);
      }

      if (dbProducts && dbProducts.length > 0) {
        setProducts(dbProducts);
      } else if (isInitial && isDatabaseConnected()) {
        const seededProducts: Product[] = [];
        for (const pr of INITIAL_PRODUCTS) {
          const uuid = await insertProductToSupabase(pr);
          seededProducts.push({ ...pr, id: uuid || pr.id });
        }
        if (seededProducts.length > 0) setProducts(seededProducts);
      }

      if (dbBills !== null) setSalesBills(dbBills);
      if (dbPayments !== null) setPaymentsReceived(dbPayments);
      if (dbPurchases !== null) setPurchases(dbPurchases);
      if (dbExpenses !== null) setExpenses(dbExpenses);
      if (dbProfile) {
        setCompanyProfile(prev => ({
          ...prev,
          ...dbProfile,
          logoUrl: dbProfile.logoUrl || prev.logoUrl
        }));
      }
      if (dbSupplierPayments !== null) setSupplierPayments(dbSupplierPayments);
      if (dbSchedules !== null) setScheduleItems(dbSchedules);
    } catch (err) {
      console.warn('[Sync] Could not load live data from database:', err);
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, []);

  // Multi-Device Auto-Sync (Initial Mount, Focus, Visibility Change, and Periodic 12s Heartbeat)
  useEffect(() => {
    // 1. Initial Sync
    syncWithDatabase(true);

    // 2. BroadcastChannel Listener for Instant Multi-Tab Sync
    let channel: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        channel = new BroadcastChannel('mf_cross_device_sync');
        channel.onmessage = (event) => {
          if (event.data?.type === 'MUTATION') {
            syncWithDatabase(false);
          }
        };
      } catch (err) {
        console.warn('BroadcastChannel error:', err);
      }
    }

    // 3. Sync whenever user switches back to this window / tab (Focus or Visibility Change)
    const handleFocus = () => {
      syncWithDatabase(false);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncWithDatabase(false);
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 4. Background Heartbeat every 12 seconds so all laptops and mobile PWAs stay in sync
    const intervalId = setInterval(() => {
      syncWithDatabase(false);
    }, 12000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(intervalId);
      channel?.close();
    };
  }, [syncWithDatabase]);

  // Sync Dark Mode class with HTML tag
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(prev => !prev);

  // Notifications Management
  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    setDismissedNotifIds(prev => (prev.includes(id) ? prev : [...prev, id]));
  };

  const clearAllNotifications = () => {
    const allIds = notifications.map(n => n.id);
    setNotifications([]);
    setDismissedNotifIds(prev => [...new Set([...prev, ...allIds])]);
  };

  // Parties - returns newly created party
  // Uses insertPartyToSupabase to get the real UUID from DB and syncs local state immediately
  const addParty = (partyData: Omit<Party, 'id' | 'createdAt'>): Party => {
    const tempId = generateUUID();
    const newParty: Party = {
      ...partyData,
      id: tempId,
      createdAt: new Date().toISOString().split('T')[0]
    };
    setParties(prev => [newParty, ...prev]);

    // If Supabase is connected, insert and get real UUID, then update local state
    if (isDatabaseConnected()) {
      insertPartyToSupabase(newParty).catch(err => console.error(err));
    }
    return newParty;
  };

  const updateParty = (id: string, updatedFields: Partial<Party>): { success: boolean; message: string } => {
    const party = parties.find(p => p.id === id);
    if (!party) return { success: false, message: 'Party record not found.' };

    const updated = { ...party, ...updatedFields };
    setParties(prev => prev.map(p => p.id === id ? updated : p));
    if (isDatabaseConnected()) {
      savePartyToSupabase(updated);
    }

    // Keep name/phone consistent across active lists
    if (updatedFields.name || updatedFields.phone) {
      const newName = updatedFields.name || party.name;
      const newPhone = updatedFields.phone || party.phone;
      setSalesBills(prev => prev.map(b => b.partyId === id ? { ...b, partyName: newName, partyPhone: newPhone } : b));
      setPaymentsReceived(prev => prev.map(p => p.partyId === id ? { ...p, partyName: newName, partyPhone: newPhone } : p));
      setPurchases(prev => prev.map(pb => pb.supplierId === id ? { ...pb, supplierName: newName } : pb));
      setSupplierPayments(prev => prev.map(sp => sp.supplierId === id ? { ...sp, supplierName: newName } : sp));
      setScheduleItems(prev => prev.map(s => s.partyId === id ? { ...s, partyName: newName, partyPhone: newPhone } : s));
    }

    return { success: true, message: `Contact party "${party.name}" updated successfully.` };
  };

  const softDeleteParty = (id: string, _passwordInput?: string): { success: boolean; message: string } => {
    const party = parties.find(p => p.id === id);
    if (!party) return { success: false, message: 'Party record not found.' };

    // Do NOT delete historical bills, payments, purchases, expenses or ledger entries.
    // Exclude party from active selectors by setting isDeleted: true.
    const deleted = {
      ...party,
      isDeleted: true,
      deletedAt: new Date().toISOString(),
      deletedBy: 'Admin'
    };
    setParties(prev => prev.map(p => p.id === id ? deleted : p));
    if (isDatabaseConnected()) {
      savePartyToSupabase(deleted);
    }

    return {
      success: true,
      message: `Contact "${party.name}" moved to Recently Deleted. Historical transactions remain preserved.`
    };
  };

  const restoreParty = (id: string, _passwordInput?: string): { success: boolean; message: string } => {
    const party = parties.find(p => p.id === id);
    if (!party) return { success: false, message: 'Party record not found.' };

    setParties(prev => prev.map(p => p.id === id ? {
      ...p,
      isDeleted: false,
      deletedAt: undefined,
      deletedBy: undefined
    } : p));
    if (isDatabaseConnected()) {
      savePartyToSupabase({ ...party, isDeleted: false, deletedAt: undefined, deletedBy: undefined });
    }

    return {
      success: true,
      message: `Contact "${party.name}" successfully restored to active directory.`
    };
  };

  const permanentDeleteParty = (id: string, _passwordInput?: string): { success: boolean; message: string } => {
    const party = parties.find(p => p.id === id);
    if (!party) return { success: false, message: 'Party record not found.' };

    setParties(prev => prev.filter(p => p.id !== id));
    if (isDatabaseConnected()) {
      permanentDeleteRecordFromDatabase('parties', id);
    }
    return {
      success: true,
      message: `Contact "${party.name}" has been permanently deleted.`
    };
  };

  // Products - returns newly created product
  const addProduct = (productData: Omit<Product, 'id'>): Product => {
    const newId = generateUUID();
    const newProduct: Product = {
      ...productData,
      id: newId
    };
    setProducts(prev => [...prev, newProduct]);
    if (isDatabaseConnected()) {
      insertProductToSupabase(newProduct).catch(err => console.error(err));
    }
    return newProduct;
  };

  const updateProduct = (id: string, updatedFields: Partial<Product>) => {
    const product = products.find(p => p.id === id);
    if (!product) return;
    const updated = { ...product, ...updatedFields };
    setProducts(prev => prev.map(p => p.id === id ? updated : p));
    if (isDatabaseConnected()) {
      saveProductToSupabase(updated);
    }
  };

  // Sales Bills logic with automatic schedule sync
  const addSalesBill = (billData: Omit<SalesBill, 'id' | 'createdAt' | 'remainingAmount' | 'status'>): SalesBill => {
    const remainingAmount = Math.max(0, billData.grandTotal - billData.receivedAmount);
    const status = calculatePaymentStatus(billData.grandTotal, billData.receivedAmount);

    const newBill: SalesBill = {
      ...billData,
      id: `sb-${Date.now()}`,
      remainingAmount,
      status,
      isDeleted: false,
      createdAt: new Date().toISOString()
    };

    setSalesBills(prev => [newBill, ...prev]);
    if (isDatabaseConnected()) {
      saveSalesBillToSupabase(newBill);
    }
    notifyBroadcastSync();

    // If initial payment was received upon bill creation, record a distinct PaymentReceived
    if (billData.receivedAmount > 0) {
      const initialPaymentRecord: PaymentReceived = {
        id: `pr-init-${Date.now()}`,
        receiptNumber: `REC-INIT-${billData.billNumber}`,
        partyId: billData.partyId,
        partyName: billData.partyName,
        partyPhone: billData.partyPhone,
        paymentDate: billData.billDate,
        paymentTime: billData.billTime,
        amountReceived: billData.receivedAmount,
        paymentMethod: ((billData as any).paymentMethod as any) || 'Cash',
        referenceNo: `Initial-Payment-${billData.billNumber}`,
        branchId: billData.branchId,
        allocatedBillIds: [newBill.id],
        allocations: [{
          billId: newBill.id,
          billNumber: billData.billNumber,
          amount: billData.receivedAmount
        }],
        proofStatus: 'Not Required',
        notes: `Initial Payment Against Bill ${billData.billNumber}`,
        status: 'Completed',
        isInitialPayment: true,
        createdAt: new Date().toISOString()
      };
      setPaymentsReceived(prev => [initialPaymentRecord, ...prev]);
      if (isDatabaseConnected()) {
        savePaymentReceivedToSupabase(initialPaymentRecord);
      }
    }

    return newBill;
  };

  const updateSalesBill = (id: string, updatedFields: Partial<SalesBill>): { success: boolean; message: string } => {
    const bill = salesBills.find(b => b.id === id);
    if (!bill) return { success: false, message: 'Sales bill record not found.' };

    const grandTotal = updatedFields.items ? updatedFields.items.reduce((sum, i) => sum + i.lineTotal, 0) : (updatedFields.grandTotal ?? bill.grandTotal);
    const recAmt = updatedFields.receivedAmount ?? bill.receivedAmount;
    const remainingAmount = Math.max(0, grandTotal - recAmt);
    const status = calculatePaymentStatus(grandTotal, recAmt);
    const updated = { ...bill, ...updatedFields, grandTotal, remainingAmount, status };

    setSalesBills(prev => prev.map(b => b.id === id ? updated : b));
    if (isDatabaseConnected()) {
      saveSalesBillToSupabase(updated);
    }
    notifyBroadcastSync();
    return { success: true, message: `Sales Bill ${bill.billNumber} updated successfully.` };
  };

  /**
   * Safe Soft Delete Sales Bill & Cascade Void Linked Payment Receipts
   * Marks sales bill deleted and voids/soft-deletes all linked payment receipts,
   * preserving full accounting audit history in Recently Deleted.
   */
  const softDeleteSalesBill = (id: string, cascadeLinkedReceipts: boolean = true): { success: boolean; message: string; deletedPaymentCount?: number } => {
    const bill = salesBills.find(b => b.id === id);
    if (!bill) {
      return { success: false, message: 'Bill record not found.' };
    }

    const now = new Date().toISOString();

    // Mark soft deleted
    const deletedBill = {
      ...bill,
      isDeleted: true,
      deletedAt: now,
      deletedBy: 'Factory Admin'
    };
    setSalesBills(prev => prev.map(b => b.id === id ? deletedBill : b));

    // Find linked active payment receipts
    const linkedPayments = paymentsReceived.filter(p =>
      !p.isDeleted && (
        p.allocatedBillIds.includes(bill.id) ||
        p.allocations?.some(a => a.billId === bill.id || a.billNumber === bill.billNumber) ||
        p.receiptNumber === `REC-INIT-${bill.billNumber}`
      )
    );

    // Cascade delete linked payment receipts if requested
    if (cascadeLinkedReceipts && linkedPayments.length > 0) {
      const linkedIds = new Set(linkedPayments.map(p => p.id));
      setPaymentsReceived(prev => prev.map(p => {
        if (!linkedIds.has(p.id)) return p;
        return {
          ...p,
          isDeleted: true,
          deletedAt: now,
          deletedBy: 'Factory Admin'
        };
      }));
    }

    if (isDatabaseConnected()) {
      softDeleteSalesBillCascadeToDatabase(id);
    }
    notifyBroadcastSync();

    return {
      success: true,
      message: linkedPayments.length > 0
        ? `Sales Bill ${bill.billNumber} and ${linkedPayments.length} linked receipt(s) moved to Recently Deleted.`
        : `Sales Bill ${bill.billNumber} soft-deleted. Moved to Recently Deleted.`,
      deletedPaymentCount: linkedPayments.length
    };
  };

  /**
   * Restore Soft-Deleted Sales Bill & Linked Receipts
   */
  const restoreSalesBill = (id: string, restoreLinkedReceipts: boolean = true): { success: boolean; message: string } => {
    const bill = salesBills.find(b => b.id === id);
    if (!bill) {
      return { success: false, message: 'Bill record not found.' };
    }

    // Recalculate balances and restore
    const remainingAmount = Math.max(0, bill.grandTotal - bill.receivedAmount);
    const status = calculatePaymentStatus(bill.grandTotal, bill.receivedAmount);

    setSalesBills(prev => prev.map(b => {
      if (b.id !== id) return b;
      return {
        ...b,
        remainingAmount,
        status,
        isDeleted: false,
        deletedAt: undefined,
        deletedBy: undefined
      };
    }));

    if (restoreLinkedReceipts) {
      setPaymentsReceived(prev => prev.map(p => {
        const isLinked = p.allocatedBillIds.includes(bill.id) ||
          p.allocations?.some(a => a.billId === bill.id || a.billNumber === bill.billNumber) ||
          p.receiptNumber === `REC-INIT-${bill.billNumber}`;
        if (!isLinked) return p;
        return {
          ...p,
          isDeleted: false,
          deletedAt: undefined,
          deletedBy: undefined
        };
      }));
    }

    if (isDatabaseConnected()) {
      restoreSalesBillCascadeToDatabase(id);
    }
    notifyBroadcastSync();

    return {
      success: true,
      message: `Sales Bill ${bill.billNumber} successfully restored to active records.`
    };
  };

  const permanentDeleteSalesBill = (id: string, _passwordInput?: string): { success: boolean; message: string } => {
    const bill = salesBills.find(b => b.id === id);
    if (!bill) return { success: false, message: 'Sales bill not found.' };

    if (bill.receivedAmount > 0) {
      return {
        success: false,
        message: `Deletion Blocked: Sales Bill ${bill.billNumber} has recorded payments (Rs. ${bill.receivedAmount.toLocaleString('en-PK')}). Cannot permanently delete.`
      };
    }

    setSalesBills(prev => prev.filter(b => b.id !== id));
    if (isDatabaseConnected()) {
      permanentDeleteRecordFromDatabase('sales_bills', id);
    }
    notifyBroadcastSync();
    return {
      success: true,
      message: `Sales Bill ${bill.billNumber} permanently deleted.`
    };
  };

  /**
   * Record Payment Received & Consistently Update Allocated Sales Bills
   * Supports specific custom allocations per bill or sequential fallback.
   * Guards against overpayment.
   */
  const recordPayment = (paymentData: Omit<PaymentReceived, 'id' | 'receiptNumber' | 'createdAt'>): { success: boolean; message: string } => {
    const { partyId, amountReceived, allocatedBillIds, allocations } = paymentData;

    // Calculate total outstanding balance across allocated active bills
    const targetBills = salesBills.filter(b => allocatedBillIds.includes(b.id) && !b.isDeleted);
    const totalOutstanding = targetBills.reduce((sum, b) => sum + b.remainingAmount, 0);

    if (amountReceived > totalOutstanding && totalOutstanding > 0) {
      return {
        success: false,
        message: `Overpayment Error: Amount Received (Rs.${amountReceived.toLocaleString()}) exceeds total outstanding balance (Rs.${totalOutstanding.toLocaleString()}) of allocated bills.`
      };
    }

    // Determine actual allocations
    let finalAllocations: PaymentAllocation[] = [];
    if (allocations && allocations.length > 0) {
      finalAllocations = allocations;
    } else {
      let rem = amountReceived;
      finalAllocations = targetBills.map(b => {
        const alloc = Math.min(b.remainingAmount, rem);
        rem -= alloc;
        return {
          billId: b.id,
          billNumber: b.billNumber,
          amount: alloc
        };
      }).filter(a => a.amount > 0);
    }

    const receiptNumber = `REC-${(paymentsReceived.length + 101).toString().padStart(3, '0')}`;
    const newPayment: PaymentReceived = {
      ...paymentData,
      id: `pr-${Date.now()}`,
      receiptNumber,
      allocations: finalAllocations,
      proofStatus: paymentData.proofStatus || (paymentData.proofUrl ? 'Proof Attached' : 'Proof Missing'),
      status: paymentData.status || 'Completed',
      createdAt: new Date().toISOString()
    };

    setPaymentsReceived(prev => [newPayment, ...prev]);
    if (isDatabaseConnected()) {
      savePaymentReceivedToSupabase(newPayment);
    }
    notifyBroadcastSync();

    // Update sales bills based on allocations
    setSalesBills(prev => prev.map(bill => {
      const allocationItem = finalAllocations.find(a => a.billId === bill.id);
      if (!allocationItem || bill.isDeleted) return bill;

      const newReceivedAmount = bill.receivedAmount + allocationItem.amount;
      const newRemainingAmount = Math.max(0, bill.grandTotal - newReceivedAmount);
      const newStatus = calculatePaymentStatus(bill.grandTotal, newReceivedAmount);

      return {
        ...bill,
        receivedAmount: newReceivedAmount,
        remainingAmount: newRemainingAmount,
        status: newStatus
      };
    }));

    // Persist updated sales bill balances to Supabase
    if (isDatabaseConnected()) {
      finalAllocations.forEach(alloc => {
        const bill = salesBills.find(b => b.id === alloc.billId || b.billNumber === alloc.billNumber);
        if (bill) {
          const newReceivedAmount = bill.receivedAmount + alloc.amount;
          const newRemainingAmount = Math.max(0, bill.grandTotal - newReceivedAmount);
          const newStatus = calculatePaymentStatus(bill.grandTotal, newReceivedAmount);
          saveSalesBillToSupabase({
            ...bill,
            receivedAmount: newReceivedAmount,
            remainingAmount: newRemainingAmount,
            status: newStatus
          });
        }
      });
    }

    return {
      success: true,
      message: `Payment of Rs.${amountReceived.toLocaleString()} successfully recorded and allocated.`
    };
  };

  /**
   * Complete Payment with Password Verification
   * Re-applies allocation against linked sales bills.
   */
  const completePayment = (paymentId: string, passwordInput?: string): { success: boolean; message: string } => {
    const validPasswords = ['admin', '1234', 'masala123', 'admin123'];
    if (!passwordInput || !validPasswords.includes(passwordInput.trim().toLowerCase())) {
      return {
        success: false,
        message: 'Invalid Verification Password. Action cancelled.'
      };
    }

    const payment = paymentsReceived.find(p => p.id === paymentId);
    if (!payment) {
      return { success: false, message: 'Payment record not found.' };
    }
    if (payment.status === 'Completed') {
      return { success: false, message: 'Payment is already marked as completed.' };
    }

    const allocations = payment.allocations || [];

    // Re-apply allocation on Sales Bills
    setSalesBills(prev => prev.map(bill => {
      const alloc = allocations.find(a => a.billId === bill.id);
      if (!alloc) return bill;
      const newReceived = bill.receivedAmount + alloc.amount;
      const newRemaining = Math.max(0, bill.grandTotal - newReceived);
      const newStatus = calculatePaymentStatus(bill.grandTotal, newReceived);
      return {
        ...bill,
        receivedAmount: newReceived,
        remainingAmount: newRemaining,
        status: newStatus
      };
    }));

    setPaymentsReceived(prev => prev.map(p => p.id === paymentId ? { ...p, status: 'Completed' } : p));

    return {
      success: true,
      message: `Payment ${payment.receiptNumber} marked as completed and verified.`
    };
  };

  const updatePaymentReceived = (id: string, updates: Partial<PaymentReceived>): { success: boolean; message: string } => {
    const payment = paymentsReceived.find(p => p.id === id);
    if (!payment) return { success: false, message: 'Payment record not found.' };

    const updated = { ...payment, ...updates };
    setPaymentsReceived(prev => prev.map(p => p.id === id ? updated : p));
    if (isDatabaseConnected()) {
      savePaymentReceivedToSupabase(updated);
    }
    return { success: true, message: `Payment receipt ${payment.receiptNumber} updated successfully.` };
  };

  const softDeletePaymentReceived = (id: string, _passwordInput?: string): { success: boolean; message: string } => {
    const payment = paymentsReceived.find(p => p.id === id);
    if (!payment) return { success: false, message: 'Payment record not found.' };

    // Reverse allocation from allocated sales bills so bill balances accurately reflect payment is in trash
    if (payment.allocations && payment.allocations.length > 0) {
      setSalesBills(prev => prev.map(b => {
        const alloc = payment.allocations?.find(a => a.billId === b.id);
        if (!alloc) return b;
        const newReceived = Math.max(0, b.receivedAmount - alloc.amount);
        const newRemaining = Math.max(0, b.grandTotal - newReceived);
        const newStatus = calculatePaymentStatus(b.grandTotal, newReceived);
        const updatedBill = {
          ...b,
          receivedAmount: newReceived,
          remainingAmount: newRemaining,
          status: newStatus
        };
        if (isDatabaseConnected()) {
          saveSalesBillToSupabase(updatedBill);
        }
        return updatedBill;
      }));
    } else if (payment.allocatedBillIds && payment.allocatedBillIds.length > 0) {
      setSalesBills(prev => prev.map(b => {
        if (!payment.allocatedBillIds.includes(b.id)) return b;
        const newReceived = Math.max(0, b.receivedAmount - payment.amountReceived);
        const newRemaining = Math.max(0, b.grandTotal - newReceived);
        const newStatus = calculatePaymentStatus(b.grandTotal, newReceived);
        const updatedBill = {
          ...b,
          receivedAmount: newReceived,
          remainingAmount: newRemaining,
          status: newStatus
        };
        if (isDatabaseConnected()) {
          saveSalesBillToSupabase(updatedBill);
        }
        return updatedBill;
      }));
    }

    const deletedRecord: PaymentReceived = {
      ...payment,
      isDeleted: true,
      deletedAt: new Date().toISOString(),
      deletedBy: 'Factory Admin'
    };
    setPaymentsReceived(prev => prev.map(p => p.id === id ? deletedRecord : p));
    if (isDatabaseConnected()) {
      savePaymentReceivedToSupabase(deletedRecord);
    }

    return {
      success: true,
      message: `Payment Receipt ${payment.receiptNumber} soft-deleted. Moved to Recently Deleted.`
    };
  };

  const restorePaymentReceived = (id: string, _passwordInput?: string): { success: boolean; message: string } => {
    const payment = paymentsReceived.find(p => p.id === id);
    if (!payment) return { success: false, message: 'Payment record not found.' };

    // Re-apply allocation on Sales Bills
    if (payment.allocations && payment.allocations.length > 0) {
      setSalesBills(prev => prev.map(b => {
        const alloc = payment.allocations?.find(a => a.billId === b.id);
        if (!alloc) return b;
        const newReceived = b.receivedAmount + alloc.amount;
        const newRemaining = Math.max(0, b.grandTotal - newReceived);
        const newStatus = calculatePaymentStatus(b.grandTotal, newReceived);
        const updatedBill = {
          ...b,
          receivedAmount: newReceived,
          remainingAmount: newRemaining,
          status: newStatus
        };
        if (isDatabaseConnected()) {
          saveSalesBillToSupabase(updatedBill);
        }
        return updatedBill;
      }));
    } else if (payment.allocatedBillIds && payment.allocatedBillIds.length > 0) {
      setSalesBills(prev => prev.map(b => {
        if (!payment.allocatedBillIds.includes(b.id)) return b;
        const newReceived = b.receivedAmount + payment.amountReceived;
        const newRemaining = Math.max(0, b.grandTotal - newReceived);
        const newStatus = calculatePaymentStatus(b.grandTotal, newReceived);
        const updatedBill = {
          ...b,
          receivedAmount: newReceived,
          remainingAmount: newRemaining,
          status: newStatus
        };
        if (isDatabaseConnected()) {
          saveSalesBillToSupabase(updatedBill);
        }
        return updatedBill;
      }));
    }

    setPaymentsReceived(prev => prev.map(p => p.id === id ? {
      ...p,
      isDeleted: false,
      deletedAt: undefined,
      deletedBy: undefined
    } : p));

    if (isDatabaseConnected()) {
      savePaymentReceivedToSupabase({
        ...payment,
        isDeleted: false,
        deletedAt: undefined,
        deletedBy: undefined
      });
    }

    return {
      success: true,
      message: `Payment Receipt ${payment.receiptNumber} successfully restored to active records.`
    };
  };

  const permanentDeletePaymentReceived = (id: string, _passwordInput?: string): { success: boolean; message: string } => {
    const payment = paymentsReceived.find(p => p.id === id);
    if (!payment) return { success: false, message: 'Payment record not found.' };

    setPaymentsReceived(prev => prev.filter(p => p.id !== id));
    if (isDatabaseConnected()) {
      permanentDeleteRecordFromDatabase('payments_received', id);
    }
    notifyBroadcastSync();
    return {
      success: true,
      message: `Payment Receipt ${payment.receiptNumber} permanently deleted.`
    };
  };

  // Payment Schedule management
  const addScheduleItem = (itemData: Omit<PaymentScheduleItem, 'id'>) => {
    const tempId = `sch-${Date.now()}`;
    const newItem: PaymentScheduleItem = {
      ...itemData,
      id: tempId
    };
    setScheduleItems(prev => [newItem, ...prev]);
    if (isDatabaseConnected()) {
      insertPaymentScheduleToSupabase(newItem).then(uuid => {
        if (uuid) {
          setScheduleItems(prev => prev.map(s => s.id === tempId ? { ...s, id: uuid } : s));
        }
      });
    }
  };

  const addScheduleWithInstallments = (
    parentItem: Omit<PaymentScheduleItem, 'id'>, 
    installments: Array<{ amount: number; dueDate: string; notes?: string }>
  ) => {
    const parentId = `sch-parent-${Date.now()}`;
    const createdItems: PaymentScheduleItem[] = installments.map((inst, idx) => ({
      ...parentItem,
      id: `sch-inst-${Date.now()}-${idx + 1}`,
      dueDate: inst.dueDate,
      scheduledAmount: inst.amount,
      paidReceivedAmount: 0,
      remainingAmount: inst.amount,
      status: 'Upcoming',
      notes: inst.notes || `Installment ${idx + 1} of ${installments.length}${parentItem.notes ? ` — ${parentItem.notes}` : ''}`,
      parentScheduleId: parentId,
      installmentNo: idx + 1
    }));

    setScheduleItems(prev => [...createdItems, ...prev]);
    if (isDatabaseConnected()) {
      createdItems.forEach(item => savePaymentScheduleToSupabase(item));
    }
  };

  const updateScheduleStatus = (id: string, status: PaymentScheduleItem['status']) => {
    setScheduleItems(prev => prev.map(s => {
      if (s.id !== id) return s;
      const updated = { ...s, status };
      if (isDatabaseConnected()) {
        savePaymentScheduleToSupabase(updated);
      }
      return updated;
    }));
  };

  const updateScheduleItem = (id: string, updates: Partial<PaymentScheduleItem>): { success: boolean; message: string } => {
    const target = scheduleItems.find(s => s.id === id);
    if (!target) {
      return { success: false, message: 'Schedule item not found.' };
    }

    setScheduleItems(prev => prev.map(s => {
      if (s.id !== id) return s;
      const updated = { ...s, ...updates };
      const paid = updated.paidReceivedAmount || 0;
      const remaining = Math.max(0, updated.scheduledAmount - paid);
      const status: PaymentScheduleItem['status'] = remaining <= 0 ? 'Completed' : (paid > 0 ? 'Partially Paid' : (updated.status || 'Upcoming'));
      const finalItem = {
        ...updated,
        remainingAmount: remaining,
        status: updates.status || status
      };
      if (isDatabaseConnected()) {
        savePaymentScheduleToSupabase(finalItem);
      }
      return finalItem;
    }));

    return { success: true, message: 'Schedule item updated successfully.' };
  };

  const createAdditionalSchedule = (item: Omit<PaymentScheduleItem, 'id'>) => {
    const newItem: PaymentScheduleItem = {
      ...item,
      id: `sch-add-${Date.now()}`
    };
    setScheduleItems(prev => [newItem, ...prev]);
    if (isDatabaseConnected()) {
      savePaymentScheduleToSupabase(newItem);
    }
  };

  const softDeleteScheduleItem = (id: string, _passwordInput?: string): { success: boolean; message: string } => {
    const item = scheduleItems.find(s => s.id === id);
    if (!item) return { success: false, message: 'Schedule item not found.' };

    setScheduleItems(prev => prev.map(s => s.id === id ? {
      ...s,
      isDeleted: true,
      deletedAt: new Date().toISOString(),
      deletedBy: 'Factory Admin'
    } : s));

    if (isDatabaseConnected()) {
      softDeleteRecordInSupabase('payment_schedules', id);
    }

    return { success: true, message: 'Schedule reminder moved to Recently Deleted.' };
  };

  const restoreScheduleItem = (id: string, _passwordInput?: string): { success: boolean; message: string } => {
    const item = scheduleItems.find(s => s.id === id);
    if (!item) return { success: false, message: 'Schedule item not found.' };

    setScheduleItems(prev => prev.map(s => s.id === id ? {
      ...s,
      isDeleted: false,
      deletedAt: undefined,
      deletedBy: undefined
    } : s));

    if (isDatabaseConnected()) {
      restoreRecordInSupabase('payment_schedules', id);
    }

    return { success: true, message: 'Schedule reminder restored successfully.' };
  };

  const permanentDeleteScheduleItem = (id: string, _passwordInput?: string): { success: boolean; message: string } => {
    const item = scheduleItems.find(s => s.id === id);
    if (!item) return { success: false, message: 'Schedule item not found.' };

    setScheduleItems(prev => prev.filter(s => s.id !== id));
    if (isDatabaseConnected()) {
      permanentDeleteRecordFromDatabase('payment_schedules', id);
    }
    return { success: true, message: 'Schedule reminder permanently deleted.' };
  };

  // Purchases logic
  const addPurchase = (purchaseData: Omit<PurchaseBill, 'id' | 'createdAt' | 'outstandingAmount' | 'status'>): PurchaseBill => {
    const outstandingAmount = Math.max(0, purchaseData.grandTotal - purchaseData.amountPaid);
    const status = calculatePaymentStatus(purchaseData.grandTotal, purchaseData.amountPaid);

    const newPurchase: PurchaseBill = {
      ...purchaseData,
      id: `pb-${Date.now()}`,
      outstandingAmount,
      status,
      proofStatus: purchaseData.proofStatus || (purchaseData.proofUrl ? 'Proof Attached' : 'Not Required'),
      createdAt: new Date().toISOString()
    };

    setPurchases(prev => [newPurchase, ...prev]);
    if (isDatabaseConnected()) {
      savePurchaseToSupabase(newPurchase);
    }

    // If initial payment is made upon purchase creation, record separate initial supplier payment receipt
    if (purchaseData.amountPaid > 0) {
      const initialSupplierPayment: SupplierPayment = {
        id: `sp-init-${Date.now()}`,
        receiptNumber: `SP-INIT-${purchaseData.billNumber}`,
        supplierId: purchaseData.supplierId,
        supplierName: purchaseData.supplierName,
        purchaseBillId: newPurchase.id,
        purchaseBillNumber: purchaseData.billNumber,
        paymentDate: purchaseData.billDate,
        paymentTime: purchaseData.billTime,
        amountPaid: purchaseData.amountPaid,
        paymentMethod: 'Cash',
        referenceNo: `Initial-Payment-${purchaseData.billNumber}`,
        branchId: purchaseData.branchId,
        remainingPayable: outstandingAmount,
        proofStatus: 'Not Required',
        notes: `Initial Payment Against Bill ${purchaseData.billNumber}`,
        createdAt: new Date().toISOString()
      };
      setSupplierPayments(prev => [initialSupplierPayment, ...prev]);
    }

    return newPurchase;
  };

  const recordSupplierPayment = (payment: {
    purchaseId: string;
    amount: number;
    paymentMethod: PaymentReceived['paymentMethod'];
    paymentDate?: string;
    paymentTime?: string;
    referenceNo?: string;
    proofUrl?: string;
    proofStatus?: import('../types').ProofStatus;
    notes?: string;
  }): { success: boolean; message: string; receipt?: SupplierPayment } => {
    const purchase = purchases.find(pb => pb.id === payment.purchaseId);
    if (!purchase) {
      return { success: false, message: 'Purchase bill not found.' };
    }

    if (payment.amount <= 0) {
      return { success: false, message: 'Payment amount must be greater than zero.' };
    }

    if (payment.amount > purchase.outstandingAmount) {
      return {
        success: false,
        message: `Overpayment Error: Payment amount (Rs.${payment.amount.toLocaleString()}) exceeds outstanding payable balance (Rs.${purchase.outstandingAmount.toLocaleString()}).`
      };
    }

    const newPaid = purchase.amountPaid + payment.amount;
    const newOutstanding = Math.max(0, purchase.grandTotal - newPaid);
    const newStatus = calculatePaymentStatus(purchase.grandTotal, newPaid);

    // Update purchase bill
    setPurchases(prev => prev.map(pb => {
      if (pb.id !== payment.purchaseId) return pb;
      return {
        ...pb,
        amountPaid: newPaid,
        outstandingAmount: newOutstanding,
        status: newStatus
      };
    }));

    if (isDatabaseConnected()) {
      savePurchaseToSupabase({
        ...purchase,
        amountPaid: newPaid,
        outstandingAmount: newOutstanding,
        status: newStatus
      });
    }

    const receiptNumber = `SP-${(supplierPayments.length + 101).toString().padStart(3, '0')}`;
    const supplierPaymentRecord: SupplierPayment = {
      id: `sp-${Date.now()}`,
      receiptNumber,
      supplierId: purchase.supplierId,
      supplierName: purchase.supplierName,
      purchaseBillId: purchase.id,
      purchaseBillNumber: purchase.billNumber,
      paymentDate: payment.paymentDate || new Date().toISOString().split('T')[0],
      paymentTime: payment.paymentTime,
      amountPaid: payment.amount,
      paymentMethod: payment.paymentMethod,
      referenceNo: payment.referenceNo,
      proofUrl: payment.proofUrl,
      proofStatus: payment.proofStatus || (payment.proofUrl ? 'Proof Attached' : 'Proof Missing'),
      branchId: purchase.branchId,
      remainingPayable: newOutstanding,
      notes: payment.notes,
      createdAt: new Date().toISOString()
    };

    setSupplierPayments(prev => [supplierPaymentRecord, ...prev]);
    if (isDatabaseConnected()) {
      saveSupplierPaymentToSupabase(supplierPaymentRecord);
    }

    return {
      success: true,
      message: `Supplier Payment of Rs.${payment.amount.toLocaleString()} recorded successfully.`,
      receipt: supplierPaymentRecord
    };
  };

  const updatePurchase = (id: string, updates: Partial<PurchaseBill>): { success: boolean; message: string } => {
    const purchase = purchases.find(p => p.id === id);
    if (!purchase) return { success: false, message: 'Purchase record not found.' };

    setPurchases(prev => prev.map(pb => {
      if (pb.id !== id) return pb;
      const updated = { ...pb, ...updates };
      const grandTotal = updated.items ? updated.items.reduce((sum, i) => sum + i.lineTotal, 0) : updated.grandTotal;
      const outstandingAmount = Math.max(0, grandTotal - updated.amountPaid);
      const status = calculatePaymentStatus(grandTotal, updated.amountPaid);
      const finalUpdated = {
        ...updated,
        grandTotal,
        outstandingAmount,
        status
      };
      if (isDatabaseConnected()) {
        savePurchaseToSupabase(finalUpdated);
      }
      return finalUpdated;
    }));
    return { success: true, message: `Supplier Purchase ${purchase.billNumber} updated successfully.` };
  };

  const softDeletePurchase = (id: string, _passwordInput?: string): { success: boolean; message: string } => {
    const purchase = purchases.find(pb => pb.id === id);
    if (!purchase) return { success: false, message: 'Purchase bill record not found.' };

    const linkedPayments = supplierPayments.filter(sp => sp.purchaseBillId === purchase.id && !sp.isDeleted);
    if (linkedPayments.length > 0 || purchase.amountPaid > 0) {
      return {
        success: false,
        message: `Deletion Blocked: Purchase bill ${purchase.billNumber} has ${linkedPayments.length} linked supplier payment(s) (Rs. ${purchase.amountPaid.toLocaleString('en-PK')}). To preserve audit integrity, delete payments first.`
      };
    }

    const deletedPurchase = {
      ...purchase,
      isDeleted: true,
      deletedAt: new Date().toISOString(),
      deletedBy: 'Factory Admin'
    };

    setPurchases(prev => prev.map(pb => pb.id === id ? deletedPurchase : pb));

    if (isDatabaseConnected()) {
      savePurchaseToSupabase(deletedPurchase);
    }

    return {
      success: true,
      message: `Supplier Purchase ${purchase.billNumber} soft-deleted. Moved to Recently Deleted.`
    };
  };

  const restorePurchase = (id: string, _passwordInput?: string): { success: boolean; message: string } => {
    const purchase = purchases.find(pb => pb.id === id);
    if (!purchase) return { success: false, message: 'Purchase record not found.' };

    setPurchases(prev => prev.map(pb => {
      if (pb.id !== id) return pb;
      return {
        ...pb,
        isDeleted: false,
        deletedAt: undefined,
        deletedBy: undefined
      };
    }));

    if (isDatabaseConnected()) {
      savePurchaseToSupabase({
        ...purchase,
        isDeleted: false,
        deletedAt: undefined,
        deletedBy: undefined
      });
    }

    return {
      success: true,
      message: `Supplier Purchase ${purchase.billNumber} successfully restored to active records.`
    };
  };

  const permanentDeletePurchase = (id: string, _passwordInput?: string): { success: boolean; message: string } => {
    const purchase = purchases.find(pb => pb.id === id);
    if (!purchase) return { success: false, message: 'Purchase record not found.' };
    if (purchase.amountPaid > 0) {
      return { success: false, message: 'Cannot permanently delete purchase with recorded payments.' };
    }

    setPurchases(prev => prev.filter(pb => pb.id !== id));
    if (isDatabaseConnected()) {
      permanentDeleteRecordFromDatabase('purchases', id);
    }
    return {
      success: true,
      message: `Supplier Purchase ${purchase.billNumber} has been permanently deleted.`
    };
  };

  const softDeleteSupplierPayment = (id: string, _passwordInput?: string): { success: boolean; message: string } => {
    const sp = supplierPayments.find(p => p.id === id);
    if (!sp) return { success: false, message: 'Supplier payment not found.' };

    // Reverse payment from purchase bill
    setPurchases(prev => prev.map(pb => {
      if (pb.id !== sp.purchaseBillId) return pb;
      const newPaid = Math.max(0, pb.amountPaid - sp.amountPaid);
      const newOutstanding = Math.max(0, pb.grandTotal - newPaid);
      const newStatus = calculatePaymentStatus(pb.grandTotal, newPaid);
      return { ...pb, amountPaid: newPaid, outstandingAmount: newOutstanding, status: newStatus };
    }));

    setSupplierPayments(prev => prev.map(p => p.id === id ? {
      ...p,
      isDeleted: true,
      deletedAt: new Date().toISOString(),
      deletedBy: 'Factory Admin'
    } : p));

    if (isDatabaseConnected()) {
      softDeleteRecordInSupabase('supplier_payments', id);
    }

    return { success: true, message: `Supplier Payment ${sp.receiptNumber} soft-deleted. Moved to Recently Deleted.` };
  };

  const restoreSupplierPayment = (id: string, _passwordInput?: string): { success: boolean; message: string } => {
    const sp = supplierPayments.find(p => p.id === id);
    if (!sp) return { success: false, message: 'Supplier payment not found.' };

    // Re-apply payment to purchase bill
    setPurchases(prev => prev.map(pb => {
      if (pb.id !== sp.purchaseBillId) return pb;
      const newPaid = pb.amountPaid + sp.amountPaid;
      const newOutstanding = Math.max(0, pb.grandTotal - newPaid);
      const newStatus = calculatePaymentStatus(pb.grandTotal, newPaid);
      return { ...pb, amountPaid: newPaid, outstandingAmount: newOutstanding, status: newStatus };
    }));

    setSupplierPayments(prev => prev.map(p => p.id === id ? {
      ...p,
      isDeleted: false,
      deletedAt: undefined,
      deletedBy: undefined
    } : p));

    if (isDatabaseConnected()) {
      restoreRecordInSupabase('supplier_payments', id);
    }

    return { success: true, message: `Supplier Payment ${sp.receiptNumber} restored successfully.` };
  };

  const permanentDeleteSupplierPayment = (id: string, _passwordInput?: string): { success: boolean; message: string } => {
    const sp = supplierPayments.find(p => p.id === id);
    if (!sp) return { success: false, message: 'Supplier payment not found.' };

    setSupplierPayments(prev => prev.filter(p => p.id !== id));
    if (isDatabaseConnected()) {
      permanentDeleteRecordFromDatabase('supplier_payments', id);
    }
    return { success: true, message: `Supplier Payment ${sp.receiptNumber} permanently deleted.` };
  };

  // Expenses logic
  const addExpense = (expenseData: Omit<Expense, 'id' | 'expenseNumber' | 'createdAt'>): Expense => {
    const expenseNumber = `EXP-${(expenses.length + 101).toString().padStart(3, '0')}`;
    const newExpense: Expense = {
      ...expenseData,
      id: `exp-${Date.now()}`,
      expenseNumber,
      proofStatus: expenseData.proofStatus || (expenseData.proofUrl ? 'Proof Attached' : 'Not Required'),
      createdAt: new Date().toISOString()
    };

    setExpenses(prev => [newExpense, ...prev]);
    if (isDatabaseConnected()) {
      saveExpenseToSupabase(newExpense);
    }
    return newExpense;
  };

  const updateExpense = (id: string, updates: Partial<Expense>): { success: boolean; message: string } => {
    const expense = expenses.find(e => e.id === id);
    if (!expense) return { success: false, message: 'Expense record not found.' };

    const updated = { ...expense, ...updates };
    setExpenses(prev => prev.map(e => e.id === id ? updated : e));
    if (isDatabaseConnected()) {
      saveExpenseToSupabase(updated);
    }
    return { success: true, message: `Expense voucher ${expense.expenseNumber} updated successfully.` };
  };

  const softDeleteExpense = (id: string, _passwordInput?: string): { success: boolean; message: string } => {
    const expense = expenses.find(e => e.id === id);
    if (!expense) return { success: false, message: 'Expense record not found.' };

    const deleted = {
      ...expense,
      isDeleted: true,
      deletedAt: new Date().toISOString(),
      deletedBy: 'Factory Admin'
    };
    setExpenses(prev => prev.map(e => e.id === id ? deleted : e));
    if (isDatabaseConnected()) {
      saveExpenseToSupabase(deleted);
    }

    return { success: true, message: `Expense Voucher ${expense.expenseNumber} soft-deleted. Moved to Recently Deleted.` };
  };

  const restoreExpense = (id: string, _passwordInput?: string): { success: boolean; message: string } => {
    const expense = expenses.find(e => e.id === id);
    if (!expense) return { success: false, message: 'Expense record not found.' };

    setExpenses(prev => prev.map(e => e.id === id ? {
      ...e,
      isDeleted: false,
      deletedAt: undefined,
      deletedBy: undefined
    } : e));

    if (isDatabaseConnected()) {
      saveExpenseToSupabase({
        ...expense,
        isDeleted: false,
        deletedAt: undefined,
        deletedBy: undefined
      });
    }

    return { success: true, message: `Expense Voucher ${expense.expenseNumber} restored successfully.` };
  };

  const permanentDeleteExpense = (id: string, _passwordInput?: string): { success: boolean; message: string } => {
    const expense = expenses.find(e => e.id === id);
    if (!expense) return { success: false, message: 'Expense record not found.' };

    setExpenses(prev => prev.filter(e => e.id !== id));
    if (isDatabaseConnected()) {
      permanentDeleteRecordFromDatabase('expenses', id);
    }
    return { success: true, message: `Expense Voucher ${expense.expenseNumber} permanently deleted.` };
  };

  // Centralized Recently Deleted Aggregation
  const recentlyDeleted: import('../types').RecentlyDeletedItem[] = [
    ...salesBills.filter(b => b.isDeleted).map(b => ({
      id: b.id,
      recordType: 'Sales Bill' as const,
      referenceNumber: b.billNumber,
      title: `Sales Bill — ${b.items.length} product item(s)`,
      partyName: b.partyName,
      amount: b.grandTotal,
      deletedAt: b.deletedAt || new Date().toISOString(),
      deletedBy: b.deletedBy || 'Factory Admin',
      originalRecord: b
    })),
    ...paymentsReceived.filter(p => p.isDeleted).map(p => ({
      id: p.id,
      recordType: 'Payment Received' as const,
      referenceNumber: p.receiptNumber,
      title: `Payment Receipt (${p.paymentMethod})`,
      partyName: p.partyName,
      amount: p.amountReceived,
      deletedAt: p.deletedAt || new Date().toISOString(),
      deletedBy: p.deletedBy || 'Factory Admin',
      originalRecord: p
    })),
    ...purchases.filter(pb => pb.isDeleted).map(pb => ({
      id: pb.id,
      recordType: 'Purchase Bill' as const,
      referenceNumber: pb.billNumber,
      title: `Supplier Purchase Bill — ${pb.items.length} item(s)`,
      partyName: pb.supplierName,
      amount: pb.grandTotal,
      deletedAt: pb.deletedAt || new Date().toISOString(),
      deletedBy: pb.deletedBy || 'Factory Admin',
      originalRecord: pb
    })),
    ...supplierPayments.filter(sp => sp.isDeleted).map(sp => ({
      id: sp.id,
      recordType: 'Supplier Payment' as const,
      referenceNumber: sp.receiptNumber,
      title: `Supplier Payment Against ${sp.purchaseBillNumber}`,
      partyName: sp.supplierName,
      amount: sp.amountPaid,
      deletedAt: sp.deletedAt || new Date().toISOString(),
      deletedBy: sp.deletedBy || 'Factory Admin',
      originalRecord: sp
    })),
    ...expenses.filter(e => e.isDeleted).map(e => ({
      id: e.id,
      recordType: 'Expense' as const,
      referenceNumber: e.expenseNumber,
      title: `${e.category}: ${e.title}`,
      partyName: e.paidTo,
      amount: e.amount,
      deletedAt: e.deletedAt || new Date().toISOString(),
      deletedBy: e.deletedBy || 'Factory Admin',
      originalRecord: e
    })),
    ...parties.filter(p => p.isDeleted).map(p => ({
      id: p.id,
      recordType: 'Contact Party' as const,
      referenceNumber: p.id,
      title: `${p.type}: ${p.name} ${p.companyName ? `(${p.companyName})` : ''}`,
      partyName: p.name,
      amount: undefined,
      deletedAt: p.deletedAt || new Date().toISOString(),
      deletedBy: p.deletedBy || 'Factory Admin',
      originalRecord: p
    })),
    ...scheduleItems.filter(s => s.isDeleted).map(s => ({
      id: s.id,
      recordType: 'Payment Schedule' as const,
      referenceNumber: s.id,
      title: `${s.type === 'ToReceive' ? 'Receivable Reminder' : 'Payable Reminder'} — Due: ${s.dueDate}`,
      partyName: s.partyName,
      amount: s.scheduledAmount,
      deletedAt: s.deletedAt || new Date().toISOString(),
      deletedBy: s.deletedBy || 'Factory Admin',
      originalRecord: s
    }))
  ].sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());

  const totalRecentlyDeletedCount = recentlyDeleted.length;

  return (
    <AppContext.Provider value={{
      factories,
      branches: factories,
      selectedFactoryId,
      selectedBranchId: selectedFactoryId,
      setSelectedFactoryId,
      setSelectedBranchId: setSelectedFactoryId,
      addFactory,
      updateFactory,
      toggleFactoryStatus,
      getFactoryName,
      addBranch,

      darkMode,
      setDarkMode,
      toggleDarkMode,

      notifications,
      markNotificationRead,
      deleteNotification,
      clearAllNotifications,

      parties,
      addParty,
      updateParty,
      softDeleteParty,
      restoreParty,
      permanentDeleteParty,

      products,
      addProduct,
      updateProduct,

      salesBills,
      addSalesBill,
      updateSalesBill,
      softDeleteSalesBill,
      restoreSalesBill,
      permanentDeleteSalesBill,

      paymentsReceived,
      recordPayment,
      updatePaymentReceived,
      softDeletePaymentReceived,
      restorePaymentReceived,
      permanentDeletePaymentReceived,
      completePayment,

      scheduleItems,
      addScheduleItem,
      addScheduleWithInstallments,
      updateScheduleStatus,
      updateScheduleItem,
      createAdditionalSchedule,
      softDeleteScheduleItem,
      restoreScheduleItem,
      permanentDeleteScheduleItem,

      purchases,
      supplierPayments,
      addPurchase,
      updatePurchase,
      softDeletePurchase,
      restorePurchase,
      permanentDeletePurchase,
      recordSupplierPayment,
      softDeleteSupplierPayment,
      restoreSupplierPayment,
      permanentDeleteSupplierPayment,

      expenses,
      addExpense,
      updateExpense,
      softDeleteExpense,
      restoreExpense,
      permanentDeleteExpense,

      recentlyDeleted,
      totalRecentlyDeletedCount,

      businessName,
      setBusinessName,
      companyProfile,
      updateCompanyProfile,

      refreshData: () => syncWithDatabase(false),
      isSyncing
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
