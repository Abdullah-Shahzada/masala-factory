import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { SalesBill, BillItem, BranchId, PaymentStatus } from '../types';
import { formatPKR, formatDate } from '../utils/formatters';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { CurrencyInput } from '../components/common/CurrencyInput';
import { InlineContactModal } from '../components/common/InlineContactModal';
import { InlineProductModal } from '../components/common/InlineProductModal';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { ProofViewerModal } from '../components/common/ProofViewerModal';
import { ProofBadge } from '../components/common/ProofBadge';
import { FileUpload } from '../components/common/FileUpload';
import { WhatsAppShareModal } from '../components/common/WhatsAppShareModal';
import { formatSalesBillWAMessage } from '../utils/whatsappHelper';
import { 
  Plus, 
  Trash2, 
  Search, 
  Filter, 
  Receipt, 
  Printer, 
  Eye, 
  FileText,
  AlertCircle,
  Building2,
  Phone,
  Image as ImageIcon,
  UserPlus,
  RotateCcw,
  ShieldAlert,
  X,
  Calendar,
  DollarSign,
  CheckCircle2,
  MessageSquare,
  Download,
  Share2,
  ArrowUpDown,
  Pencil
} from 'lucide-react';
import { PartyCombobox } from '../components/common/PartyCombobox';
import { ProductCombobox } from '../components/common/ProductCombobox';
import { Pagination } from '../components/common/Pagination';
import { generateSalesBillPDF, shareOrDownloadPDF, printDocument } from '../utils/pdfGenerator';

