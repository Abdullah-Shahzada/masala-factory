import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { PaymentScheduleItem, ScheduleType, ScheduleStatus, BranchId } from '../types';
import { formatPKR, formatDate } from '../utils/formatters';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { CurrencyInput } from '../components/common/CurrencyInput';
import { 
  CalendarClock, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Plus, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Filter,
  Building2,
  Bell,
  X,
  MessageCircle,
  Layers,
  Trash2,
  Edit3,
  RotateCcw,
  Lock
} from 'lucide-react';
import { WhatsAppShareModal } from '../components/common/WhatsAppShareModal';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { formatScheduleReminderWAMessage } from '../utils/whatsappHelper';
import { PartyCombobox } from '../components/common/PartyCombobox';
import { Pagination } from '../components/common/Pagination';

export const PaymentSchedule: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTabParam = searchParams.get('tab') === 'pay' ? 'ToPay' : 'ToReceive';
  const [activeTab, setActiveTab] = useState<ScheduleType>(activeTabParam);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  useEffect(() => {
    const tab = searchParams.get('tab') === 'pay' ? 'ToPay' : 'ToReceive';
    setActiveTab(tab);
    setCurrentPage(1);
  }, [searchParams]);

  const handleTabChange = (tab: ScheduleType) => {
    setActiveTab(tab);
    setCurrentPage(1);
    setSearchParams({ tab: tab === 'ToPay' ? 'pay' : 'receive' });
  };

  const { 
    scheduleItems, 
    addScheduleItem, 
    addScheduleWithInstallments,
    updateScheduleStatus, 
    updateScheduleItem,
    createAdditionalSchedule,
    parties, 
    branches, 
    selectedBranchId 
  } = useApp();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Password verification modal for status transition (Complete / Reopen)
  const [passwordModal, setPasswordModal] = useState<{
    isOpen: boolean;
    itemId: string;
    targetStatus: ScheduleStatus;
    title: string;
    description: string;
  }>({
    isOpen: false,
    itemId: '',
    targetStatus: 'Completed',
    title: '',
    description: ''
  });

  // Edit Schedule Modal State
  const [editingItem, setEditingItem] = useState<PaymentScheduleItem | null>(null);
  const [editPartyId, setEditPartyId] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editAmount, setEditAmount] = useState(0);
  const [editNotes, setEditNotes] = useState('');
  const [editBranchId, setEditBranchId] = useState<BranchId>('b1');
  const [editError, setEditError] = useState('');

  // Advanced Filters State
  const [showFilters, setShowFilters] = useState(false);
  const [partyFilter, setPartyFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minAmount, setMinAmount] = useState<number>(0);
  const [maxAmount, setMaxAmount] = useState<number>(0);

  // New Schedule Item Form State
  const [partyId, setPartyId] = useState<string>('');
  const [partyName, setPartyName] = useState<string>('');
  const [relatedBillNumber, setRelatedBillNumber] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [scheduledAmount, setScheduledAmount] = useState<number>(0);
  const [branchId, setBranchId] = useState<BranchId>(
    selectedBranchId !== 'all' ? (selectedBranchId as BranchId) : 'b1'
  );
  const [notes, setNotes] = useState<string>('');

  // Multi-Installment State
  const [isMultiInstallment, setIsMultiInstallment] = useState(false);
  const [installmentRows, setInstallmentRows] = useState<Array<{ amount: number; dueDate: string; notes: string }>>([
    { amount: 0, dueDate: new Date().toISOString().split('T')[0], notes: 'Installment 1' },
    { amount: 0, dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0], notes: 'Installment 2' }
  ]);

  // WhatsApp Share State
  const [isWAModalOpen, setIsWAModalOpen] = useState(false);
  const [waData, setWaData] = useState<{
    phone: string;
    message: string;
    partyName: string;
    refNumber: string;
  }>({ phone: '', message: '', partyName: '', refNumber: '' });

  const clearFilters = () => {
    setStatusFilter('all');
    setPartyFilter('all');
    setBranchFilter('all');
    setStartDate('');
    setEndDate('');
    setMinAmount(0);
    setMaxAmount(0);
    setCurrentPage(1);
  };

  const activeFiltersCount = [
    statusFilter !== 'all',
    partyFilter !== 'all',
    branchFilter !== 'all',
    startDate !== '',
    endDate !== '',
    minAmount > 0,
    maxAmount > 0
  ].filter(Boolean).length;

  const totalInstallmentSum = installmentRows.reduce((sum, r) => sum + r.amount, 0);

  const addInstallmentRow = () => {
    const nextDate = new Date(Date.now() + (installmentRows.length + 1) * 15 * 86400000).toISOString().split('T')[0];
    setInstallmentRows(prev => [
      ...prev,
      { amount: 0, dueDate: nextDate, notes: `Installment ${prev.length + 1}` }
    ]);
  };

  const removeInstallmentRow = (index: number) => {
    if (installmentRows.length <= 1) return;
    setInstallmentRows(prev => prev.filter((_, i) => i !== index));
  };

  const updateInstallmentRow = (index: number, field: string, value: any) => {
    setInstallmentRows(prev => prev.map((row, i) => i === index ? { ...row, [field]: value } : row));
  };

  const handleOpenWAShare = (item: PaymentScheduleItem) => {
    const party = parties.find(p => p.id === item.partyId || p.name === item.partyName);
    const branch = branches.find(b => b.id === item.branchId);
    const msg = formatScheduleReminderWAMessage({
      partyName: item.partyName,
      type: item.type === 'ToReceive' ? 'Customer Receivable' : 'Supplier Payable',
      relatedBillNumber: item.relatedBillNumber,
      dueDate: item.dueDate,
      amount: item.remainingAmount,
      branchName: branch?.name || 'Main Factory',
      installmentInfo: item.installmentNo ? `Installment #${item.installmentNo}` : undefined
    });

    setWaData({
      phone: party?.phone || party?.whatsapp || '',
      message: msg,
      partyName: item.partyName,
      refNumber: item.relatedBillNumber || `SCH-${item.id.slice(-4)}`
    });
    setIsWAModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyName && !partyId) return;

    let partyDisplayName = partyName;
    if (partyId) {
      const p = parties.find(pt => pt.id === partyId);
      if (p) partyDisplayName = p.name;
    }

    if (isMultiInstallment) {
      if (installmentRows.length === 0 || totalInstallmentSum <= 0) {
        alert('Please specify at least one valid installment amount.');
        return;
      }

      addScheduleWithInstallments(
        {
          type: activeTab,
          partyId: partyId || `custom-${Date.now()}`,
          partyName: partyDisplayName,
          relatedBillNumber: relatedBillNumber.trim() || undefined,
          dueDate: installmentRows[0].dueDate,
          scheduledAmount: totalInstallmentSum,
          paidReceivedAmount: 0,
          remainingAmount: totalInstallmentSum,
          branchId,
          status: 'Upcoming',
          notes: notes.trim() || undefined
        },
        installmentRows.map(r => ({
          amount: r.amount,
          dueDate: r.dueDate,
          notes: r.notes
        }))
      );
    } else {
      addScheduleItem({
        type: activeTab,
        partyId: partyId || `custom-${Date.now()}`,
        partyName: partyDisplayName,
        relatedBillNumber: relatedBillNumber.trim() || undefined,
        dueDate,
        scheduledAmount,
        paidReceivedAmount: 0,
        remainingAmount: scheduledAmount,
        branchId,
        status: 'Upcoming',
        notes: notes.trim() || undefined
      });
    }

    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setPartyId('');
    setPartyName('');
    setRelatedBillNumber('');
    setScheduledAmount(0);
    setNotes('');
  };

  const handlePromptComplete = (item: PaymentScheduleItem) => {
    setPasswordModal({
      isOpen: true,
      itemId: item.id,
      targetStatus: 'Completed',
      title: 'Complete Schedule Reminder',
      description: `Confirm completing schedule reminder for ${item.partyName} (PKR ${formatPKR(item.remainingAmount)})?`
    });
  };

  const handlePromptReopen = (item: PaymentScheduleItem) => {
    setPasswordModal({
      isOpen: true,
      itemId: item.id,
      targetStatus: 'Upcoming',
      title: 'Reopen Schedule Reminder',
      description: `Confirm reopening schedule reminder for ${item.partyName}? The remaining balance will become active again.`
    });
  };

  const handleConfirmStatus = () => {
    updateScheduleStatus(passwordModal.itemId, passwordModal.targetStatus);
    setPasswordModal({ isOpen: false, itemId: '', targetStatus: 'Completed', title: '', description: '' });
  };

  const handleOpenEdit = (item: PaymentScheduleItem) => {
    setEditingItem(item);
    setEditPartyId(item.partyId || '');
    setEditDueDate(item.dueDate);
    setEditAmount(item.scheduledAmount);
    setEditNotes(item.notes || '');
    setEditBranchId(item.branchId);
    setEditError('');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    if (editAmount <= 0) {
      setEditError('Scheduled amount must be greater than zero.');
      return;
    }
    const selectedParty = parties.find(p => p.id === editPartyId);
    const res = updateScheduleItem(editingItem.id, {
      partyId: editPartyId || editingItem.partyId,
      partyName: selectedParty ? selectedParty.name : editingItem.partyName,
      partyPhone: selectedParty ? selectedParty.phone : editingItem.partyPhone,
      dueDate: editDueDate,
      scheduledAmount: editAmount,
      notes: editNotes.trim() || undefined,
      branchId: editBranchId
    });
    if (!res.success) {
      setEditError(res.message);
      return;
    }
    setEditingItem(null);
  };

  // Filter items
  const filteredSchedule = scheduleItems.filter(item => {
    if (item.type !== activeTab) return false;
    if (selectedBranchId !== 'all' && item.branchId !== selectedBranchId) return false;
    if (branchFilter !== 'all' && item.branchId !== branchFilter) return false;
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (partyFilter !== 'all' && item.partyId !== partyFilter) return false;
    if (startDate && item.dueDate < startDate) return false;
    if (endDate && item.dueDate > endDate) return false;
    if (minAmount > 0 && item.remainingAmount < minAmount) return false;
    if (maxAmount > 0 && item.remainingAmount > maxAmount) return false;
    return true;
  });

  const totalRecords = filteredSchedule.length;
  const paginatedSchedule = filteredSchedule.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const dueTodayCount = filteredSchedule.filter(i => i.status === 'Due Today').length;
  const overdueCount = filteredSchedule.filter(i => i.status === 'Overdue').length;
  const totalRemaining = filteredSchedule.reduce((sum, i) => sum + i.remainingAmount, 0);

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarClock className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            Payment Schedules & Due Dates
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Track money expected to receive from customers and scheduled payables to suppliers and utilities.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md flex items-center gap-2 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Schedule Reminder
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => handleTabChange('ToReceive')}
          className={`flex items-center gap-2 px-6 py-3 font-semibold text-xs border-b-2 transition-all ${
            activeTab === 'ToReceive'
              ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
          Payments to Receive (Customer Receivables)
        </button>

        <button
          onClick={() => handleTabChange('ToPay')}
          className={`flex items-center gap-2 px-6 py-3 font-semibold text-xs border-b-2 transition-all ${
            activeTab === 'ToPay'
              ? 'border-amber-600 text-amber-700 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/30'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <ArrowUpRight className="w-4 h-4 text-amber-500" />
          Payments to Pay (Supplier Payables)
        </button>
      </div>

      {/* Status Summary & Filter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium block">Total Scheduled</span>
            <span className="text-lg font-bold text-slate-900 dark:text-white mt-0.5 block">{formatPKR(totalRemaining)}</span>
          </div>
          <Clock className="w-6 h-6 text-slate-400" />
        </div>

        <div className="p-4 rounded-xl bg-amber-50/80 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 flex items-center justify-between">
          <div>
            <span className="text-xs text-amber-700 dark:text-amber-400 font-bold block">Due Today</span>
            <span className="text-lg font-extrabold text-amber-800 dark:text-amber-300 mt-0.5 block">{dueTodayCount} Items</span>
          </div>
          <Bell className="w-6 h-6 text-amber-600 animate-bounce" />
        </div>

        <div className="p-4 rounded-xl bg-rose-50/80 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/80 flex items-center justify-between">
          <div>
            <span className="text-xs text-rose-700 dark:text-rose-400 font-bold block">Overdue Items</span>
            <span className="text-lg font-extrabold text-rose-800 dark:text-rose-300 mt-0.5 block">{overdueCount} Items</span>
          </div>
          <AlertTriangle className="w-6 h-6 text-rose-600" />
        </div>

        {/* Filter Dropdown & Toggle */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Filters
            </span>
            <span className="text-[11px] text-slate-400">
              {statusFilter !== 'all' || partyFilter !== 'all' || branchFilter !== 'all' || startDate || endDate || minAmount > 0 || maxAmount > 0 ? 'Active' : 'Default'}
            </span>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              showFilters || (statusFilter !== 'all' || partyFilter !== 'all' || branchFilter !== 'all' || startDate || endDate || minAmount > 0 || maxAmount > 0)
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            {showFilters ? 'Hide Filters' : 'Advanced Filters'}
          </button>
        </div>
      </div>

      {/* Advanced Filter Panel */}
      {showFilters && (
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Filter className="w-4 h-4 text-emerald-600" /> Filter Schedule Items
            </span>
            <button
              onClick={clearFilters}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" /> Clear Filters
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="all">All Statuses</option>
                <option value="Due Today">Due Today</option>
                <option value="Overdue">Overdue</option>
                <option value="Upcoming">Upcoming</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Party / Payee</label>
              <select
                value={partyFilter}
                onChange={(e) => setPartyFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="all">All Parties</option>
                {parties.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">From Due Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
              </input>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">To Due Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
              </input>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Min Remaining Amount (PKR)</label>
              <CurrencyInput
                value={minAmount}
                onChange={setMinAmount}
                placeholder="0"
                prefix="Rs."
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Max Remaining Amount (PKR)</label>
              <CurrencyInput
                value={maxAmount}
                onChange={setMaxAmount}
                placeholder="No max"
                prefix="Rs."
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Factory Branch</label>
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value as 'all' | BranchId)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="all">All Branches</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Table */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-3">Party / Payee</th>
                <th className="p-3">Related Bill</th>
                <th className="p-3">Due Date</th>
                <th className="p-3">Branch</th>
                <th className="p-3 text-right">Scheduled Amount</th>
                <th className="p-3 text-right">Remaining</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedSchedule.length > 0 ? (
                paginatedSchedule.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="p-3 font-semibold text-slate-900 dark:text-white">
                      {item.partyName}
                      {item.notes && <span className="block text-[10px] text-slate-400 font-normal">{item.notes}</span>}
                    </td>
                    <td className="p-3 font-mono">
                      {item.relatedBillNumber || '-'}
                    </td>
                    <td className="p-3 font-medium whitespace-nowrap">
                      {formatDate(item.dueDate)}
                    </td>
                    <td className="p-3 text-slate-500">
                      {branches.find(b => b.id === item.branchId)?.name}
                    </td>
                    <td className="p-3 text-right font-bold text-slate-900 dark:text-white">
                      {formatPKR(item.scheduledAmount)}
                    </td>
                    <td className="p-3 text-right font-bold text-rose-600 dark:text-rose-400">
                      {formatPKR(item.remainingAmount)}
                    </td>
                    <td className="p-3 text-center">
                      <StatusBadge status={item.status} size="sm" />
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenWAShare(item)}
                          title="Message on WhatsApp"
                          className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleOpenEdit(item)}
                          title="Edit Schedule Reminder"
                          className="p-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        {item.status !== 'Completed' ? (
                          <button
                            onClick={() => handlePromptComplete(item)}
                            className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-lg transition-colors"
                          >
                            Mark Completed
                          </button>
                        ) : (
                          <button
                            onClick={() => handlePromptReopen(item)}
                            className="px-2.5 py-1 text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300 rounded-lg transition-colors flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Reopen
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No payment schedule entries match your criteria.
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

      {/* NEW SCHEDULE ENTRY MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Add ${activeTab === 'ToReceive' ? 'Payment to Receive' : 'Payment to Pay'} Schedule`}
        subtitle="Set single due date or split into multi-installment milestones"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Party / Contact
            </label>
            <PartyCombobox
              parties={parties}
              selectedPartyId={partyId}
              onSelect={(p) => {
                setPartyId(p.id);
                setPartyName(p.name);
              }}
              onClear={() => {
                setPartyId('');
                setPartyName('');
              }}
              filterType="all"
              placeholder="Search party by name or phone..."
            />
          </div>

          {!partyId && (
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Custom Payee Name (Optional if selected above)
              </label>
              <input
                type="text"
                placeholder="e.g. SNGPL Gas Utility / Custom Payee"
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                required={!partyId}
              />
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Related Bill No (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. B-1547 or SUP-882"
              value={relatedBillNumber}
              onChange={(e) => setRelatedBillNumber(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Factory Branch
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

          {/* Schedule Mode Selector: Single vs Multi-Installment */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-600" /> Payment Schedule Structure
              </span>
              <div className="flex bg-slate-200 dark:bg-slate-700 p-0.5 rounded-lg text-[11px]">
                <button
                  type="button"
                  onClick={() => setIsMultiInstallment(false)}
                  className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                    !isMultiInstallment ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Single Due Date
                </button>
                <button
                  type="button"
                  onClick={() => setIsMultiInstallment(true)}
                  className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                    isMultiInstallment ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Multiple Installments
                </button>
              </div>
            </div>

            {!isMultiInstallment ? (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    required={!isMultiInstallment}
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Scheduled Amount (PKR) *
                  </label>
                  <CurrencyInput
                    placeholder="e.g. 50,000"
                    value={scheduledAmount}
                    onChange={setScheduledAmount}
                    prefix="Rs."
                    required={!isMultiInstallment}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Define installments with separate dates and target amounts</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    Total: {formatPKR(totalInstallmentSum)}
                  </span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {installmentRows.map((inst, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                      <span className="font-bold text-slate-400 w-6 text-center">#{idx + 1}</span>
                      <div className="flex-1 grid grid-cols-12 gap-2">
                        <div className="col-span-5">
                          <input
                            type="date"
                            value={inst.dueDate}
                            onChange={(e) => updateInstallmentRow(idx, 'dueDate', e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[11px]"
                            required
                          />
                        </div>
                        <div className="col-span-4">
                          <CurrencyInput
                            value={inst.amount}
                            onChange={(val) => updateInstallmentRow(idx, 'amount', val)}
                            placeholder="Amount"
                            prefix="Rs."
                            required
                          />
                        </div>
                        <div className="col-span-3">
                          <input
                            type="text"
                            placeholder="Label / Note"
                            value={inst.notes}
                            onChange={(e) => updateInstallmentRow(idx, 'notes', e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[11px]"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeInstallmentRow(idx)}
                        disabled={installmentRows.length <= 1}
                        className="p-1 text-rose-500 hover:text-rose-700 disabled:opacity-30"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addInstallmentRow}
                  className="px-3 py-1.5 rounded-lg border border-dashed border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Another Installment
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              General Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Call manager before dispatch"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-slate-700 bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-white bg-emerald-600 rounded-xl font-semibold shadow-md"
            >
              Save Schedule Entry
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT SCHEDULE REMINDER MODAL */}
      {editingItem && (
        <Modal
          isOpen={!!editingItem}
          onClose={() => setEditingItem(null)}
          title={`Edit Schedule Reminder — ${editingItem.partyName}`}
          subtitle={`Adjust due date, scheduled amount, or branch without duplicate debt`}
          maxWidth="md"
        >
          <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
            {editError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                {editError}
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Party / Contact *
              </label>
              <PartyCombobox
                parties={parties}
                selectedPartyId={editPartyId}
                onSelect={(p) => setEditPartyId(p.id)}
                onClear={() => setEditPartyId('')}
                filterType="all"
                placeholder="Search party by name or phone..."
              />
              {editingItem.relatedBillNumber && (
                <div className="mt-2 text-right">
                  <span className="text-[10px] text-slate-400">Related Bill: </span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                    {editingItem.relatedBillNumber}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Due Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Scheduled Amount (PKR) <span className="text-rose-500">*</span>
              </label>
              <CurrencyInput
                value={editAmount}
                onChange={setEditAmount}
                placeholder="0"
                prefix="Rs."
              />
              {editingItem.paidReceivedAmount ? (
                <p className="text-[10px] text-slate-400 mt-1">
                  Already paid: {formatPKR(editingItem.paidReceivedAmount)}. Remaining will be {formatPKR(Math.max(0, editAmount - editingItem.paidReceivedAmount))}.
                </p>
              ) : null}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Factory Branch
              </label>
              <select
                value={editBranchId}
                onChange={(e) => setEditBranchId(e.target.value as BranchId)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
              >
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Notes / Memo
              </label>
              <input
                type="text"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Optional notes or reminder details"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 text-slate-700 bg-slate-100 dark:bg-slate-800 dark:text-slate-300 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl font-semibold shadow-md transition-colors"
              >
                Save Schedule Changes
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* CONFIRMATION MODAL FOR STATUS TRANSITION */}
      <ConfirmModal
        isOpen={passwordModal.isOpen}
        onClose={() => setPasswordModal({ ...passwordModal, isOpen: false })}
        onConfirm={handleConfirmStatus}
        title={passwordModal.title}
        message={passwordModal.description}
        confirmText="Confirm & Update"
        isDanger={passwordModal.targetStatus === 'Completed'}
      />

      {/* WHATSAPP SHARE MODAL */}
      <WhatsAppShareModal
        isOpen={isWAModalOpen}
        onClose={() => setIsWAModalOpen(false)}
        defaultPhone={waData.phone}
        defaultMessage={waData.message}
        title="Share Payment Schedule Reminder"
        recipientLabel={waData.partyName}
        referenceNumber={waData.refNumber}
      />

    </div>
  );
};
