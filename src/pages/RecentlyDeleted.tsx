import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { RecentlyDeletedItem, DeletedRecordType } from '../types';
import { formatPKR, formatDate } from '../utils/formatters';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { Modal } from '../components/common/Modal';
import { 
  Trash2, 
  RotateCcw, 
  AlertTriangle, 
  Search, 
  Filter, 
  Eye, 
  Calendar, 
  User, 
  Receipt, 
  CreditCard, 
  ShoppingBag, 
  Wallet, 
  CalendarClock, 
  ShieldAlert,
  CheckCircle2,
  Clock,
  Layers
} from 'lucide-react';

export const RecentlyDeleted: React.FC = () => {
  const { 
    recentlyDeleted, 
    restoreSalesBill, 
    permanentDeleteSalesBill,
    restorePaymentReceived,
    permanentDeletePaymentReceived,
    restorePurchase,
    permanentDeletePurchase,
    restoreExpense,
    permanentDeleteExpense,
    restoreParty,
    permanentDeleteParty,
    restoreScheduleItem,
    permanentDeleteScheduleItem,
    restoreSupplierPayment,
    permanentDeleteSupplierPayment
  } = useApp();

  const [activeTab, setActiveTab] = useState<'all' | DeletedRecordType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<RecentlyDeletedItem | null>(null);

  // Password confirmation states
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    type: 'restore' | 'permanentDelete';
    item: RecentlyDeletedItem | null;
  }>({
    isOpen: false,
    type: 'restore',
    item: null
  });

  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  const showFeedback = (text: string, isError = false) => {
    setFeedbackMessage({ text, isError });
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 4500);
  };

  // Filter items
  const filteredItems = recentlyDeleted.filter(item => {
    if (activeTab !== 'all' && item.recordType !== activeTab) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchRef = item.referenceNumber.toLowerCase().includes(q);
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchParty = item.partyName?.toLowerCase().includes(q);
      if (!matchRef && !matchTitle && !matchParty) return false;
    }
    return true;
  });

  const handleConfirmAction = () => {
    if (!actionModal.item) return;

    const { type, item } = actionModal;
    let result: { success: boolean; message: string } = { success: false, message: 'Action not supported' };

    if (type === 'restore') {
      switch (item.recordType) {
        case 'Sales Bill':
          result = restoreSalesBill(item.id);
          break;
        case 'Payment Received':
          result = restorePaymentReceived(item.id);
          break;
        case 'Purchase Bill':
          result = restorePurchase(item.id);
          break;
        case 'Expense':
          result = restoreExpense(item.id);
          break;
        case 'Contact Party':
          result = restoreParty(item.id);
          break;
        case 'Payment Schedule':
          result = restoreScheduleItem(item.id);
          break;
        case 'Supplier Payment':
          result = restoreSupplierPayment(item.id);
          break;
      }
    } else {
      switch (item.recordType) {
        case 'Sales Bill':
          result = permanentDeleteSalesBill(item.id);
          break;
        case 'Payment Received':
          result = permanentDeletePaymentReceived(item.id);
          break;
        case 'Purchase Bill':
          result = permanentDeletePurchase(item.id);
          break;
        case 'Expense':
          result = permanentDeleteExpense(item.id);
          break;
        case 'Contact Party':
          result = permanentDeleteParty(item.id);
          break;
        case 'Payment Schedule':
          result = permanentDeleteScheduleItem(item.id);
          break;
        case 'Supplier Payment':
          result = permanentDeleteSupplierPayment(item.id);
          break;
      }
    }

    if (result.success) {
      showFeedback(result.message, false);
      setActionModal({ isOpen: false, type: 'restore', item: null });
      if (selectedItem?.id === item.id) setSelectedItem(null);
    } else {
      showFeedback(result.message, true);
    }
  };

  const getRecordIcon = (type: DeletedRecordType) => {
    switch (type) {
      case 'Sales Bill': return <Receipt className="w-4 h-4 text-emerald-500" />;
      case 'Payment Received': return <CreditCard className="w-4 h-4 text-blue-500" />;
      case 'Purchase Bill': return <ShoppingBag className="w-4 h-4 text-indigo-500" />;
      case 'Expense': return <Wallet className="w-4 h-4 text-rose-500" />;
      case 'Contact Party': return <User className="w-4 h-4 text-amber-500" />;
      case 'Payment Schedule': return <CalendarClock className="w-4 h-4 text-purple-500" />;
      case 'Supplier Payment': return <CreditCard className="w-4 h-4 text-cyan-500" />;
    }
  };

  const tabOptions: Array<{ key: 'all' | DeletedRecordType; label: string; count: number }> = [
    { key: 'all', label: 'All Deleted Records', count: recentlyDeleted.length },
    { key: 'Sales Bill', label: 'Sales Bills', count: recentlyDeleted.filter(r => r.recordType === 'Sales Bill').length },
    { key: 'Payment Received', label: 'Payments Received', count: recentlyDeleted.filter(r => r.recordType === 'Payment Received').length },
    { key: 'Purchase Bill', label: 'Purchases', count: recentlyDeleted.filter(r => r.recordType === 'Purchase Bill').length },
    { key: 'Expense', label: 'Expenses', count: recentlyDeleted.filter(r => r.recordType === 'Expense').length },
    { key: 'Contact Party', label: 'Contacts', count: recentlyDeleted.filter(r => r.recordType === 'Contact Party').length },
    { key: 'Payment Schedule', label: 'Schedules', count: recentlyDeleted.filter(r => r.recordType === 'Payment Schedule').length }
  ];

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <Trash2 className="w-6 h-6 text-rose-600 dark:text-rose-400" />
              Recently Deleted & Audit Recovery
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
              {recentlyDeleted.length} in Trash
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Centralized recycle bin for soft-deleted sales bills, customer payments, supplier invoices, expenses, and contacts.
          </p>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedbackMessage && (
        <div className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center justify-between shadow-sm animate-in fade-in duration-200 ${
          feedbackMessage.isError 
            ? 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/70 dark:border-rose-900 dark:text-rose-300' 
            : 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/70 dark:border-emerald-900 dark:text-emerald-300'
        }`}>
          <div className="flex items-center gap-2">
            {feedbackMessage.isError ? <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" /> : <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />}
            <span>{feedbackMessage.text}</span>
          </div>
          <button 
            onClick={() => setFeedbackMessage(null)}
            className="text-[11px] underline opacity-80 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Tabs and Search Controls */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        
        {/* Type Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {tabOptions.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === tab.key
                  ? 'bg-slate-900 text-white dark:bg-rose-600 dark:text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === tab.key 
                  ? 'bg-white/20 text-white' 
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search deleted records by reference, title, or party..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
          />
        </div>
      </div>

      {/* Deleted Items Table */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-3">Type</th>
                <th className="p-3">Reference / ID</th>
                <th className="p-3">Record Details</th>
                <th className="p-3">Party / Contact</th>
                <th className="p-3 text-right">Amount</th>
                <th className="p-3">Deleted Date & Time</th>
                <th className="p-3">Deleted By</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <tr key={`${item.recordType}-${item.id}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {getRecordIcon(item.recordType)}
                        {item.recordType}
                      </span>
                    </td>
                    <td className="p-3 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {item.referenceNumber}
                    </td>
                    <td className="p-3 max-w-xs truncate text-slate-700 dark:text-slate-300">
                      {item.title}
                    </td>
                    <td className="p-3 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                      {item.partyName || '-'}
                    </td>
                    <td className="p-3 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {item.amount !== undefined ? formatPKR(item.amount) : '-'}
                    </td>
                    <td className="p-3 text-slate-500 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatDate(item.deletedAt)}</span>
                      </div>
                    </td>
                    <td className="p-3 text-slate-500 whitespace-nowrap text-[11px]">
                      {item.deletedBy || 'Factory Admin'}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedItem(item)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 dark:hover:text-white"
                          title="View Deleted Record Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setActionModal({ isOpen: true, type: 'restore', item })}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 transition-colors"
                          title="Restore Record"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Restore
                        </button>

                        <button
                          onClick={() => setActionModal({ isOpen: true, type: 'permanentDelete', item })}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800 flex items-center gap-1 transition-colors"
                          title="Permanently Delete (Cannot be undone)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete Forever
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    <Trash2 className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                    <p className="font-semibold text-xs">No deleted records in this category.</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Records moved to trash will appear here for recovery or permanent deletion.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL PREVIEW MODAL */}
      {selectedItem && (
        <Modal
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          title={`Deleted ${selectedItem.recordType} — ${selectedItem.referenceNumber}`}
          subtitle="Inspect record details before restoring or permanent deletion"
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600" />
              <span>This record is currently in Recently Deleted. It is hidden from active operational views until restored.</span>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Record Type</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedItem.recordType}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Reference Number</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{selectedItem.referenceNumber}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Associated Party</span>
                <span className="font-semibold text-slate-900 dark:text-white">{selectedItem.partyName || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Amount</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {selectedItem.amount !== undefined ? formatPKR(selectedItem.amount) : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Deletion Timestamp</span>
                <span className="text-slate-700 dark:text-slate-300">{formatDate(selectedItem.deletedAt)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Deleted By</span>
                <span className="text-slate-700 dark:text-slate-300">{selectedItem.deletedBy || 'Factory Admin'}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Record Summary / Payload</span>
              <pre className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-x-auto text-[11px] font-mono text-slate-800 dark:text-slate-200 max-h-48">
                {JSON.stringify(selectedItem.originalRecord, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 text-slate-700 bg-slate-100 dark:bg-slate-800 dark:text-slate-300 rounded-xl font-medium"
              >
                Close Preview
              </button>
              <button
                type="button"
                onClick={() => {
                  setActionModal({ isOpen: true, type: 'restore', item: selectedItem });
                }}
                className="px-4 py-2 text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl font-semibold flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restore Record
              </button>
              <button
                type="button"
                onClick={() => {
                  setActionModal({ isOpen: true, type: 'permanentDelete', item: selectedItem });
                }}
                className="px-4 py-2 text-white bg-rose-600 hover:bg-rose-700 rounded-xl font-semibold flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Permanent Delete
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* CONFIRMATION MODAL FOR RESTORE & PERMANENT DELETE */}
      <ConfirmModal
        isOpen={actionModal.isOpen}
        onClose={() => setActionModal({ isOpen: false, type: 'restore', item: null })}
        onConfirm={handleConfirmAction}
        type={actionModal.type === 'restore' ? 'restore' : 'permanentDelete'}
        title={
          actionModal.type === 'restore'
            ? 'Restore Record'
            : 'Permanently Delete Record'
        }
        message={
          actionModal.type === 'restore'
            ? 'Are you sure you want to restore this record?'
            : 'Are you sure you want to permanently delete this record? This action cannot be undone.'
        }
        confirmText={actionModal.type === 'restore' ? 'Restore' : 'Permanently Delete'}
      />

    </div>
  );
};
