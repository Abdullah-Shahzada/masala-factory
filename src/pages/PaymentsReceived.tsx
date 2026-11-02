import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PaymentReceived, PaymentMethod, BranchId, PaymentAllocation, ProofStatus } from '../types';
import { formatPKR, formatDate } from '../utils/formatters';
import { Modal } from '../components/common/Modal';
import { CurrencyInput } from '../components/common/CurrencyInput';
import { ProofViewerModal } from '../components/common/ProofViewerModal';
import { ProofBadge } from '../components/common/ProofBadge';
import { FileUpload } from '../components/common/FileUpload';
import { WhatsAppShareModal } from '../components/common/WhatsAppShareModal';
import { formatPaymentReceiptWAMessage } from '../utils/whatsappHelper';
import { 
  CreditCard, 
  Plus, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  Printer, 
  Image as ImageIcon,
  Building2,
  Calendar,
  Filter,
  X,
  MessageSquare,
  Download,
  Pencil,
  Trash2
} from 'lucide-react';
import { PasswordConfirmModal } from '../components/common/PasswordConfirmModal';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { PartyCombobox } from '../components/common/PartyCombobox';
import { Pagination } from '../components/common/Pagination';
import { generatePaymentReceivedPDF } from '../utils/pdfGenerator';
import { computePaymentReceiptBreakdown } from '../utils/paymentReceiptHelper';

