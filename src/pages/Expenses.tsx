import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Expense, ExpenseCategory, PaymentMethod, BranchId } from '../types';
import { formatPKR, formatDate } from '../utils/formatters';
import { Modal } from '../components/common/Modal';
import { CurrencyInput } from '../components/common/CurrencyInput';
import { ProofViewerModal } from '../components/common/ProofViewerModal';
import { FileUpload } from '../components/common/FileUpload';
import { ProofBadge } from '../components/common/ProofBadge';
import { WhatsAppShareModal } from '../components/common/WhatsAppShareModal';
import { formatExpenseWAMessage } from '../utils/whatsappHelper';
import { 
  Wallet, 
  Plus, 
  Search, 
  Filter, 
  Eye, 
  Image as ImageIcon,
  MessageCircle,
  Zap,
  Flame as GasIcon,
  Users,
  Home,
  Truck,
  Wrench,
  Package,
  Fuel,
  Building,
  Cog,
  FileText,
  X,
  Download,
  Share2,
  ArrowUpDown,
  MessageSquare,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { Pagination } from '../components/common/Pagination';
import { generateExpensePDF, downloadPDFDirect } from '../utils/pdfGenerator';

export const Expenses: React.FC = () => {
  const { 
    expenses, 
    addExpense, 
    updateExpense,
    softDeleteExpense,
    branches, 
    selectedBranchId, 
    companyProfile
  } = useApp();

  // Sorting & Pagination State
  const [dateSortOrder, setDateSortOrder] = useState<'desc' | 'asc'>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; expense: Expense | null }>({ isOpen: false, expense: null });
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [proofModal, setProofModal] = useState<{ isOpen: boolean; url?: string; docNo?: string }>({ isOpen: false });

  // WhatsApp Share State
  const [isWAModalOpen, setIsWAModalOpen] = useState(false);
  const [waData, setWaData] = useState<{
    phone: string;
    message: string;
    partyName: string;
    refNumber: string;
  }>({ phone: '', message: '', partyName: '', refNumber: '' });

  // Advanced Filters State
  const [showFilters, setShowFilters] = useState(false);
  const [payeeQuery, setPayeeQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minAmount, setMinAmount] = useState<number>(0);
  const [maxAmount, setMaxAmount] = useState<number>(0);

  // Form State
  const [title, setTitle] = useState<string>('');
  const [category, setCategory] = useState<ExpenseCategory>('Electricity');
  const [amount, setAmount] = useState<number>(0);
  const [expenseDate, setExpenseDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [expenseTime, setExpenseTime] = useState<string>(() => new Date().toTimeString().slice(0, 5));
  const [branchId, setBranchId] = useState<BranchId>(
    selectedBranchId !== 'all' ? (selectedBranchId as BranchId) : 'b1'
  );
  const [paidTo, setPaidTo] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Bank Transfer');
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [proofUrl, setProofUrl] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const expenseCategories: { name: ExpenseCategory; icon: any }[] = [
    { name: 'Electricity', icon: Zap },
    { name: 'Gas', icon: GasIcon },
    { name: 'Salaries', icon: Users },
    { name: 'Rent', icon: Home },
    { name: 'Transport', icon: Truck },
    { name: 'Maintenance', icon: Wrench },
    { name: 'Packaging', icon: Package },
    { name: 'Fuel', icon: Fuel },
    { name: 'Office Expenses', icon: Building },
    { name: 'Machinery / Repairs', icon: Cog },
    { name: 'Other', icon: FileText },
  ];

  const clearFilters = () => {
    setCategoryFilter('all');
    setPayeeQuery('');
    setBranchFilter('all');
    setStartDate('');
    setEndDate('');
    setMinAmount(0);
    setMaxAmount(0);
  };

  const activeFiltersCount = [
    categoryFilter !== 'all',
    payeeQuery.trim() !== '',
    branchFilter !== 'all',
    startDate !== '',
    endDate !== '',
    minAmount > 0,
    maxAmount > 0
  ].filter(Boolean).length;

  const handleOpenWAShare = (exp: Expense) => {
    const branch = branches.find(b => b.id === exp.branchId);
    const msg = formatExpenseWAMessage({
      expenseNumber: exp.expenseNumber,
      title: exp.title,
      category: exp.category,
      date: exp.expenseDate,
      amount: exp.amount,
      paidTo: exp.paidTo,
      paymentMethod: exp.paymentMethod,
      branchName: branch?.name || 'Main Factory'
    });

    setWaData({
      phone: '',
      message: msg,
      partyName: exp.paidTo,
      refNumber: exp.expenseNumber
    });
    setIsWAModalOpen(true);
  };

  const openAddModal = () => {
    resetForm();
    setEditingExpense(null);
    setIsModalOpen(true);
  };

  const openEditModal = (exp: Expense) => {
    setEditingExpense(exp);
    setTitle(exp.title);
    setCategory(exp.category);
    setAmount(exp.amount);
    setExpenseDate(exp.expenseDate);
    setExpenseTime(exp.expenseTime || (exp.createdAt?.includes('T') ? exp.createdAt.slice(11, 16) : new Date().toTimeString().slice(0, 5)));
    setBranchId(exp.branchId);
    setPaidTo(exp.paidTo);
    setPaymentMethod(exp.paymentMethod);
    setReferenceNo(exp.referenceNo || '');
    setProofUrl(exp.proofUrl || '');
    setNotes(exp.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || amount <= 0) return;

    if (editingExpense) {
      const res = updateExpense(editingExpense.id, {
        title: title.trim(),
        category,
        amount,
        expenseDate,
        expenseTime: expenseTime || undefined,
        branchId,
        paidTo: paidTo.trim() || 'Vendor',
        paymentMethod,
        referenceNo: referenceNo.trim() || undefined,
        proofUrl: proofUrl.trim() || undefined,
        proofStatus: proofUrl ? 'Proof Attached' : 'Not Required',
        notes: notes.trim() || undefined
      });
      if (res.success) {
        setActionFeedback({ type: 'success', message: res.message });
      } else {
        setActionFeedback({ type: 'error', message: res.message });
      }
      if (selectedExpense?.id === editingExpense.id) {
        setSelectedExpense(prev => prev ? {
          ...prev,
          title: title.trim(),
          category,
          amount,
          expenseDate,
          expenseTime: expenseTime || undefined,
          branchId,
          paidTo: paidTo.trim() || 'Vendor',
          paymentMethod,
          referenceNo: referenceNo.trim() || undefined,
          proofUrl: proofUrl.trim() || undefined,
          proofStatus: proofUrl ? 'Proof Attached' : 'Not Required',
          notes: notes.trim() || undefined
        } : null);
      }
    } else {
      const newExp = addExpense({
        title: title.trim(),
        category,
        amount,
        expenseDate,
        expenseTime: expenseTime || undefined,
        branchId,
        paidTo: paidTo.trim() || 'Vendor',
        paymentMethod,
        referenceNo: referenceNo.trim() || undefined,
        proofUrl: proofUrl.trim() || undefined,
        proofStatus: proofUrl ? 'Proof Attached' : 'Proof Missing',
        notes: notes.trim() || undefined
      });
      setActionFeedback({ type: 'success', message: `Expense voucher ${newExp.expenseNumber} recorded successfully.` });
    }

    setIsModalOpen(false);
    setEditingExpense(null);
    resetForm();
  };

  const handleDeleteConfirm = () => {
    if (!deleteModal.expense) return;
    const res = softDeleteExpense(deleteModal.expense.id);
    if (res.success) {
      setActionFeedback({ type: 'success', message: res.message });
      if (selectedExpense?.id === deleteModal.expense.id) {
        setSelectedExpense(null);
      }
    } else {
      setActionFeedback({ type: 'error', message: res.message });
    }
    setDeleteModal({ isOpen: false, expense: null });
  };

  const resetForm = () => {
    setTitle('');
    setAmount(0);
    setExpenseTime(new Date().toTimeString().slice(0, 5));
    setPaidTo('');
    setReferenceNo('');
    setProofUrl('');
    setNotes('');
  };

  // Filter expenses (excluding soft-deleted)
  const activeExpenses = expenses.filter(exp => !exp.isDeleted);

  const filteredExpenses = activeExpenses.filter(exp => {
    if (selectedBranchId !== 'all' && exp.branchId !== selectedBranchId) return false;
    if (branchFilter !== 'all' && exp.branchId !== branchFilter) return false;
    if (categoryFilter !== 'all' && exp.category !== categoryFilter) return false;
    if (startDate && exp.expenseDate < startDate) return false;
    if (endDate && exp.expenseDate > endDate) return false;
    if (minAmount > 0 && exp.amount < minAmount) return false;
    if (maxAmount > 0 && exp.amount > maxAmount) return false;

    if (payeeQuery.trim()) {
      const q = payeeQuery.toLowerCase().trim();
      if (!exp.paidTo.toLowerCase().includes(q)) return false;
    }

    return true;
  });

  const totalExpenseSum = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Date Sorting
  const sortedExpenses = [...filteredExpenses].sort((a, b) => {
    const timeA = new Date(a.expenseDate).getTime();
    const timeB = new Date(b.expenseDate).getTime();
    return dateSortOrder === 'desc' ? timeB - timeA : timeA - timeB;
  });

  const totalRecords = sortedExpenses.length;
  const paginatedExpenses = sortedExpenses.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleDownloadPDF = (expense: Expense) => {
    const doc = generateExpensePDF(expense, companyProfile);
    downloadPDFDirect(doc, `Expense-${expense.expenseNumber}.pdf`);
  };

  const handleSharePDF = (expense: Expense) => {
    handleOpenWAShare(expense);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Wallet className="w-6 h-6 text-rose-600 dark:text-rose-400" />
            Factory Operating Expenses
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Track daily factory utility bills, staff payroll, transport, machinery repairs, and packaging overheads.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-md flex items-center gap-2 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Record New Expense
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

      {/* Expense Summary Header Cards */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <span className="text-xs text-slate-500 font-semibold block uppercase tracking-wider">Filtered Total Expenses</span>
            <span className="text-3xl font-extrabold text-rose-600 dark:text-rose-400 mt-1 block">
              {formatPKR(totalExpenseSum)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(prev => !prev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
                showFilters || activeFiltersCount > 0
                  ? 'bg-rose-50 border-rose-300 text-rose-700 dark:bg-rose-950/60 dark:border-rose-700 dark:text-rose-300'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              Advanced Filters
              {activeFiltersCount > 0 && (
                <span className="px-1.5 py-0.2 bg-rose-600 text-white rounded-full text-[10px]">
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
              Showing <span className="font-bold text-slate-900 dark:text-white">{filteredExpenses.length}</span> Expenses
            </div>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 border-t border-slate-100 dark:border-slate-800 pt-3">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              categoryFilter === 'all'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            All Categories ({expenses.length})
          </button>
          {expenseCategories.map(cat => (
            <button
              key={cat.name}
              onClick={() => setCategoryFilter(cat.name)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                categoryFilter === cat.name
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Collapsible Advanced Filters Drawer */}
        {showFilters && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs animate-in fade-in">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Paid To (Payee)
              </label>
              <input
                type="text"
                placeholder="e.g. LESCO / Staff Payroll"
                value={payeeQuery}
                onChange={(e) => setPayeeQuery(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
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
                Expense Date From
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
                Expense Date To
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

      {/* Expenses Table */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden space-y-3">
        {/* Table Top Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
          <div className="text-slate-500 font-medium">
            Showing <span className="font-semibold text-slate-800 dark:text-slate-200">Factory Expenses</span> ({totalRecords} records found)
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDateSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-xs"
              title="Toggle Date Sort Order"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span>Date: {dateSortOrder === 'desc' ? 'Newest First' : 'Oldest First'}</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-2.5">Expense #</th>
                <th className="p-2.5">Expense Title & Description</th>
                <th className="p-2.5">Category</th>
                <th className="p-2.5">Date</th>
                <th className="p-2.5">Branch</th>
                <th className="p-2.5">Paid To</th>
                <th className="p-2.5">Proof</th>
                <th className="p-2.5 text-right">Amount (PKR)</th>
                <th className="p-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedExpenses.length > 0 ? (
                paginatedExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-2.5 font-mono font-bold text-rose-600 dark:text-rose-400">
                      {exp.expenseNumber}
                    </td>
                    <td className="p-2.5 font-semibold text-slate-900 dark:text-white max-w-xs truncate">
                      {exp.title}
                      {exp.notes && <span className="block text-[10px] text-slate-400 font-normal">{exp.notes}</span>}
                    </td>
                    <td className="p-2.5">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800 whitespace-nowrap">
                        {exp.category}
                      </span>
                    </td>
                    <td className="p-2.5 text-slate-500 whitespace-nowrap">
                      {formatDate(exp.expenseDate)}
                    </td>
                    <td className="p-2.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {branches.find(b => b.id === exp.branchId)?.name}
                    </td>
                    <td className="p-2.5 text-slate-700 dark:text-slate-300">
                      {exp.paidTo}
                    </td>
                    <td className="p-2.5">
                      <ProofBadge
                        status={exp.proofStatus || (exp.proofUrl ? 'Proof Attached' : 'Proof Missing')}
                        proofUrl={exp.proofUrl}
                        onViewProof={() => setProofModal({ isOpen: true, url: exp.proofUrl, docNo: exp.expenseNumber })}
                      />
                    </td>
                    <td className="p-2.5 text-right font-extrabold text-rose-600 dark:text-rose-400 text-sm whitespace-nowrap">
                      {formatPKR(exp.amount)}
                    </td>
                    <td className="p-2.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(exp)}
                          className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/60 transition-colors"
                          title="Edit Expense"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteModal({ isOpen: true, expense: exp })}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors"
                          title="Delete Expense"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDownloadPDF(exp)}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors"
                          title="Generate / Download PDF Voucher"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleSharePDF(exp)}
                          className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition-colors"
                          title="Message on WhatsApp"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setSelectedExpense(exp)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    No factory expense claims match your search.
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

      {/* CREATE / EDIT EXPENSE MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingExpense(null);
        }}
        title={editingExpense ? `Edit Expense Voucher ${editingExpense.expenseNumber}` : "Record Factory Operating Expense"}
        subtitle={editingExpense ? "Update expense details, amount, proof, and notes" : "Operational overheads, electricity, salaries, transport & maintenance"}
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Expense Title / Description *
            </label>
            <input
              type="text"
              placeholder="e.g. Kot Lakhpat Main Factory Electricity Bill - October"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                {expenseCategories.map(cat => (
                  <option key={cat.name} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Amount (PKR) *
              </label>
              <CurrencyInput
                value={amount}
                onChange={setAmount}
                placeholder="0"
                prefix="Rs."
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Expense Date *
                </label>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Expense Time
                </label>
                <input
                  type="time"
                  value={expenseTime}
                  onChange={(e) => setExpenseTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Branch *
              </label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value as BranchId)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Paid To (Vendor / Person)
              </label>
              <input
                type="text"
                placeholder="e.g. LESCO / Staff Payroll"
                value={paidTo}
                onChange={(e) => setPaidTo(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                {['Bank Transfer', 'Cash', 'Cheque', 'Online Transfer', 'JazzCash', 'Easypaisa', 'Other'].map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Reference / Receipt No
              </label>
              <input
                type="text"
                placeholder="e.g. LESCO-998231"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
            </div>
          </div>

          <div>
            <FileUpload
              label="Receipt / Bill Photo Proof"
              value={proofUrl}
              onChange={setProofUrl}
              helperText="Upload invoice photo, utility bill stub, or bank slip from device or camera"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Loadshedding generator backup fuel"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                setEditingExpense(null);
              }}
              className="px-4 py-2 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 text-white bg-rose-600 hover:bg-rose-700 rounded-xl font-semibold shadow-md transition-colors"
            >
              {editingExpense ? 'Update Expense' : 'Save Expense Claim'}
            </button>
          </div>
        </form>
      </Modal>

      {/* EXPENSE DETAILS MODAL */}
      {selectedExpense && (
        <Modal
          isOpen={!!selectedExpense}
          onClose={() => setSelectedExpense(null)}
          title={`Expense ${selectedExpense.expenseNumber}`}
          subtitle={`Recorded on ${formatDate(selectedExpense.expenseDate)}`}
          maxWidth="sm"
        >
          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-center">
              <span className="text-slate-500 uppercase block font-semibold text-[10px]">Claim Amount</span>
              <span className="text-2xl font-bold text-rose-700 dark:text-rose-400 mt-1 block">
                {formatPKR(selectedExpense.amount)}
              </span>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between py-1 border-b">
                <span className="text-slate-500">Title:</span>
                <span className="font-semibold">{selectedExpense.title}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-slate-500">Category:</span>
                <span className="font-semibold text-rose-600">{selectedExpense.category}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-slate-500">Paid To:</span>
                <span>{selectedExpense.paidTo}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-slate-500">Method:</span>
                <span>{selectedExpense.paymentMethod}</span>
              </div>
              <div className="flex justify-between py-1 border-b">
                <span className="text-slate-500">Proof Status:</span>
                <ProofBadge
                  status={selectedExpense.proofStatus || (selectedExpense.proofUrl ? 'Proof Attached' : 'Proof Missing')}
                  proofUrl={selectedExpense.proofUrl}
                  onViewProof={() => setProofModal({ isOpen: true, url: selectedExpense.proofUrl, docNo: selectedExpense.expenseNumber })}
                />
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const toEdit = selectedExpense;
                    setSelectedExpense(null);
                    openEditModal(toEdit);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1 hover:bg-slate-200 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const toDelete = selectedExpense;
                    setSelectedExpense(null);
                    setDeleteModal({ isOpen: true, expense: toDelete });
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1 hover:bg-rose-100 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadPDF(selectedExpense)}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-semibold flex items-center gap-1.5 hover:bg-rose-700 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> PDF
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleOpenWAShare(selectedExpense);
                    setSelectedExpense(null);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold flex items-center gap-1.5 hover:bg-emerald-700 transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* WHATSAPP SHARE MODAL */}
      <WhatsAppShareModal
        isOpen={isWAModalOpen}
        onClose={() => setIsWAModalOpen(false)}
        defaultPhone={waData.phone}
        defaultMessage={waData.message}
        title="Share Expense Voucher"
        recipientLabel={waData.partyName}
        referenceNumber={waData.refNumber}
      />

      {/* PROOF VIEWER MODAL */}
      <ProofViewerModal
        isOpen={proofModal.isOpen}
        onClose={() => setProofModal({ isOpen: false })}
        title="Expense Receipt Attachment"
        proofUrl={proofModal.url}
        documentNumber={proofModal.docNo}
      />

      {/* CONFIRMATION MODAL FOR DELETION */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, expense: null })}
        onConfirm={handleDeleteConfirm}
        type="delete"
        title="Delete Expense Voucher"
        message="Are you sure you want to delete this record?"
        confirmText="Delete"
      />

    </div>
  );
};