export const SalesBills: React.FC = () => {
  const { 
    salesBills, 
    addSalesBill, 
    updateSalesBill,
    softDeleteSalesBill,
    restoreSalesBill,
    parties, 
    products, 
    branches, 
    selectedBranchId, 
    companyProfile
  } = useApp();

  // Tab State: Active Bills vs Recently Deleted
  const [activeTab, setActiveTab] = useState<'active' | 'deleted'>('active');
  const [editingBill, setEditingBill] = useState<SalesBill | null>(null);

  // Sorting & Pagination State
  const [dateSortOrder, setDateSortOrder] = useState<'desc' | 'asc'>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Advanced Filters State
  const [showFilters, setShowFilters] = useState(false);
  const [billNoQuery, setBillNoQuery] = useState('');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [productFilter, setProductFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minAmount, setMinAmount] = useState<number>(0);
  const [maxAmount, setMaxAmount] = useState<number>(0);

  // Modals State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBillForDetails, setSelectedBillForDetails] = useState<SalesBill | null>(null);
  const [proofModal, setProofModal] = useState<{ isOpen: boolean; url?: string; docNo?: string }>({ isOpen: false });

  // Inline Creation Modals
  const [inlineContactOpen, setInlineContactOpen] = useState(false);
  const [inlineProductOpen, setInlineProductOpen] = useState<{ isOpen: boolean; itemIndex: number }>({ isOpen: false, itemIndex: 0 });

  // Password Deletion & Recovery Confirmation Modal
  const [passwordModal, setPasswordModal] = useState<{
    isOpen: boolean;
    bill: SalesBill | null;
    action: 'delete' | 'restore';
  }>({ isOpen: false, bill: null, action: 'delete' });

  // Notification / Alert Banner Feedback
  const [actionFeedback, setActionFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  // WhatsApp Share State
  const [waModal, setWaModal] = useState<{
    isOpen: boolean;
    phone: string;
    partyName: string;
    message: string;
    docTitle: string;
    bill: SalesBill | null;
  }>({
    isOpen: false,
    phone: '',
    partyName: '',
    message: '',
    docTitle: '',
    bill: null
  });

  // Bill Creation Form State
  const [partyId, setPartyId] = useState<string>('');
  const [billNumber, setBillNumber] = useState<string>('');
  const [billDate, setBillDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [billTime, setBillTime] = useState<string>(() => new Date().toTimeString().slice(0, 5));
  const [branchId, setBranchId] = useState<BranchId>(
    selectedBranchId !== 'all' ? (selectedBranchId as BranchId) : 'b1'
  );
  const [receivedAmount, setReceivedAmount] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [proofUrl, setProofUrl] = useState<string>('');
  const [proofStatus, setProofStatus] = useState<import('../types').ProofStatus>('Not Required');

  const [items, setItems] = useState<Omit<BillItem, 'id'>[]>([
    {
      productId: products[0]?.id || 'prod-01',
      productName: products[0]?.name || 'Special Chicken Masala',
      quantity: 10,
      unit: products[0]?.unit || '1kg Pack',
      rate: products[0]?.defaultRate || 1250,
      lineTotal: 12500
    }
  ]);

  const [formError, setFormError] = useState<string>('');

  // Auto-calculate grand total
  const grandTotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const remainingAmount = Math.max(0, grandTotal - receivedAmount);

  // Reset all filters
  const clearFilters = () => {
    setBillNoQuery('');
    setCustomerFilter('all');
    setProductFilter('all');
    setStatusFilter('all');
    setBranchFilter('all');
    setStartDate('');
    setEndDate('');
    setMinAmount(0);
    setMaxAmount(0);
  };

  const activeFiltersCount = [
    billNoQuery.trim() !== '',
    customerFilter !== 'all',
    productFilter !== 'all',
    statusFilter !== 'all',
    branchFilter !== 'all',
    startDate !== '',
    endDate !== '',
    minAmount > 0,
    maxAmount > 0
  ].filter(Boolean).length;

  // Line item handlers
  const handleProductChange = (index: number, prodId: string) => {
    if (prodId === 'ADD_NEW_PRODUCT') {
      setInlineProductOpen({ isOpen: true, itemIndex: index });
      return;
    }

    const prod = products.find(p => p.id === prodId);
    if (!prod) return;

    setItems(prev => prev.map((item, idx) => {
      if (idx !== index) return item;
      const lineTotal = item.quantity * prod.defaultRate;
      return {
        ...item,
        productId: prod.id,
        productName: prod.name,
        unit: prod.unit,
        rate: prod.defaultRate,
        lineTotal
      };
    }));
  };

  const handleQuantityRateChange = (index: number, field: 'quantity' | 'rate', value: number) => {
    setItems(prev => prev.map((item, idx) => {
      if (idx !== index) return item;
      const qty = field === 'quantity' ? Math.max(0, value) : item.quantity;
      const rate = field === 'rate' ? Math.max(0, value) : item.rate;
      const lineTotal = qty * rate;
      return { ...item, quantity: qty, rate, lineTotal };
    }));
  };

  const addItemRow = () => {
    const defaultProd = products[0];
    setItems(prev => [
      ...prev,
      {
        productId: defaultProd?.id || 'prod-01',
        productName: defaultProd?.name || 'Special Chicken Masala',
        quantity: 1,
        unit: defaultProd?.unit || '1kg Pack',
        rate: defaultProd?.defaultRate || 1250,
        lineTotal: defaultProd?.defaultRate || 1250
      }
    ]);
  };

  const removeItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const openAddModal = () => {
    resetForm();
    setEditingBill(null);
    setIsModalOpen(true);
  };

  const openEditModal = (bill: SalesBill) => {
    setEditingBill(bill);
    setPartyId(bill.partyId);
    setBillNumber(bill.billNumber);
    setBillDate(bill.billDate);
    setBillTime(bill.billTime || (bill.createdAt?.includes('T') ? bill.createdAt.slice(11, 16) : new Date().toTimeString().slice(0, 5)));
    setBranchId(bill.branchId);
    setReceivedAmount(bill.receivedAmount);
    setProofUrl(bill.proofUrl || '');
    setProofStatus(bill.proofStatus || (bill.proofUrl ? 'Proof Attached' : 'Not Required'));
    setNotes(bill.notes || '');
    setItems(bill.items.map(i => ({
      productId: i.productId,
      productName: i.productName,
      quantity: i.quantity,
      unit: i.unit,
      rate: i.rate,
      lineTotal: i.lineTotal
    })));
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!partyId) {
      setFormError('Please select or create a customer party.');
      return;
    }
    if (!billNumber.trim()) {
      setFormError('Manual Bill Number is required (e.g. B-1547).');
      return;
    }
    if (items.length === 0 || grandTotal <= 0) {
      setFormError('Please add at least one valid product line item with non-zero total.');
      return;
    }

    if (editingBill) {
      // Check duplicate bill number if changed
      if (editingBill.billNumber.trim().toLowerCase() !== billNumber.trim().toLowerCase()) {
        const existingBill = salesBills.find(b => 
          !b.isDeleted && b.id !== editingBill.id && b.billNumber.trim().toLowerCase() === billNumber.trim().toLowerCase()
        );
        if (existingBill) {
          setFormError(`A sales bill with Bill Number "${billNumber.trim()}" already exists. Manual bill numbers must be unique.`);
          return;
        }
      }

      const party = parties.find(p => p.id === partyId);
      const branch = branches.find(b => b.id === branchId);

      const res = updateSalesBill(editingBill.id, {
        billNumber: billNumber.trim(),
        partyId,
        partyName: party ? party.name : editingBill.partyName,
        partyPhone: party ? party.phone : editingBill.partyPhone,
        billDate,
        billTime: billTime || undefined,
        branchId,
        branchName: branch ? branch.name : editingBill.branchName,
        items: items.map((i, idx) => ({ ...i, id: `bi-${Date.now()}-${idx}` })),
        receivedAmount,
        proofUrl: proofUrl.trim() || undefined,
        proofStatus: proofStatus || (proofUrl ? 'Proof Attached' : 'Not Required'),
        notes: notes.trim() || undefined
      });

      if (res.success) {
        setIsModalOpen(false);
        setEditingBill(null);
        resetForm();
        setActionFeedback({
          type: 'success',
          message: res.message
        });
      } else {
        setFormError(res.message);
      }
      return;
    }

    // Check duplicate bill number among active bills
    const existingBill = salesBills.find(b => 
      !b.isDeleted && b.billNumber.trim().toLowerCase() === billNumber.trim().toLowerCase()
    );
    if (existingBill) {
      setFormError(`A sales bill with Bill Number "${billNumber.trim()}" already exists. Manual bill numbers must be unique.`);
      return;
    }

    const party = parties.find(p => p.id === partyId);
    const branch = branches.find(b => b.id === branchId);

    addSalesBill({
      billNumber: billNumber.trim(),
      partyId,
      partyName: party ? party.name : 'Unknown Party',
      partyPhone: party ? party.phone : '',
      billDate,
      billTime: billTime || undefined,
      branchId,
      branchName: branch ? branch.name : 'Main Factory',
      items: items.map((i, idx) => ({ ...i, id: `bi-${Date.now()}-${idx}` })),
      grandTotal,
      receivedAmount,
      proofUrl: proofUrl.trim() || undefined,
      proofStatus: proofStatus || (proofUrl ? 'Proof Attached' : 'Not Required'),
      notes: notes.trim() || undefined
    });

    setIsModalOpen(false);
    resetForm();
    setActionFeedback({
      type: 'success',
      message: `Sales Bill ${billNumber.trim()} successfully recorded.`
    });
  };

  const resetForm = () => {
    setBillNumber('');
    setBillTime(new Date().toTimeString().slice(0, 5));
    setReceivedAmount(0);
    setNotes('');
    setProofUrl('');
    setProofStatus('Not Required');
    setFormError('');
    setItems([
      {
        productId: products[0]?.id || 'prod-01',
        productName: products[0]?.name || 'Special Chicken Masala',
        quantity: 10,
        unit: products[0]?.unit || '1kg Pack',
        rate: products[0]?.defaultRate || 1250,
        lineTotal: 12500
      }
    ]);
  };

  // Safe Deletion Handlers
  const handleInitiateDelete = (bill: SalesBill) => {
    setActionFeedback(null);
    // Financial integrity guard: if bill has payments received, block deletion
    if (bill.receivedAmount > 0) {
      setActionFeedback({
        type: 'error',
        message: `Deletion Blocked: Sales Bill ${bill.billNumber} has recorded payments of ${formatPKR(bill.receivedAmount)}. To protect financial and audit integrity, bills with recorded payments cannot be deleted.`
      });
      return;
    }

    setPasswordModal({
      isOpen: true,
      bill,
      action: 'delete'
    });
  };

  const handleInitiateRestore = (bill: SalesBill) => {
    setActionFeedback(null);
    setPasswordModal({
      isOpen: true,
      bill,
      action: 'restore'
    });
  };

  const handleConfirmAction = () => {
    if (!passwordModal.bill) return;

    if (passwordModal.action === 'delete') {
      const res = softDeleteSalesBill(passwordModal.bill.id);
      if (res.success) {
        setActionFeedback({ type: 'success', message: res.message });
        setPasswordModal({ isOpen: false, bill: null, action: 'delete' });
        if (selectedBillForDetails?.id === passwordModal.bill.id) {
          setSelectedBillForDetails(null);
        }
      } else {
        setActionFeedback({ type: 'error', message: res.message });
      }
    } else {
      const res = restoreSalesBill(passwordModal.bill.id);
      if (res.success) {
        setActionFeedback({ type: 'success', message: res.message });
        setPasswordModal({ isOpen: false, bill: null, action: 'restore' });
      } else {
        setActionFeedback({ type: 'error', message: res.message });
      }
    }
  };

  // Filter bills list with multi-criteria support
  const applyFilters = (billList: SalesBill[]) => {
    return billList.filter(bill => {
      // Global branch filter
      if (selectedBranchId !== 'all' && bill.branchId !== selectedBranchId) return false;
      // In-page branch filter
      if (branchFilter !== 'all' && bill.branchId !== branchFilter) return false;
      // Status filter
      if (statusFilter !== 'all' && bill.status !== statusFilter) return false;
      // Customer filter
      if (customerFilter !== 'all' && bill.partyId !== customerFilter) return false;
      // Product filter
      if (productFilter !== 'all' && !bill.items.some(i => i.productId === productFilter)) return false;
      // Bill number search
      if (billNoQuery.trim()) {
        const q = billNoQuery.toLowerCase().trim();
        if (!bill.billNumber.toLowerCase().includes(q)) return false;
      }
      // Date range filters (inclusive)
      if (startDate && bill.billDate < startDate) return false;
      if (endDate && bill.billDate > endDate) return false;
      // Amount range (numerical comparison)
      if (minAmount > 0 && bill.grandTotal < minAmount) return false;
      if (maxAmount > 0 && bill.grandTotal > maxAmount) return false;
      return true;
    });
  };

  const activeBills = salesBills.filter(b => !b.isDeleted);
  const deletedBills = salesBills.filter(b => b.isDeleted === true);

  const filteredActiveBills = applyFilters(activeBills);
  const filteredDeletedBills = applyFilters(deletedBills);

  const displayList = activeTab === 'active' ? filteredActiveBills : filteredDeletedBills;

  // Date Sorting
  const sortedBills = [...displayList].sort((a, b) => {
    const timeA = new Date(a.billDate).getTime();
    const timeB = new Date(b.billDate).getTime();
    return dateSortOrder === 'desc' ? timeB - timeA : timeA - timeB;
  });

  const totalRecords = sortedBills.length;
  const paginatedBills = sortedBills.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // PDF Generation & Download / Share Handlers
  const handleDownloadPDF = (bill: SalesBill) => {
    const doc = generateSalesBillPDF(bill, companyProfile);
    doc.save(`Sales-Bill-${bill.billNumber}.pdf`);
  };

  const handleOpenWhatsApp = (bill: SalesBill) => {
    const msg = formatSalesBillWAMessage({
      customerName: bill.partyName,
      billNumber: bill.billNumber,
      date: bill.billDate,
      itemsCount: bill.items.length,
      grandTotal: bill.grandTotal,
      receivedAmount: bill.receivedAmount,
      remainingAmount: bill.remainingAmount,
      branchName: bill.branchName
    });
    setWaModal({
      isOpen: true,
      phone: bill.partyPhone || '',
      partyName: bill.partyName,
      message: `${msg}\n\n*Note:* Official PDF Invoice has been downloaded to your device and can be attached to this chat.`,
      docTitle: `Bill ${bill.billNumber}`,
      bill
    });
  };

  const printBillInvoice = handleDownloadPDF;

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Receipt className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            Sales & Customer Bills
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Record customer sales bills, calculate line item totals, track partial payments, filter records, and recover deleted bills safely.
          </p>
        </div>

        <button
          onClick={() => {
            if (selectedBranchId !== 'all') {
              setBranchId(selectedBranchId as BranchId);
            }
            openAddModal();
          }}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md shadow-emerald-950/20 flex items-center gap-2 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create New Sales Bill
        </button>
      </div>

      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div className={`p-4 rounded-xl text-xs flex items-center justify-between gap-3 animate-in fade-in ${
          actionFeedback.type === 'error'
            ? 'bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/50 dark:border-rose-800 dark:text-rose-300'
            : 'bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-300'
        }`}>
          <div className="flex items-center gap-2.5">
            {actionFeedback.type === 'error' ? (
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <span>{actionFeedback.message}</span>
          </div>
          <button 
            onClick={() => setActionFeedback(null)}
            className="p-1 hover:bg-black/5 rounded-lg"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Tabs: Active Bills vs Recently Deleted */}
      <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('active')}
          className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'active'
              ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <Receipt className="w-4 h-4" />
          Active Sales Bills ({activeBills.length})
        </button>
        <button
          onClick={() => setActiveTab('deleted')}
          className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'deleted'
              ? 'border-rose-600 text-rose-600 dark:border-rose-400 dark:text-rose-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <Trash2 className="w-4 h-4" />
          Recently Deleted ({deletedBills.length})
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Quick Status Pills */}
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
            <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Status:
            </span>
            {['all', 'Paid', 'Partially Paid', 'Unpaid'].map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  statusFilter === st 
                    ? 'bg-slate-900 text-white dark:bg-emerald-600 dark:text-white shadow-sm' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {st === 'all' ? 'All' : st}
              </button>
            ))}
          </div>

          {/* Action buttons: Advanced Filters Toggle & Clear */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button
              onClick={() => setShowFilters(prev => !prev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
                showFilters || activeFiltersCount > 0
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/60 dark:border-emerald-700 dark:text-emerald-300'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              Advanced Filters
              {activeFiltersCount > 0 && (
                <span className="px-1.5 py-0.2 bg-emerald-600 text-white rounded-full text-[10px]">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {activeFiltersCount > 0 && (
              <button
                onClick={clearFilters}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              >
                Clear Filters
              </button>
            )}

            <div className="text-xs text-slate-500 font-medium ml-2">
              Showing <span className="font-bold text-slate-900 dark:text-white">{displayList.length}</span> {activeTab === 'active' ? 'Bills' : 'Deleted'}
            </div>
          </div>
        </div>

        {/* Collapsible Advanced Filters Drawer */}
        {showFilters && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs animate-in fade-in">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Manual Bill No
              </label>
              <input
                type="text"
                placeholder="e.g. B-1547"
                value={billNoQuery}
                onChange={(e) => setBillNoQuery(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Customer Party
              </label>
              <select
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="all">All Customers</option>
                {parties.filter(p => p.type === 'Customer' || p.type === 'Both').map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Filter by Product
              </label>
              <select
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="all">All Products</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Factory Branch
              </label>
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="all">All Branches</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Bill Date From
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Bill Date To
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Min Amount (PKR)
              </label>
              <CurrencyInput
                value={minAmount}
                onChange={setMinAmount}
                placeholder="Min Rs."
                prefix="Rs."
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Max Amount (PKR)
              </label>
              <CurrencyInput
                value={maxAmount}
                onChange={setMaxAmount}
                placeholder="Max Rs."
                prefix="Rs."
              />
            </div>
          </div>
        )}
      </div>

      {/* Table Section */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden space-y-3">
        {/* Table Top Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
          <div className="text-slate-500 font-medium">
            Showing <span className="font-semibold text-slate-800 dark:text-slate-200">{activeTab === 'active' ? 'Active Sales Bills' : 'Recently Deleted Bills'}</span> ({totalRecords} records found)
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDateSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-xs"
              title="Toggle Date Sort Order"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Date: {dateSortOrder === 'desc' ? 'Newest First' : 'Oldest First'}</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-2.5">Bill No</th>
                <th className="p-2.5">Customer Party</th>
                <th className="p-2.5">Date</th>
                <th className="p-2.5">Branch</th>
                <th className="p-2.5">Items Summary</th>
                <th className="p-2.5 text-right">Grand Total</th>
                {activeTab === 'active' ? (
                  <>
                    <th className="p-2.5 text-right">Received</th>
                    <th className="p-2.5 text-right">Remaining</th>
                    <th className="p-2.5 text-center">Status</th>
                    <th className="p-2.5">Proof</th>
                  </>
                ) : (
                  <>
                    <th className="p-2.5">Deleted Date</th>
                    <th className="p-2.5">Deleted By</th>
                  </>
                )}
                <th className="p-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedBills.length > 0 ? (
                paginatedBills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-2.5 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      {bill.billNumber}
                    </td>
                    <td className="p-2.5 font-medium text-slate-900 dark:text-white">
                      <div className="truncate max-w-[140px] font-semibold">{bill.partyName}</div>
                      <span className="block text-[10px] text-slate-400 font-mono">{bill.partyPhone}</span>
                    </td>
                    <td className="p-2.5 text-slate-500 whitespace-nowrap">
                      {formatDate(bill.billDate)}
                    </td>
                    <td className="p-2.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {bill.branchId === 'b1' ? 'Lahore' : 'Karachi'}
                    </td>
                    <td className="p-2.5 max-w-[180px] truncate text-slate-600 dark:text-slate-300">
                      {bill.items.map(i => `${i.productName} (x${i.quantity})`).join(', ')}
                    </td>
                    <td className="p-2.5 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {formatPKR(bill.grandTotal)}
                    </td>

                    {activeTab === 'active' ? (
                      <>
                        <td className="p-2.5 text-right font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          {formatPKR(bill.receivedAmount)}
                        </td>
                        <td className="p-2.5 text-right font-semibold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                          {formatPKR(bill.remainingAmount)}
                        </td>
                        <td className="p-2.5 text-center">
                          <StatusBadge status={bill.status} size="sm" />
                        </td>
                        <td className="p-2.5">
                          <ProofBadge
                            status={bill.proofStatus}
                            proofUrl={bill.proofUrl}
                            onClick={bill.proofUrl ? () => setProofModal({ isOpen: true, url: bill.proofUrl, docNo: bill.billNumber }) : undefined}
                          />
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-2.5 text-slate-500 whitespace-nowrap">
                          {bill.deletedAt ? formatDate(bill.deletedAt.split('T')[0]) : '-'}
                        </td>
                        <td className="p-2.5 text-slate-500 whitespace-nowrap">
                          {bill.deletedBy || 'Admin'}
                        </td>
                      </>
                    )}

                    <td className="p-2.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        {activeTab === 'active' ? (
                          <>
                            <button
                              onClick={() => setSelectedBillForDetails(bill)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
                              title="View Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openEditModal(bill)}
                              className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/60 transition-colors"
                              title="Edit Sales Bill"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDownloadPDF(bill)}
                              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition-colors"
                              title="Generate / Download PDF Invoice"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenWhatsApp(bill)}
                              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition-colors"
                              title="Message on WhatsApp"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>
                            {bill.proofUrl && (
                              <button
                                onClick={() => setProofModal({ isOpen: true, url: bill.proofUrl, docNo: bill.billNumber })}
                                className="p-1.5 rounded-lg text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/50 transition-colors"
                                title="View Attached Proof"
                              >
                                <ImageIcon className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => handleInitiateDelete(bill)}
                              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                              title="Delete Sales Bill"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleInitiateRestore(bill)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 hover:bg-emerald-100 font-semibold flex items-center gap-1"
                            title="Restore Sales Bill"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Restore
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    {activeTab === 'active' 
                      ? 'No active sales bills match the specified filter criteria.' 
                      : 'No recently deleted sales bills.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <Pagination
          currentPage={currentPage}
          totalRecords={totalRecords}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* CREATE / EDIT SALES BILL MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingBill(null);
        }}
        title={editingBill ? `Edit Sales Bill ${editingBill.billNumber}` : "Record New Customer Sales Bill"}
        subtitle={editingBill ? "Editing customer bill details, items and partial payments" : "Manual Bill Number entry with dynamic spice product line items"}
        maxWidth="4xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {formError}
            </div>
          )}

          {/* Top Form Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Customer / Party *
              </label>
              <PartyCombobox
                parties={parties}
                selectedPartyId={partyId}
                onSelect={(p) => setPartyId(p.id)}
                onClear={() => setPartyId('')}
                filterType="Customer"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Manual Bill Number *
              </label>
              <input
                type="text"
                placeholder="e.g. B-1547"
                value={billNumber}
                onChange={(e) => setBillNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white"
                required
              />
              <span className="text-[10px] text-slate-400 block mt-0.5">Must be entered manually</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Bill Date *
                </label>
                <input
                  type="date"
                  value={billDate}
                  onChange={(e) => setBillDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Bill Time
                </label>
                <input
                  type="time"
                  value={billTime}
                  onChange={(e) => setBillTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Factory Branch *
              </label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value as BranchId)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              >
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Dynamic Product Line Items Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Product Line Items
              </h4>
              <button
                type="button"
                onClick={addItemRow}
                className="px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-xs font-semibold hover:bg-emerald-100 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Product Row
              </button>
            </div>

            <div className="space-y-2">
              {items.map((item, index) => (
                <div 
                  key={index}
                  className="grid grid-cols-12 gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 items-center text-xs"
                >
                  <div className="col-span-4">
                    <label className="block text-[10px] text-slate-400 mb-0.5">Product Item</label>
                    <ProductCombobox
                      products={products}
                      selectedProductId={item.productId}
                      onSelect={(prod) => {
                        handleProductChange(index, prod.id);
                      }}
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[10px] text-slate-400 mb-0.5">Quantity</label>
                    <input
                      type="number"
                      step="any"
                      min="0.1"
                      value={item.quantity}
                      onChange={(e) => handleQuantityRateChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-mono"
                    />
                  </div>

                  <div className="col-span-3">
                    <label className="block text-[10px] text-slate-400 mb-0.5">Unit Rate (PKR)</label>
                    <CurrencyInput
                      value={item.rate}
                      onChange={(val) => handleQuantityRateChange(index, 'rate', val)}
                      placeholder="Rate"
                      prefix="Rs."
                    />
                  </div>

                  <div className="col-span-2 text-right">
                    <label className="block text-[10px] text-slate-400 mb-0.5">Line Total</label>
                    <span className="font-bold text-slate-900 dark:text-white text-xs block truncate">
                      {formatPKR(item.lineTotal)}
                    </span>
                  </div>

                  <div className="col-span-1 text-right">
                    <button
                      type="button"
                      onClick={() => removeItemRow(index)}
                      disabled={items.length <= 1}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Totals & Payment Row */}
          <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/60 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Initial Payment Received (PKR)
              </label>
              <CurrencyInput
                value={receivedAmount}
                onChange={setReceivedAmount}
                max={grandTotal}
                prefix="Rs."
                placeholder="0"
              />
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-500 block">Calculated Grand Total</span>
              <span className="text-xl font-extrabold text-slate-900 dark:text-white">{formatPKR(grandTotal)}</span>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-500 block">Remaining Balance</span>
              <span className="text-xl font-extrabold text-rose-600 dark:text-rose-400">{formatPKR(remainingAmount)}</span>
            </div>
          </div>

          {/* Proof Upload & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FileUpload
              label="Sales Bill Photo / Delivery Order (Optional)"
              proofUrl={proofUrl}
              onProofChange={(url, status) => {
                setProofUrl(url);
                setProofStatus(status);
              }}
            />

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Notes & Terms
              </label>
              <input
                type="text"
                placeholder="e.g. 15 days credit, delivery via TCS"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex justify-end gap-3 border-t border-slate-200 dark:border-slate-800 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                setEditingBill(null);
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-colors"
            >
              {editingBill ? 'Update Sales Bill' : 'Save Sales Bill'}
            </button>
          </div>
        </form>
      </Modal>

      {/* BILL DETAILS DRAWER MODAL */}
      {selectedBillForDetails && (
        <Modal
          isOpen={!!selectedBillForDetails}
          onClose={() => setSelectedBillForDetails(null)}
          title={`Sales Bill ${selectedBillForDetails.billNumber}`}
          subtitle={`Recorded on ${formatDate(selectedBillForDetails.billDate)}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 flex justify-between items-center">
              <div>
                <span className="font-semibold text-slate-900 dark:text-white">{selectedBillForDetails.partyName}</span>
                <span className="block text-[10px] text-slate-400">{selectedBillForDetails.partyPhone}</span>
              </div>
              <StatusBadge status={selectedBillForDetails.status} />
            </div>

            <div className="border rounded-xl border-slate-200 dark:border-slate-800 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                  <tr>
                    <th className="p-2">Item</th>
                    <th className="p-2">Qty</th>
                    <th className="p-2">Rate</th>
                    <th className="p-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {selectedBillForDetails.items.map(i => (
                    <tr key={i.id}>
                      <td className="p-2">{i.productName}</td>
                      <td className="p-2">{i.quantity} {i.unit}</td>
                      <td className="p-2">{formatPKR(i.rate)}</td>
                      <td className="p-2 text-right font-semibold">{formatPKR(i.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-1.5 text-right font-medium">
              <div>Grand Total: <span className="font-bold text-slate-900 dark:text-white text-sm">{formatPKR(selectedBillForDetails.grandTotal)}</span></div>
              <div>Received: <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatPKR(selectedBillForDetails.receivedAmount)}</span></div>
              <div>Remaining Balance: <span className="font-bold text-rose-600 dark:text-rose-400">{formatPKR(selectedBillForDetails.remainingAmount)}</span></div>
            </div>

            {selectedBillForDetails.notes && (
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                <strong>Notes:</strong> {selectedBillForDetails.notes}
              </div>
            )}

            <div className="flex justify-between items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const bill = selectedBillForDetails;
                    setSelectedBillForDetails(null);
                    openEditModal(bill);
                  }}
                  className="px-3 py-2 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    const bill = selectedBillForDetails;
                    setSelectedBillForDetails(null);
                    handleInitiateDelete(bill);
                  }}
                  className="px-3 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const bill = selectedBillForDetails;
                    const msg = formatSalesBillWAMessage({
                      customerName: bill.partyName,
                      billNumber: bill.billNumber,
                      date: bill.billDate,
                      itemsCount: bill.items.length,
                      grandTotal: bill.grandTotal,
                      receivedAmount: bill.receivedAmount,
                      remainingAmount: bill.remainingAmount,
                      branchName: bill.branchName
                    });
                    setWaModal({
                      isOpen: true,
                      phone: bill.partyPhone || '',
                      partyName: bill.partyName,
                      message: msg,
                      docTitle: `Bill ${bill.billNumber}`,
                      bill
                    });
                  }}
                  className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  WhatsApp Share
                </button>
                <button
                  onClick={() => handleDownloadPDF(selectedBillForDetails)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl flex items-center gap-1.5 shadow-sm transition-colors text-xs"
                >
                  <Download className="w-4 h-4" />
                  Download PDF Invoice
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* PROOF VIEWER MODAL */}
      <ProofViewerModal
        isOpen={proofModal.isOpen}
        onClose={() => setProofModal({ isOpen: false })}
        title="Sales Bill Proof Attachment"
        proofUrl={proofModal.url}
        documentNumber={proofModal.docNo}
      />

      {/* WHATSAPP SHARE MODAL */}
      <WhatsAppShareModal
        isOpen={waModal.isOpen}
        onClose={() => setWaModal(prev => ({ ...prev, isOpen: false, bill: null }))}
        partyName={waModal.partyName}
        defaultPhone={waModal.phone}
        defaultMessage={waModal.message}
        documentTitle={waModal.docTitle}
        onDownloadPdf={() => waModal.bill && printBillInvoice(waModal.bill)}
      />

      {/* INLINE CONTACT CREATION MODAL */}
      <InlineContactModal
        isOpen={inlineContactOpen}
        onClose={() => setInlineContactOpen(false)}
        defaultType="Customer"
        onCreated={(newParty) => setPartyId(newParty.id)}
      />

      {/* INLINE PRODUCT CREATION MODAL */}
      <InlineProductModal
        isOpen={inlineProductOpen.isOpen}
        onClose={() => setInlineProductOpen({ isOpen: false, itemIndex: 0 })}
        onCreated={(newProd) => handleProductChange(inlineProductOpen.itemIndex, newProd.id)}
      />

      {/* CONFIRMATION MODAL FOR DELETION & RESTORATION */}
      <ConfirmModal
        isOpen={passwordModal.isOpen}
        onClose={() => setPasswordModal({ isOpen: false, bill: null, action: 'delete' })}
        onConfirm={handleConfirmAction}
        type={passwordModal.action === 'delete' ? 'delete' : 'restore'}
        title={passwordModal.action === 'delete' ? 'Delete Sales Bill' : 'Restore Sales Bill'}
        message={
          passwordModal.action === 'delete'
            ? 'Are you sure you want to delete this record?'
            : 'Are you sure you want to restore this record?'
        }
        confirmText={passwordModal.action === 'delete' ? 'Delete' : 'Restore'}
      />

    </div>
  );
};
