import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PurchaseBill, BillItem, BranchId, SupplierPayment, ProofStatus, PaymentMethod } from '../types';
import { formatPKR, formatDate } from '../utils/formatters';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { CurrencyInput } from '../components/common/CurrencyInput';
import { ProofViewerModal } from '../components/common/ProofViewerModal';
import { ProofBadge } from '../components/common/ProofBadge';
import { FileUpload } from '../components/common/FileUpload';
import { InlineProductModal } from '../components/common/InlineProductModal';
import { WhatsAppShareModal } from '../components/common/WhatsAppShareModal';
import { formatSupplierPaymentWAMessage, formatPurchaseBillWAMessage } from '../utils/whatsappHelper';
import { 
  ShoppingBag, 
  Plus, 
  Trash2, 
  Search, 
  Eye, 
  Filter,
  X,
  MessageSquare,
  CheckCircle2,
  Download,
  Share2,
  ArrowUpDown,
  Image as ImageIcon,
  AlertCircle,
  Pencil
} from 'lucide-react';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { PartyCombobox } from '../components/common/PartyCombobox';
import { Pagination } from '../components/common/Pagination';
import { generatePurchaseBillPDF, generateSupplierPaymentPDF } from '../utils/pdfGenerator';

export const Purchases: React.FC = () => {
  const { 
    purchases, 
    addPurchase, 
    updatePurchase,
    softDeletePurchase,
    recordSupplierPayment, 
    parties, 
    products, 
    branches, 
    selectedBranchId, 
    companyProfile 
  } = useApp();

  // Sorting & Pagination State
  const [dateSortOrder, setDateSortOrder] = useState<'desc' | 'asc'>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<PurchaseBill | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; purchase: PurchaseBill | null }>({ isOpen: false, purchase: null });
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [payModal, setPayModal] = useState<{ isOpen: boolean; purchase?: PurchaseBill }>({ isOpen: false });
  const [proofModal, setProofModal] = useState<{ isOpen: boolean; url?: string; docNo?: string }>({ isOpen: false });

  // Inline Product Creation Modal
  const [inlineProductOpen, setInlineProductOpen] = useState<{ isOpen: boolean; itemIndex: number }>({ isOpen: false, itemIndex: 0 });

  // Supplier Receipt Details Modal
  const [selectedReceipt, setSelectedReceipt] = useState<SupplierPayment | null>(null);

  // WhatsApp Share State
  const [waModal, setWaModal] = useState<{
    isOpen: boolean;
    phone: string;
    partyName: string;
    message: string;
    docTitle: string;
  }>({
    isOpen: false,
    phone: '',
    partyName: '',
    message: '',
    docTitle: ''
  });

  // Advanced Filters State
  const [showFilters, setShowFilters] = useState(false);
  const [billNoQuery, setBillNoQuery] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [productFilter, setProductFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minAmount, setMinAmount] = useState<number>(0);
  const [maxAmount, setMaxAmount] = useState<number>(0);

  // Form State
  const [supplierId, setSupplierId] = useState<string>('');
  const [billNumber, setBillNumber] = useState<string>('');
  const [billDate, setBillDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [billTime, setBillTime] = useState<string>(() => new Date().toTimeString().slice(0, 5));
  const [dueDate, setDueDate] = useState<string>(new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]);
  const [branchId, setBranchId] = useState<BranchId>(
    selectedBranchId !== 'all' ? (selectedBranchId as BranchId) : 'b1'
  );
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [proofUrl, setProofUrl] = useState<string>('');
  const [proofStatus, setProofStatus] = useState<ProofStatus>('Not Required');
  const [notes, setNotes] = useState<string>('');

  const [items, setItems] = useState<Omit<BillItem, 'id'>[]>([
    {
      productId: 'prod-06',
      productName: 'Crushed Red Chilli (Stemless)',
      quantity: 5,
      unit: '25kg Bag',
      rate: 18500,
      lineTotal: 92500
    }
  ]);

  // Pay Supplier Form State
  const [supplierPayAmount, setSupplierPayAmount] = useState<number>(0);
  const [supplierPayMethod, setSupplierPayMethod] = useState<PaymentMethod>('Bank Transfer');
  const [supplierPayDate, setSupplierPayDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [supplierPayTime, setSupplierPayTime] = useState<string>(() => new Date().toTimeString().slice(0, 5));
  const [supplierPayRef, setSupplierPayRef] = useState<string>('');
  const [supplierPayProofUrl, setSupplierPayProofUrl] = useState<string>('');
  const [supplierPayProofStatus, setSupplierPayProofStatus] = useState<ProofStatus>('Not Required');
  const [supplierPayNotes, setSupplierPayNotes] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const grandTotal = items.reduce((sum, item) => sum + item.lineTotal, 0);

  const clearFilters = () => {
    setBillNoQuery('');
    setSupplierFilter('all');
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
    supplierFilter !== 'all',
    productFilter !== 'all',
    statusFilter !== 'all',
    branchFilter !== 'all',
    startDate !== '',
    endDate !== '',
    minAmount > 0,
    maxAmount > 0
  ].filter(Boolean).length;

  const handleProductChange = (index: number, prodId: string) => {
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

  const handleQtyRateChange = (index: number, field: 'quantity' | 'rate', val: number) => {
    setItems(prev => prev.map((item, idx) => {
      if (idx !== index) return item;
      const qty = field === 'quantity' ? Math.max(0, val) : item.quantity;
      const rate = field === 'rate' ? Math.max(0, val) : item.rate;
      const lineTotal = qty * rate;
      return { ...item, quantity: qty, rate, lineTotal };
    }));
  };

  const addItemRow = () => {
    const defaultProd = products[0];
    setItems(prev => [
      ...prev,
      {
        productId: defaultProd?.id || 'prod-06',
        productName: defaultProd?.name || 'Crushed Red Chilli',
        quantity: 1,
        unit: defaultProd?.unit || '25kg Bag',
        rate: defaultProd?.defaultRate || 18500,
        lineTotal: defaultProd?.defaultRate || 18500
      }
    ]);
  };

  const removeItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const openAddModal = () => {
    resetForm();
    setEditingPurchase(null);
    setIsModalOpen(true);
  };

  const openEditModal = (pb: PurchaseBill) => {
    setEditingPurchase(pb);
    setSupplierId(pb.supplierId);
    setBillNumber(pb.billNumber);
    setBillDate(pb.billDate);
    setBillTime(pb.billTime || (pb.createdAt?.includes('T') ? pb.createdAt.slice(11, 16) : new Date().toTimeString().slice(0, 5)));
    setDueDate(pb.dueDate);
    setBranchId(pb.branchId);
    setAmountPaid(pb.amountPaid);
    setProofUrl(pb.proofUrl || '');
    setProofStatus(pb.proofStatus || (pb.proofUrl ? 'Proof Attached' : 'Not Required'));
    setNotes(pb.notes || '');
    setItems(pb.items.map(i => ({
      productId: i.productId,
      productName: i.productName,
      quantity: i.quantity,
      unit: i.unit,
      rate: i.rate,
      lineTotal: i.lineTotal
    })));
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!supplierId) {
      setErrorMsg('Please select a supplier party.');
      return;
    }
    if (!billNumber.trim()) {
      setErrorMsg('Manual Supplier Bill Number is required (e.g. SUP-882).');
      return;
    }

    for (const item of items) {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        setErrorMsg(`Item "${item.productName}": Quantity must be a whole integer (e.g. 1, 5, 10). Decimal quantity (${item.quantity}) is not permitted for supplier purchases.`);
        return;
      }
    }

    const supplier = parties.find(p => p.id === supplierId);

    if (editingPurchase) {
      const res = updatePurchase(editingPurchase.id, {
        billNumber: billNumber.trim(),
        supplierId,
        supplierName: supplier ? supplier.name : editingPurchase.supplierName,
        billDate,
        billTime: billTime || undefined,
        dueDate,
        branchId,
        items: items.map((i, idx) => ({ ...i, id: `pbi-${Date.now()}-${idx}` })),
        proofUrl: proofUrl || undefined,
        proofStatus: proofStatus || (proofUrl ? 'Proof Attached' : 'Not Required'),
        notes: notes || undefined
      });
      if (res.success) {
        setActionFeedback({ type: 'success', message: res.message });
        setIsModalOpen(false);
        setEditingPurchase(null);
        resetForm();
      } else {
        setErrorMsg(res.message);
      }
    } else {
      addPurchase({
        billNumber: billNumber.trim(),
        supplierId,
        supplierName: supplier ? supplier.name : 'Supplier',
        billDate,
        billTime: billTime || undefined,
        dueDate,
        branchId,
        items: items.map((i, idx) => ({ ...i, id: `pbi-${Date.now()}-${idx}` })),
        grandTotal,
        amountPaid,
        proofUrl: proofUrl || undefined,
        proofStatus: proofStatus || (proofUrl ? 'Proof Attached' : 'Not Required'),
        notes: notes || undefined
      });
      setActionFeedback({ type: 'success', message: `Supplier Purchase ${billNumber.trim()} created successfully.` });
      setIsModalOpen(false);
      resetForm();
    }
  };

  const handleDeleteConfirm = () => {
    if (!deleteModal.purchase) return;
    const res = softDeletePurchase(deleteModal.purchase.id);
    if (res.success) {
      setActionFeedback({ type: 'success', message: res.message });
    } else {
      setActionFeedback({ type: 'error', message: res.message });
    }
    setDeleteModal({ isOpen: false, purchase: null });
  };

  const resetForm = () => {
    setBillNumber('');
    setBillTime(new Date().toTimeString().slice(0, 5));
    setAmountPaid(0);
    setProofUrl('');
    setProofStatus('Not Required');
    setNotes('');
    setErrorMsg('');
  };

  const handleSupplierPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModal.purchase || supplierPayAmount <= 0) return;

    const res = recordSupplierPayment({
      purchaseId: payModal.purchase.id,
      amount: supplierPayAmount,
      paymentMethod: supplierPayMethod,
      paymentDate: supplierPayDate,
      paymentTime: supplierPayTime || undefined,
      referenceNo: supplierPayRef.trim() || undefined,
      proofUrl: supplierPayProofUrl.trim() || undefined,
      proofStatus: supplierPayProofStatus || (supplierPayProofUrl ? 'Proof Attached' : 'Not Required'),
      notes: supplierPayNotes.trim() || undefined
    });

    if (res.success && res.receipt) {
      setPayModal({ isOpen: false });
      setSupplierPayAmount(0);
      setSupplierPayTime(new Date().toTimeString().slice(0, 5));
      setSupplierPayRef('');
      setSupplierPayProofUrl('');
      setSupplierPayNotes('');
      setSelectedReceipt(res.receipt);
    } else {
      setErrorMsg(res.message);
    }
  };

  // Filter purchases (excluding soft-deleted)
  const activePurchases = purchases.filter(pb => !pb.isDeleted);

  const filteredPurchases = activePurchases.filter(pb => {
    if (selectedBranchId !== 'all' && pb.branchId !== selectedBranchId) return false;
    if (branchFilter !== 'all' && pb.branchId !== branchFilter) return false;
    if (supplierFilter !== 'all' && pb.supplierId !== supplierFilter) return false;
    if (statusFilter !== 'all' && pb.status !== statusFilter) return false;
    if (startDate && pb.billDate < startDate) return false;
    if (endDate && pb.billDate > endDate) return false;
    if (minAmount > 0 && pb.grandTotal < minAmount) return false;
    if (maxAmount > 0 && pb.grandTotal > maxAmount) return false;

    if (billNoQuery.trim()) {
      const q = billNoQuery.toLowerCase().trim();
      if (!pb.billNumber.toLowerCase().includes(q)) return false;
    }

    if (productFilter !== 'all') {
      if (!pb.items.some(i => i.productId === productFilter)) return false;
    }

    return true;
  });

  // Date Sorting
  const sortedPurchases = [...filteredPurchases].sort((a, b) => {
    const timeA = new Date(a.billDate).getTime();
    const timeB = new Date(b.billDate).getTime();
    return dateSortOrder === 'desc' ? timeB - timeA : timeA - timeB;
  });

  const totalRecords = sortedPurchases.length;
  const paginatedPurchases = sortedPurchases.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleDownloadPDF = (purchase: PurchaseBill) => {
    const doc = generatePurchaseBillPDF(purchase, companyProfile);
    doc.save(`Supplier-Purchase-${purchase.billNumber}.pdf`);
  };

  const handleOpenWhatsApp = (purchase: PurchaseBill) => {
    const supplier = parties.find(p => p.id === purchase.supplierId);
    const branchObj = branches.find(b => b.id === purchase.branchId);
    const msg = formatPurchaseBillWAMessage({
      supplierName: purchase.supplierName,
      billNumber: purchase.billNumber,
      date: purchase.billDate,
      grandTotal: purchase.grandTotal,
      amountPaid: purchase.amountPaid,
      outstandingAmount: purchase.outstandingAmount,
      branchName: branchObj ? branchObj.name : 'Factory Branch'
    });
    setWaModal({
      isOpen: true,
      phone: supplier?.phone || '',
      partyName: purchase.supplierName,
      message: `${msg}\n\n*Note:* Official supplier purchase voucher PDF has been downloaded. Please review the attached document.`,
      docTitle: `Supplier Purchase ${purchase.billNumber}`
    });
  };

  const handleDownloadSupplierPaymentPDF = (payment: SupplierPayment) => {
    const doc = generateSupplierPaymentPDF(payment, companyProfile);
    doc.save(`Supplier-Payment-${payment.receiptNumber}.pdf`);
  };

  const handleOpenSupplierPaymentWhatsApp = (payment: SupplierPayment) => {
    const supplier = parties.find(p => p.id === payment.supplierId);
    const branchObj = branches.find(b => b.id === payment.branchId);
    const msg = formatSupplierPaymentWAMessage({
      supplierName: payment.supplierName,
      receiptNumber: payment.receiptNumber,
      purchaseBillNumber: payment.purchaseBillNumber,
      date: payment.paymentDate,
      amountPaid: payment.amountPaid,
      paymentMethod: payment.paymentMethod,
      referenceNo: payment.referenceNo,
      remainingPayable: payment.remainingPayable,
      branchName: branchObj ? branchObj.name : 'Factory Branch'
    });
    setWaModal({
      isOpen: true,
      phone: supplier?.phone || '',
      partyName: payment.supplierName,
      message: `${msg}\n\n*Note:* Official supplier payment receipt PDF has been downloaded. Please review the attached document.`,
      docTitle: `Supplier Payment ${payment.receiptNumber}`
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Purchases & Supplier Bills
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage raw spice procurement, packaging materials, and supplier bill balances (Separate from operating expenses).
          </p>
        </div>

        <button
          onClick={() => {
            if (selectedBranchId !== 'all') {
              setBranchId(selectedBranchId as BranchId);
            }
            openAddModal();
          }}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md flex items-center gap-2 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Record Supplier Purchase
        </button>
      </div>

      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs ${
          actionFeedback.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
            : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {actionFeedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />}
            <span>{actionFeedback.message}</span>
          </div>
          <button onClick={() => setActionFeedback(null)} className="text-slate-400 hover:text-slate-600 font-bold">×</button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
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
                    ? 'bg-slate-900 text-white dark:bg-indigo-600 dark:text-white shadow-sm' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {st === 'all' ? 'All Statuses' : st}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button
              onClick={() => setShowFilters(prev => !prev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
                showFilters || activeFiltersCount > 0
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700 dark:bg-indigo-950/60 dark:border-indigo-700 dark:text-indigo-300'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              Advanced Filters
              {activeFiltersCount > 0 && (
                <span className="px-1.5 py-0.2 bg-indigo-600 text-white rounded-full text-[10px]">
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
              Showing <span className="font-bold text-slate-900 dark:text-white">{filteredPurchases.length}</span> Purchases
            </div>
          </div>
        </div>

        {/* Collapsible Filter Panel */}
        {showFilters && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs animate-in fade-in">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Supplier Bill No
              </label>
              <input
                type="text"
                placeholder="e.g. SUP-882"
                value={billNoQuery}
                onChange={(e) => setBillNoQuery(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Supplier
              </label>
              <select
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="all">All Suppliers</option>
                {parties.filter(p => p.type === 'Supplier' || p.type === 'Both').map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Product / Material
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

      {/* Purchases Table */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden space-y-3">
        {/* Table Top Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
          <div className="text-slate-500 font-medium">
            Showing <span className="font-semibold text-slate-800 dark:text-slate-200">Purchases & Supplier Bills</span> ({totalRecords} records found)
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDateSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-xs"
              title="Toggle Date Sort Order"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Date: {dateSortOrder === 'desc' ? 'Newest First' : 'Oldest First'}</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-2.5">Supplier Bill No</th>
                <th className="p-2.5">Supplier Party</th>
                <th className="p-2.5">Bill Date</th>
                <th className="p-2.5">Due Date</th>
                <th className="p-2.5">Items Purchased</th>
                <th className="p-2.5 text-right">Grand Total</th>
                <th className="p-2.5 text-right">Amount Paid</th>
                <th className="p-2.5 text-right">Outstanding</th>
                <th className="p-2.5 text-center">Status</th>
                <th className="p-2.5">Proof</th>
                <th className="p-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedPurchases.length > 0 ? (
                paginatedPurchases.map((pb) => {
                  return (
                    <tr key={pb.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-2.5 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {pb.billNumber}
                      </td>
                      <td className="p-2.5 font-medium text-slate-900 dark:text-white">
                        <div className="truncate max-w-[140px] font-semibold">{pb.supplierName}</div>
                      </td>
                      <td className="p-2.5 text-slate-500 whitespace-nowrap">
                        {formatDate(pb.billDate)}
                      </td>
                      <td className="p-2.5 text-slate-500 whitespace-nowrap">
                        {formatDate(pb.dueDate)}
                      </td>
                      <td className="p-2.5 max-w-[160px] truncate text-slate-600 dark:text-slate-300">
                        {pb.items.map(i => `${i.productName} (x${i.quantity})`).join(', ')}
                      </td>
                      <td className="p-2.5 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {formatPKR(pb.grandTotal)}
                      </td>
                      <td className="p-2.5 text-right font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        {formatPKR(pb.amountPaid)}
                      </td>
                      <td className="p-2.5 text-right font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                        {formatPKR(pb.outstandingAmount)}
                      </td>
                      <td className="p-2.5 text-center">
                        <StatusBadge status={pb.status} size="sm" />
                      </td>
                      <td className="p-2.5">
                        <ProofBadge
                          status={pb.proofStatus}
                          proofUrl={pb.proofUrl}
                          onClick={pb.proofUrl ? () => setProofModal({ isOpen: true, url: pb.proofUrl, docNo: pb.billNumber }) : undefined}
                        />
                      </td>
                      <td className="p-2.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {pb.outstandingAmount > 0 && (
                            <button
                              onClick={() => { setPayModal({ isOpen: true, purchase: pb }); setSupplierPayAmount(pb.outstandingAmount); }}
                              className="px-2 py-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300 rounded-lg shadow-sm"
                            >
                              Pay Supplier
                            </button>
                          )}
                          <button
                            onClick={() => openEditModal(pb)}
                            className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/60 transition-colors"
                            title="Edit Purchase Bill"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteModal({ isOpen: true, purchase: pb })}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors"
                            title="Delete Purchase Bill"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDownloadPDF(pb)}
                            className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-colors"
                            title="Generate / Download PDF Voucher"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenWhatsApp(pb)}
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition-colors"
                            title="Message on WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                          {pb.proofUrl && (
                            <button
                              onClick={() => setProofModal({ isOpen: true, url: pb.proofUrl, docNo: pb.billNumber })}
                              className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/50"
                              title="View Supplier Invoice Proof"
                            >
                              <ImageIcon className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-400">
                    No supplier purchase bills recorded matching criteria.
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

      {/* CREATE / EDIT PURCHASE MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingPurchase(null);
        }}
        title={editingPurchase ? `Edit Supplier Purchase ${editingPurchase.billNumber}` : "Record Supplier Purchase Bill"}
        subtitle={editingPurchase ? "Update bill line items, quantities, dates and proof" : "Raw spice materials & packaging procurement"}
        maxWidth="4xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Supplier Party *
              </label>
              <PartyCombobox
                parties={parties}
                selectedPartyId={supplierId}
                onSelect={(party) => setSupplierId(party.id)}
                onClear={() => setSupplierId('')}
                filterType="Supplier"
                placeholder="Search supplier by name or phone..."
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Manual Supplier Bill No *
              </label>
              <input
                type="text"
                placeholder="e.g. SUP-882"
                value={billNumber}
                onChange={(e) => setBillNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white"
                required
              />
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
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
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
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Payment Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              />
            </div>
          </div>

          {/* Product Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Items Purchased
              </h4>
              <button
                type="button"
                onClick={addItemRow}
                className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-lg flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Row
              </button>
            </div>

            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 items-center text-xs">
                  <div className="col-span-4">
                    <div className="flex items-center justify-between mb-0.5">
                      <label className="text-[10px] text-slate-400">Product / Material</label>
                      <button
                        type="button"
                        onClick={() => setInlineProductOpen({ isOpen: true, itemIndex: index })}
                        className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-0.5"
                      >
                        <Plus className="w-2.5 h-2.5" /> New Product
                      </button>
                    </div>
                    <select
                      value={item.productId}
                      onChange={(e) => handleProductChange(index, e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    >
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[10px] text-slate-400 mb-0.5">Quantity (Whole #)</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={item.quantity}
                      onChange={(e) => handleQtyRateChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[10px] text-slate-400 mb-0.5">Unit Rate (PKR)</label>
                    <CurrencyInput
                      value={item.rate}
                      onChange={(val) => handleQtyRateChange(index, 'rate', val)}
                      placeholder="Rate"
                      prefix="Rs."
                    />
                  </div>

                  <div className="col-span-3 text-right">
                    <label className="block text-[10px] text-slate-400 mb-0.5">Line Total</label>
                    <span className="font-bold text-slate-900 dark:text-white">{formatPKR(item.lineTotal)}</span>
                  </div>

                  <div className="col-span-1 text-right">
                    <button
                      type="button"
                      onClick={() => removeItemRow(index)}
                      className="p-1.5 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FileUpload
              label="Supplier Invoice / Delivery Proof (Optional)"
              proofUrl={proofUrl}
              onProofChange={(url, status) => {
                setProofUrl(url);
                setProofStatus(status);
              }}
            />

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Purchase Notes
              </label>
              <input
                type="text"
                placeholder="e.g. Origin Sindh, quality grade A"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/60 flex justify-between items-center">
            <div className="w-1/2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Advance Amount Paid to Supplier (PKR)
              </label>
              <CurrencyInput
                value={amountPaid}
                onChange={setAmountPaid}
                max={grandTotal}
                placeholder="0"
                prefix="Rs."
              />
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500 block">Grand Total: <strong className="text-slate-900 dark:text-white">{formatPKR(grandTotal)}</strong></span>
              <span className="text-xs text-slate-500 block">Outstanding: <strong className="text-rose-600 dark:text-rose-400">{formatPKR(Math.max(0, grandTotal - amountPaid))}</strong></span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                setEditingPurchase(null);
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-colors"
            >
              {editingPurchase ? 'Update Purchase Bill' : 'Save Purchase Bill'}
            </button>
          </div>
        </form>
      </Modal>

      {/* SUPPLIER PAYMENT MODAL */}
      {payModal.purchase && (
        <Modal
          isOpen={payModal.isOpen}
          onClose={() => setPayModal({ isOpen: false })}
          title={`Pay Supplier — Bill ${payModal.purchase.billNumber}`}
          subtitle={`Supplier: ${payModal.purchase.supplierName}`}
          maxWidth="sm"
        >
          <form onSubmit={handleSupplierPaymentSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Payment Amount (PKR) *
              </label>
              <CurrencyInput
                value={supplierPayAmount}
                onChange={setSupplierPayAmount}
                max={payModal.purchase.outstandingAmount}
                placeholder="0"
                prefix="Rs."
                required
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Current Outstanding: {formatPKR(payModal.purchase.outstandingAmount)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Method *
                </label>
                <select
                  value={supplierPayMethod}
                  onChange={(e) => setSupplierPayMethod(e.target.value as PaymentMethod)}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                >
                  {['Bank Transfer', 'Cash', 'Cheque', 'Online Transfer', 'JazzCash', 'Easypaisa', 'Other'].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    value={supplierPayDate}
                    onChange={(e) => setSupplierPayDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Time
                  </label>
                  <input
                    type="time"
                    value={supplierPayTime}
                    onChange={(e) => setSupplierPayTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Bank / Voucher Ref No
              </label>
              <input
                type="text"
                placeholder="e.g. Meezan-FT-9941"
                value={supplierPayRef}
                onChange={(e) => setSupplierPayRef(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs"
              />
            </div>

            <FileUpload
              label="Supplier Payment Voucher / Proof"
              proofUrl={supplierPayProofUrl}
              onProofChange={(url, status) => {
                setSupplierPayProofUrl(url);
                setSupplierPayProofStatus(status);
              }}
            />

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Disbursement Notes
              </label>
              <input
                type="text"
                placeholder="e.g. Part payment against lot 4"
                value={supplierPayNotes}
                onChange={(e) => setSupplierPayNotes(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setPayModal({ isOpen: false })}
                className="px-4 py-2 text-slate-700 bg-slate-100 dark:bg-slate-800 dark:text-slate-300 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl font-semibold shadow-md transition-colors"
              >
                Confirm Payment & Generate Voucher
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* SUPPLIER PAYMENT RECEIPT VOUCHER MODAL */}
      {selectedReceipt && (
        <Modal
          isOpen={!!selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
          title={`Supplier Payment Voucher ${selectedReceipt.receiptNumber}`}
          subtitle={`Disbursed to ${selectedReceipt.supplierName} on ${formatDate(selectedReceipt.paymentDate)}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 text-center">
              <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 block">
                Amount Disbursed
              </span>
              <span className="text-2xl font-extrabold text-indigo-700 dark:text-indigo-300 mt-1 block">
                {formatPKR(selectedReceipt.amountPaid)}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between py-1 border-b">
                <span className="text-slate-500">Supplier:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{selectedReceipt.supplierName}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-slate-500">Purchase Bill No:</span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{selectedReceipt.purchaseBillNumber}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-slate-500">Payment Method:</span>
                <span className="font-semibold">{selectedReceipt.paymentMethod}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-slate-500">Bank / Ref Number:</span>
                <span className="font-mono">{selectedReceipt.referenceNo || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-slate-500">Remaining Payable on Bill:</span>
                <span className="font-bold text-rose-600 dark:text-rose-400">{formatPKR(selectedReceipt.remainingPayable)}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-slate-500">Proof Status:</span>
                <ProofBadge
                  status={selectedReceipt.proofStatus}
                  proofUrl={selectedReceipt.proofUrl}
                  onClick={selectedReceipt.proofUrl ? () => setProofModal({ isOpen: true, url: selectedReceipt.proofUrl, docNo: selectedReceipt.receiptNumber }) : undefined}
                />
              </div>
              {selectedReceipt.notes && (
                <div className="py-1 border-b">
                  <span className="text-slate-500 block">Notes:</span>
                  <span className="text-slate-800 dark:text-slate-200">{selectedReceipt.notes}</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => handleDownloadSupplierPaymentPDF(selectedReceipt)}
                className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
                title="Download PDF Voucher"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </button>
              <button
                onClick={() => {
                  const supplier = parties.find(p => p.id === selectedReceipt.supplierId);
                  const branchObj = branches.find(b => b.id === selectedReceipt.branchId);
                  const branchName = branchObj ? branchObj.name : 'Factory Branch';
                  const msg = formatSupplierPaymentWAMessage({
                    supplierName: selectedReceipt.supplierName,
                    receiptNumber: selectedReceipt.receiptNumber,
                    purchaseBillNumber: selectedReceipt.purchaseBillNumber,
                    date: selectedReceipt.paymentDate,
                    amountPaid: selectedReceipt.amountPaid,
                    paymentMethod: selectedReceipt.paymentMethod,
                    referenceNo: selectedReceipt.referenceNo,
                    remainingPayable: selectedReceipt.remainingPayable,
                    branchName
                  });
                  setWaModal({
                    isOpen: true,
                    phone: supplier?.phone || '',
                    partyName: selectedReceipt.supplierName,
                    message: msg,
                    docTitle: `Supplier Payment Voucher ${selectedReceipt.receiptNumber}`
                  });
                }}
                className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                WhatsApp Share
              </button>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-sm"
              >
                Done
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* PROOF VIEWER MODAL */}
      <ProofViewerModal
        isOpen={proofModal.isOpen}
        onClose={() => setProofModal({ isOpen: false })}
        title="Supplier Bill Proof Attachment"
        proofUrl={proofModal.url}
        documentNumber={proofModal.docNo}
      />

      {/* INLINE PRODUCT CREATION MODAL */}
      <InlineProductModal
        isOpen={inlineProductOpen.isOpen}
        onClose={() => setInlineProductOpen(prev => ({ ...prev, isOpen: false }))}
        onCreated={(newProd: any) => {
          handleProductChange(inlineProductOpen.itemIndex, newProd.id);
        }}
      />

      {/* WHATSAPP SHARE MODAL */}
      <WhatsAppShareModal
        isOpen={waModal.isOpen}
        onClose={() => setWaModal(prev => ({ ...prev, isOpen: false }))}
        partyName={waModal.partyName}
        defaultPhone={waModal.phone}
        defaultMessage={waModal.message}
        documentTitle={waModal.docTitle}
      />

      {/* CONFIRMATION MODAL FOR DELETION */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, purchase: null })}
        onConfirm={handleDeleteConfirm}
        type="delete"
        title="Delete Purchase Bill"
        message="Are you sure you want to delete this record?"
        confirmText="Delete"
      />

    </div>
  );
};