export const PaymentsReceived: React.FC = () => {
  const { 
    paymentsReceived, 
    recordPayment, 
    completePayment,
    updatePaymentReceived,
    softDeletePaymentReceived,
    parties, 
    salesBills, 
    branches, 
    selectedBranchId, 
    companyProfile 
  } = useApp();

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentReceived | null>(null);
  const [editingPayment, setEditingPayment] = useState<PaymentReceived | null>(null);
  const [editDate, setEditDate] = useState<string>('');
  const [editMethod, setEditMethod] = useState<PaymentMethod>('Bank Transfer');
  const [editReferenceNo, setEditReferenceNo] = useState<string>('');
  const [editProofUrl, setEditProofUrl] = useState<string>('');
  const [editProofStatus, setEditProofStatus] = useState<ProofStatus>('Not Required');
  const [editNotes, setEditNotes] = useState<string>('');

  const [proofModal, setProofModal] = useState<{ isOpen: boolean; url?: string; docNo?: string }>({ isOpen: false });

  // Password Verification Modal State for Mark Complete
  const [passwordModal, setPasswordModal] = useState<{
    isOpen: boolean;
    payment: PaymentReceived | null;
  }>({ isOpen: false, payment: null });

  // Password Verification Modal State for Deletion
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    payment: PaymentReceived | null;
  }>({ isOpen: false, payment: null });

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
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [partyFilter, setPartyFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [refQuery, setRefQuery] = useState('');
  const [minAmount, setMinAmount] = useState<number>(0);
  const [maxAmount, setMaxAmount] = useState<number>(0);

  // Form state
  const [partyId, setPartyId] = useState<string>('');
  const [amountReceived, setAmountReceived] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentTime, setPaymentTime] = useState<string>(() => new Date().toTimeString().slice(0, 5));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Bank Transfer');
  const [selectedBillIds, setSelectedBillIds] = useState<string[]>([]);
  const [customAllocations, setCustomAllocations] = useState<Record<string, number>>({});
  const [billSearchQuery, setBillSearchQuery] = useState<string>('');
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [branchId, setBranchId] = useState<BranchId>(
    selectedBranchId !== 'all' ? (selectedBranchId as BranchId) : 'b1'
  );
  const [proofUrl, setProofUrl] = useState<string>('');
  const [proofStatus, setProofStatus] = useState<ProofStatus>('Not Required');
  const [notes, setNotes] = useState<string>('');

  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  // Available unpaid / partially paid bills for chosen customer (excluding soft-deleted bills)
  const partyUnpaidBills = salesBills.filter(b => 
    b.partyId === partyId && !b.isDeleted && (b.status === 'Unpaid' || b.status === 'Partially Paid')
  );

  const displayedUnpaidBills = partyUnpaidBills.filter(b => {
    if (!billSearchQuery.trim()) return true;
    const q = billSearchQuery.toLowerCase().trim();
    return b.billNumber.toLowerCase().includes(q) || b.billDate.includes(q);
  });

  const totalOutstandingForParty = partyUnpaidBills.reduce((sum, b) => sum + b.remainingAmount, 0);

  const handlePartySelect = (id: string) => {
    setPartyId(id);
    setSelectedBillIds([]);
    setCustomAllocations({});
    setBillSearchQuery('');
    setFeedback(null);
  };

  const handleBillCheckToggle = (billId: string) => {
    const bill = salesBills.find(b => b.id === billId);
    if (!bill) return;

    if (selectedBillIds.includes(billId)) {
      setSelectedBillIds(prev => prev.filter(id => id !== billId));
      setCustomAllocations(prev => {
        const next = { ...prev };
        delete next[billId];
        return next;
      });
    } else {
      setSelectedBillIds(prev => [...prev, billId]);
      // Auto-suggest allocation up to bill remaining or whatever remains of amountReceived
      setCustomAllocations(prev => {
        const currentAllocSum = Object.values(prev).reduce((a, b) => a + b, 0);
        const remAvailable = Math.max(0, amountReceived - currentAllocSum);
        const initialAlloc = remAvailable > 0 ? Math.min(bill.remainingAmount, remAvailable) : bill.remainingAmount;
        return {
          ...prev,
          [billId]: initialAlloc
        };
      });
    }
  };

  const handleCustomAllocationChange = (billId: string, val: number) => {
    setCustomAllocations(prev => ({
      ...prev,
      [billId]: Math.max(0, val)
    }));
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setPartyFilter('all');
    setMethodFilter('all');
    setBranchFilter('all');
    setRefQuery('');
    setMinAmount(0);
    setMaxAmount(0);
    setCurrentPage(1);
  };

  const activeFiltersCount = [
    startDate !== '',
    endDate !== '',
    partyFilter !== 'all',
    methodFilter !== 'all',
    branchFilter !== 'all',
    refQuery.trim() !== '',
    minAmount > 0,
    maxAmount > 0
  ].filter(Boolean).length;

  const totalAllocatedAmount = Object.entries(customAllocations)
    .filter(([id]) => selectedBillIds.includes(id))
    .reduce((sum, [, val]) => sum + val, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!partyId) {
      setFeedback({ type: 'error', message: 'Please select a customer party.' });
      return;
    }
    if (amountReceived <= 0) {
      setFeedback({ type: 'error', message: 'Please enter a valid amount received greater than zero.' });
      return;
    }
    if (selectedBillIds.length === 0) {
      setFeedback({ type: 'error', message: 'Please select at least one related bill to allocate this payment to.' });
      return;
    }

    // Validate allocations against bill balances
    for (const billId of selectedBillIds) {
      const b = salesBills.find(sb => sb.id === billId);
      const alloc = customAllocations[billId] || 0;
      if (b && alloc > b.remainingAmount) {
        setFeedback({
          type: 'error',
          message: `Allocation error: Rs.${alloc.toLocaleString()} exceeds Bill ${b.billNumber}'s remaining balance of Rs.${b.remainingAmount.toLocaleString()}.`
        });
        return;
      }
    }

    if (totalAllocatedAmount > amountReceived) {
      setFeedback({
        type: 'error',
        message: `Total bill allocations (Rs.${totalAllocatedAmount.toLocaleString()}) cannot exceed Amount Received (Rs.${amountReceived.toLocaleString()}).`
      });
      return;
    }

    const party = parties.find(p => p.id === partyId);

    const allocationsList: PaymentAllocation[] = selectedBillIds.map(bid => {
      const b = salesBills.find(sb => sb.id === bid);
      return {
        billId: bid,
        billNumber: b ? b.billNumber : bid,
        amount: customAllocations[bid] !== undefined ? customAllocations[bid] : (b ? Math.min(b.remainingAmount, amountReceived) : 0)
      };
    }).filter(a => a.amount > 0);

    const result = recordPayment({
      partyId,
      partyName: party ? party.name : 'Customer',
      amountReceived,
      paymentDate,
      paymentTime: paymentTime || undefined,
      paymentMethod,
      allocatedBillIds: selectedBillIds,
      allocations: allocationsList,
      referenceNo: referenceNo.trim() || undefined,
      proofUrl: proofUrl.trim() || undefined,
      proofStatus: proofStatus || (proofUrl ? 'Proof Attached' : 'Not Required'),
      notes: notes.trim() || undefined,
      branchId
    });

    if (!result.success) {
      setFeedback({ type: 'error', message: result.message });
    } else {
      setIsModalOpen(false);
      resetForm();
    }
  };

  const resetForm = () => {
    setPartyId('');
    setAmountReceived(0);
    setPaymentTime(new Date().toTimeString().slice(0, 5));
    setSelectedBillIds([]);
    setCustomAllocations({});
    setBillSearchQuery('');
    setReferenceNo('');
    setProofUrl('');
    setProofStatus('Not Required');
    setNotes('');
    setFeedback(null);
  };

  const openEditModal = (payment: PaymentReceived) => {
    setEditingPayment(payment);
    setEditDate(payment.paymentDate);
    setEditMethod(payment.paymentMethod);
    setEditReferenceNo(payment.referenceNo || '');
    setEditProofUrl(payment.proofUrl || '');
    setEditProofStatus(payment.proofStatus || (payment.proofUrl ? 'Proof Attached' : 'Not Required'));
    setEditNotes(payment.notes || '');
  };

  const handleUpdatePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment) return;
    const res = updatePaymentReceived(editingPayment.id, {
      paymentDate: editDate,
      paymentMethod: editMethod,
      referenceNo: editReferenceNo.trim() || undefined,
      proofUrl: editProofUrl.trim() || undefined,
      proofStatus: editProofStatus,
      notes: editNotes.trim() || undefined
    });
    setFeedback({
      type: res.success ? 'success' : 'error',
      message: res.message
    });
    if (res.success) {
      if (selectedPayment?.id === editingPayment.id) {
        setSelectedPayment(prev => prev ? {
          ...prev,
          paymentDate: editDate,
          paymentMethod: editMethod,
          referenceNo: editReferenceNo.trim() || undefined,
          proofUrl: editProofUrl.trim() || undefined,
          proofStatus: editProofStatus,
          notes: editNotes.trim() || undefined
        } : null);
      }
      setEditingPayment(null);
    }
  };

  const handleDeleteConfirm = () => {
    if (!deleteModal.payment) return;
    const res = softDeletePaymentReceived(deleteModal.payment.id);
    setFeedback({
      type: res.success ? 'success' : 'error',
      message: res.message
    });
    if (res.success) {
      if (selectedPayment?.id === deleteModal.payment.id) {
        setSelectedPayment(null);
      }
      setDeleteModal({ isOpen: false, payment: null });
    }
  };

  // Filter payments history list (excluding soft-deleted)
  const activePayments = paymentsReceived.filter(p => !p.isDeleted);

  const filteredPayments = activePayments.filter(payment => {
    if (selectedBranchId !== 'all' && payment.branchId !== selectedBranchId) return false;
    if (branchFilter !== 'all' && payment.branchId !== branchFilter) return false;
    if (partyFilter !== 'all' && payment.partyId !== partyFilter) return false;
    if (methodFilter !== 'all' && payment.paymentMethod !== methodFilter) return false;
    if (startDate && payment.paymentDate < startDate) return false;
    if (endDate && payment.paymentDate > endDate) return false;
    if (minAmount > 0 && payment.amountReceived < minAmount) return false;
    if (maxAmount > 0 && payment.amountReceived > maxAmount) return false;

    if (refQuery.trim()) {
      const q = refQuery.toLowerCase().trim();
      const matchRef = payment.referenceNo?.toLowerCase().includes(q);
      const matchReceipt = payment.receiptNumber.toLowerCase().includes(q);
      // Check if reference matches any allocated bill number
      const matchAllocated = payment.allocatedBillIds.some(bid => {
        const b = salesBills.find(sb => sb.id === bid);
        return b && b.billNumber.toLowerCase().includes(q);
      });
      if (!matchRef && !matchReceipt && !matchAllocated) return false;
    }

    return true;
  });

  const totalRecords = filteredPayments.length;
  const paginatedPayments = filteredPayments.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleConfirmPassword = (password: string) => {
    if (!passwordModal.payment) return;
    const res = completePayment(passwordModal.payment.id, password);
    setFeedback({
      type: res.success ? 'success' : 'error',
      message: res.message
    });
    setPasswordModal({ isOpen: false, payment: null });
  };

  const handleDownloadPDF = (payment: PaymentReceived) => {
    const party = parties.find(p => p.id === payment.partyId);
    const doc = generatePaymentReceivedPDF(payment, companyProfile, party, salesBills, paymentsReceived);
    doc.save(`Payment-Receipt-${payment.receiptNumber}.pdf`);
  };

  const handleOpenWhatsApp = (payment: PaymentReceived) => {
    const party = parties.find(p => p.id === payment.partyId);
    const branchObj = branches.find(b => b.id === payment.branchId);
    const branchName = branchObj ? branchObj.name : 'Factory Branch';
    const allocatedBillNos = (payment.allocations?.map(a => a.billNumber) || payment.allocatedBillIds).join(', ');
    const msg = formatPaymentReceiptWAMessage({
      customerName: payment.partyName,
      receiptNumber: payment.receiptNumber,
      date: payment.paymentDate,
      amountReceived: payment.amountReceived,
      paymentMethod: payment.paymentMethod,
      referenceNo: payment.referenceNo,
      allocatedBills: allocatedBillNos || 'Customer Account Balance',
      branchName
    });
    setWaModal({
      isOpen: true,
      phone: payment.partyPhone || party?.phone || '',
      partyName: payment.partyName,
      message: `${msg}\n\n*Note:* Official payment receipt PDF has been downloaded. Please review the attached receipt.`,
      docTitle: `Payment Receipt ${payment.receiptNumber}`
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            Payments Received Log
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Record actual money collected from customer parties and reconcile against sales bills.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md flex items-center gap-2 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Record Payment Received
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
            <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Method:
            </span>
            {['all', 'Cash', 'Bank Transfer', 'Cheque', 'Online Transfer', 'JazzCash', 'Easypaisa'].map(m => (
              <button
                key={m}
                onClick={() => setMethodFilter(m)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  methodFilter === m 
                    ? 'bg-slate-900 text-white dark:bg-emerald-600 dark:text-white shadow-sm' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {m === 'all' ? 'All Methods' : m}
              </button>
            ))}
          </div>

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
              Showing <span className="font-bold text-slate-900 dark:text-white">{filteredPayments.length}</span> Receipts
            </div>
          </div>
        </div>

        {/* Collapsible Filter Panel */}
        {showFilters && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs animate-in fade-in">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Customer Party
              </label>
              <select
                value={partyFilter}
                onChange={(e) => setPartyFilter(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="all">All Parties</option>
                {parties.filter(p => p.type === 'Customer' || p.type === 'Both').map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Ref / Bill / Receipt No
              </label>
              <input
                type="text"
                placeholder="e.g. REC-101 / B-1547"
                value={refQuery}
                onChange={(e) => setRefQuery(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
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
                Date From
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
                Date To
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

      {/* History Table */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Mobile View: High-density interactive cards (< sm) */}
        <div className="block sm:hidden space-y-3 mb-4">
          {paginatedPayments.length > 0 ? (
            paginatedPayments.map((payment) => (
              <div
                key={payment.id}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-2.5 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      {payment.receiptNumber}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {formatDate(payment.paymentDate)}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    payment.status === 'Completed'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'
                  }`}>
                    {payment.status || 'Completed'}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {payment.partyName}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800">
                        {payment.paymentMethod}
                      </span>
                      {payment.referenceNo && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          Ref: {payment.referenceNo}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-400 block">Received</span>
                    <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                      {formatPKR(payment.amountReceived)}
                    </span>
                  </div>
                </div>

                {/* Footer Toolbar */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                  <ProofBadge
                    status={payment.proofStatus}
                    proofUrl={payment.proofUrl}
                    onClick={payment.proofUrl ? () => setProofModal({ isOpen: true, url: payment.proofUrl, docNo: payment.receiptNumber }) : undefined}
                  />
                  <div className="flex items-center gap-1 ml-auto">
                    <button
                      onClick={() => setSelectedPayment(payment)}
                      className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 dark:text-slate-300"
                      title="View Details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => openEditModal(payment)}
                      className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-950/50"
                      title="Edit Payment"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteModal({ isOpen: true, payment })}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950/50"
                      title="Delete Payment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">
              No payments recorded match the specified filters.
            </div>
          )}
        </div>

        {/* Desktop View: Full Data Table (>= sm) */}
        <div className="hidden sm:block overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-3">Receipt No</th>
                <th className="p-3">Customer Party</th>
                <th className="p-3">Payment Date</th>
                <th className="p-3">Method</th>
                <th className="p-3">Reference / Bank</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3">Proof Status</th>
                <th className="p-3 text-right">Amount Received</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedPayments.length > 0 ? (
                paginatedPayments.map((payment) => {
                  return (
                    <tr key={payment.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-3 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        {payment.receiptNumber}
                      </td>
                      <td className="p-3 font-medium text-slate-900 dark:text-white">
                        <div className="font-semibold">{payment.partyName}</div>
                        {payment.isInitialPayment && (
                          <span className="text-[10px] text-emerald-600 block">Initial Bill Payment</span>
                        )}
                      </td>
                      <td className="p-3 text-slate-500 whitespace-nowrap">
                        {formatDate(payment.paymentDate)}
                      </td>
                      <td className="p-3">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800">
                          {payment.paymentMethod}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-slate-600 dark:text-slate-300">
                        {payment.referenceNo || '-'}
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          payment.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'
                        }`}>
                          {payment.status || 'Completed'}
                        </span>
                      </td>
                      <td className="p-3">
                        <ProofBadge
                          status={payment.proofStatus}
                          proofUrl={payment.proofUrl}
                          onClick={payment.proofUrl ? () => setProofModal({ isOpen: true, url: payment.proofUrl, docNo: payment.receiptNumber }) : undefined}
                        />
                      </td>
                      <td className="p-3 text-right font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                        {formatPKR(payment.amountReceived)}
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedPayment(payment)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 dark:hover:text-white"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(payment)}
                            className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/60 transition-colors"
                            title="Edit Payment"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteModal({ isOpen: true, payment })}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors"
                            title="Delete Payment"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDownloadPDF(payment)}
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition-colors"
                            title="Download PDF Receipt"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenWhatsApp(payment)}
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition-colors"
                            title="Message on WhatsApp"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                          {payment.status !== 'Completed' && (
                            <button
                              onClick={() => setPasswordModal({ isOpen: true, payment })}
                              className="px-2 py-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-lg flex items-center gap-1 shadow-xs transition-colors"
                              title="Verify Password to Mark Completed"
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Complete
                            </button>
                          )}
                          {payment.proofUrl && (
                            <button
                              onClick={() => setProofModal({ isOpen: true, url: payment.proofUrl, docNo: payment.receiptNumber })}
                              className="p-1.5 rounded-lg text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/50"
                              title="View Attached Proof"
                            >
                              <ImageIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    No payment records match your query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

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

      {/* RECORD PAYMENT MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Record Customer Payment Received"
        subtitle="Consistently reconciles against selected sales bills remaining balances"
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {feedback && (
            <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
              feedback.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
            }`}>
              <AlertCircle className="w-4 h-4 shrink-0" />
              {feedback.message}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Select Customer Party *
              </label>
              <PartyCombobox
                parties={parties}
                selectedPartyId={partyId}
                onSelect={(party) => handlePartySelect(party.id)}
                onClear={() => handlePartySelect('')}
                filterType="Customer"
                placeholder="Search customer by name or phone..."
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Amount Received (PKR) *
              </label>
              <CurrencyInput
                value={amountReceived}
                onChange={setAmountReceived}
                placeholder="0"
                prefix="Rs."
                required
              />
            </div>
          </div>

          {/* Allocation to Unpaid Sales Bills */}
          {partyId && (
            <div className="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Allocate to Customer Sales Bills
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    Allocated: <strong className="text-emerald-600 dark:text-emerald-400">{formatPKR(totalAllocatedAmount)}</strong> / Total Received: <strong>{formatPKR(amountReceived)}</strong>
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 block">
                    Customer Total Outstanding: <strong className="text-rose-600 dark:text-rose-400">{formatPKR(totalOutstandingForParty)}</strong>
                  </span>
                </div>
              </div>

              {/* Bill Search Filter */}
              {partyUnpaidBills.length > 3 && (
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={billSearchQuery}
                    onChange={(e) => setBillSearchQuery(e.target.value)}
                    placeholder="Search bills by number (e.g. B-1547) or date..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>
              )}

              {displayedUnpaidBills.length > 0 ? (
                <div className="space-y-2 mt-2 max-h-64 overflow-y-auto pr-1">
                  {displayedUnpaidBills.map(bill => {
                    const isChecked = selectedBillIds.includes(bill.id);
                    const currentAlloc = customAllocations[bill.id] !== undefined ? customAllocations[bill.id] : 0;
                    return (
                      <div 
                        key={bill.id}
                        className={`p-3 rounded-xl border text-xs transition-colors ${
                          isChecked 
                            ? 'bg-emerald-50/70 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700' 
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div 
                            onClick={() => handleBillCheckToggle(bill.id)}
                            className="flex items-center gap-3 cursor-pointer flex-1"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                            <div>
                              <span className="font-mono font-bold text-slate-900 dark:text-white">{bill.billNumber}</span>
                              <span className="text-[10px] text-slate-400 block">{formatDate(bill.billDate)} ({bill.branchName})</span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-slate-500 block">
                              Remaining: <strong className="text-rose-600 dark:text-rose-400">{formatPKR(bill.remainingAmount)}</strong>
                            </span>
                            <span className="text-[10px] text-slate-400">Total: {formatPKR(bill.grandTotal)}</span>
                          </div>
                        </div>

                        {/* Per-Bill Custom Allocation Input */}
                        {isChecked && (
                          <div className="mt-2.5 pt-2 border-t border-emerald-200 dark:border-emerald-900 flex items-center justify-between gap-3">
                            <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                              Amount Allocated to this Bill:
                            </span>
                            <div className="w-36">
                              <CurrencyInput
                                value={currentAlloc}
                                onChange={(val) => handleCustomAllocationChange(bill.id, val)}
                                placeholder="0"
                                prefix="Rs."
                                max={bill.remainingAmount}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-lg">
                  {partyUnpaidBills.length === 0 
                    ? 'No unpaid or partially paid sales bills found for this customer.'
                    : 'No bills matched your search query.'}
                </div>
              )}
            </div>
          )}

          {/* Payment Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Payment Method *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              >
                {['Bank Transfer', 'Cash', 'Cheque', 'Online Transfer', 'JazzCash', 'Easypaisa', 'Other'].map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Date *
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Time
                </label>
                <input
                  type="time"
                  value={paymentTime}
                  onChange={(e) => setPaymentTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Bank / Payment Ref No
              </label>
              <input
                type="text"
                placeholder="e.g. HBL-TXN-99841"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FileUpload
              label="Payment Proof / Deposit Slip (Optional)"
              proofUrl={proofUrl}
              onProofChange={(url, status) => {
                setProofUrl(url);
                setProofStatus(status);
              }}
            />

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Notes & Bank Branch Details
              </label>
              <input
                type="text"
                placeholder="e.g. Deposit slip cleared Meezan Bank Gulberg"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200 dark:border-slate-800 pt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md"
            >
              Save Payment Received
            </button>
          </div>
        </form>
      </Modal>

      {/* PAYMENT DETAILS DRAWER */}
      {selectedPayment && (
        <Modal
          isOpen={!!selectedPayment}
          onClose={() => setSelectedPayment(null)}
          title={`Payment Receipt ${selectedPayment.receiptNumber}`}
          subtitle={`Collected on ${formatDate(selectedPayment.paymentDate)}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 text-center">
              <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">Amount Collected</span>
              <span className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300 mt-1 block">
                {formatPKR(selectedPayment.amountReceived)}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between py-1 border-b">
                <span className="text-slate-500">Customer:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{selectedPayment.partyName}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-slate-500">Payment Method:</span>
                <span className="font-semibold">{selectedPayment.paymentMethod}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-slate-500">Bank / Ref Number:</span>
                <span className="font-mono">{selectedPayment.referenceNo || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-slate-500">Proof Status:</span>
                <ProofBadge
                  status={selectedPayment.proofStatus}
                  proofUrl={selectedPayment.proofUrl}
                  onClick={selectedPayment.proofUrl ? () => setProofModal({ isOpen: true, url: selectedPayment.proofUrl, docNo: selectedPayment.receiptNumber }) : undefined}
                />
              </div>
              {selectedPayment.notes && (
                <div className="py-1 border-b">
                  <span className="text-slate-500 block">Notes:</span>
                  <span className="text-slate-800 dark:text-slate-200">{selectedPayment.notes}</span>
                </div>
              )}
            </div>

            {/* Detailed Bill Allocations & Financial Breakdown */}
            {(() => {
              const breakdowns = computePaymentReceiptBreakdown(selectedPayment, salesBills, paymentsReceived);
              if (breakdowns.length === 0) {
                return (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-slate-500 text-[11px]">
                    General customer ledger payment without specific bill allocations.
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  <span className="font-bold text-[11px] text-slate-700 dark:text-slate-300 block uppercase tracking-wider">
                    Detailed Bill Payment Breakdown
                  </span>
                  {breakdowns.map((b, idx) => (
                    <div 
                      key={idx} 
                      className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2.5"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                        <div>
                          <span className="font-mono font-bold text-sm text-emerald-700 dark:text-emerald-400">
                            Bill {b.billNumber}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            Date: {formatDate(b.billDate)}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          b.statusAfterPayment === 'Paid'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'
                        }`}>
                          {b.statusAfterPayment}
                        </span>
                      </div>

                      {/* 4 Financial Figures */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                        <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 block">Original Bill</span>
                          <span className="font-bold text-slate-900 dark:text-white">{formatPKR(b.originalBillTotal)}</span>
                        </div>
                        <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 block">Previously Received</span>
                          <span className="font-bold text-slate-600 dark:text-slate-300">{formatPKR(b.previouslyReceived)}</span>
                        </div>
                        <div className="p-2 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                          <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block font-semibold">Received This Time</span>
                          <span className="font-extrabold text-emerald-700 dark:text-emerald-300">{formatPKR(b.amountThisPayment)}</span>
                        </div>
                        <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] text-rose-500 block">Remaining Balance</span>
                          <span className="font-bold text-rose-600 dark:text-rose-400">{formatPKR(b.remainingBalance)}</span>
                        </div>
                      </div>

                      {/* Exact Narrative Callout */}
                      <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 text-[11px] text-emerald-900 dark:text-emerald-200 font-medium flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{b.narrative}</span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const toEdit = selectedPayment;
                    setSelectedPayment(null);
                    openEditModal(toEdit);
                  }}
                  className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 font-semibold rounded-xl flex items-center gap-1.5 transition-colors text-xs"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    const toDelete = selectedPayment;
                    setSelectedPayment(null);
                    setDeleteModal({ isOpen: true, payment: toDelete });
                  }}
                  className="px-3 py-2 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 font-semibold rounded-xl flex items-center gap-1.5 transition-colors text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const party = parties.find(p => p.id === selectedPayment.partyId);
                    const branchObj = branches.find(b => b.id === selectedPayment.branchId);
                    const branchName = branchObj ? branchObj.name : 'Factory Branch';
                    const allocatedBillNos = (selectedPayment.allocations?.map(a => a.billNumber) || selectedPayment.allocatedBillIds).join(', ');
                    const msg = formatPaymentReceiptWAMessage({
                      customerName: selectedPayment.partyName,
                      receiptNumber: selectedPayment.receiptNumber,
                      date: selectedPayment.paymentDate,
                      amountReceived: selectedPayment.amountReceived,
                      paymentMethod: selectedPayment.paymentMethod,
                      referenceNo: selectedPayment.referenceNo,
                      allocatedBills: allocatedBillNos || 'Customer Ledger Balance',
                      branchName
                    });
                    setWaModal({
                      isOpen: true,
                      phone: party?.phone || '',
                      partyName: selectedPayment.partyName,
                      message: msg,
                      docTitle: `Receipt ${selectedPayment.receiptNumber}`
                    });
                  }}
                  className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold rounded-xl flex items-center gap-1.5 transition-colors text-xs"
                >
                  <MessageSquare className="w-4 h-4" />
                  WhatsApp Share
                </button>
                <button
                  onClick={() => handleDownloadPDF(selectedPayment)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl flex items-center gap-1.5 shadow-sm transition-colors text-xs"
                >
                  <Download className="w-4 h-4" />
                  Download PDF Receipt
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* EDIT PAYMENT MODAL */}
      {editingPayment && (
        <Modal
          isOpen={!!editingPayment}
          onClose={() => setEditingPayment(null)}
          title={`Edit Payment Receipt ${editingPayment.receiptNumber}`}
          subtitle={`Customer: ${editingPayment.partyName} | Amount: ${formatPKR(editingPayment.amountReceived)}`}
          maxWidth="lg"
        >
          <form onSubmit={handleUpdatePayment} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Date *
                </label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Method *
                </label>
                <select
                  value={editMethod}
                  onChange={(e) => setEditMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Online / Raast">Online / Raast</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Reference / Cheque Number
              </label>
              <input
                type="text"
                placeholder="e.g. Meezan-FT-9912 or Cheque #8812"
                value={editReferenceNo}
                onChange={(e) => setEditReferenceNo(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Proof Status
                </label>
                <select
                  value={editProofStatus}
                  onChange={(e) => setEditProofStatus(e.target.value as ProofStatus)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="Not Required">Not Required</option>
                  <option value="Proof Attached">Proof Attached</option>
                  <option value="Proof Missing">Proof Missing</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Proof Document / Image URL
                </label>
                <input
                  type="text"
                  placeholder="https://... or upload below"
                  value={editProofUrl}
                  onChange={(e) => {
                    setEditProofUrl(e.target.value);
                    if (e.target.value.trim()) setEditProofStatus('Proof Attached');
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="pt-1">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Or Upload Direct Proof Image
              </label>
              <FileUpload
                label="Upload Bank Deposit Slip / Cheque Photo"
                proofUrl={editProofUrl}
                onProofChange={(url, status) => {
                  setEditProofUrl(url);
                  setEditProofStatus(status);
                }}
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Notes / Audit Remarks
              </label>
              <textarea
                rows={2}
                placeholder="Internal audit notes..."
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditingPayment(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-md transition-colors"
              >
                Update Payment
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* PROOF VIEWER MODAL */}
      <ProofViewerModal
        isOpen={proofModal.isOpen}
        onClose={() => setProofModal({ isOpen: false })}
        title="Payment Proof Attachment"
        proofUrl={proofModal.url}
        documentNumber={proofModal.docNo}
      />

      {/* WHATSAPP SHARE MODAL */}
      <WhatsAppShareModal
        isOpen={waModal.isOpen}
        onClose={() => setWaModal(prev => ({ ...prev, isOpen: false }))}
        partyName={waModal.partyName}
        defaultPhone={waModal.phone}
        defaultMessage={waModal.message}
        documentTitle={waModal.docTitle}
        onDownloadPdf={() => selectedPayment && handleDownloadPDF(selectedPayment)}
      />

      {/* PASSWORD CONFIRMATION MODAL FOR PAYMENT COMPLETION */}
      <PasswordConfirmModal
        isOpen={passwordModal.isOpen}
        onClose={() => setPasswordModal({ isOpen: false, payment: null })}
        onConfirm={handleConfirmPassword}
        title={`Complete Payment ${passwordModal.payment?.receiptNumber}`}
        description={`Enter administrator password to verify and mark payment ${passwordModal.payment?.receiptNumber} (${formatPKR(passwordModal.payment?.amountReceived || 0)}) as Completed. This will allocate payments to linked customer bills.`}
        confirmText="Verify & Mark Complete"
        isDanger={false}
      />

      {/* CONFIRMATION MODAL FOR DELETION */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, payment: null })}
        onConfirm={handleDeleteConfirm}
        title={`Delete Payment Receipt ${deleteModal.payment?.receiptNumber}`}
        message="Are you sure you want to delete this record?"
        confirmText="Delete"
        type="delete"
      />

    </div>
  );
};
