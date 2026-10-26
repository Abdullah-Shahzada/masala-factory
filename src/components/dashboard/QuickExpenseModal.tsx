import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { CurrencyInput } from '../common/CurrencyInput';
import { useApp } from '../../context/AppContext';
import { ExpenseCategory, PaymentMethod, BranchId } from '../../types';
import { Wallet, AlertCircle } from 'lucide-react';

interface QuickExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickExpenseModal: React.FC<QuickExpenseModalProps> = ({ isOpen, onClose }) => {
  const { 
    addExpense, 
    branches, 
    selectedBranchId 
  } = useApp();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Electricity');
  const [amount, setAmount] = useState<number>(0);
  const [expenseDate, setExpenseDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [branchId, setBranchId] = useState<BranchId>(
    selectedBranchId !== 'all' ? (selectedBranchId as BranchId) : 'b1'
  );
  const [paidTo, setPaidTo] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Bank Transfer');
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Sync selected branch when modal opens
  React.useEffect(() => {
    if (isOpen && selectedBranchId !== 'all') {
      setBranchId(selectedBranchId as BranchId);
    }
  }, [isOpen, selectedBranchId]);

  const expenseCategories: ExpenseCategory[] = [
    'Electricity', 'Gas', 'Salaries', 'Rent', 'Transport', 
    'Maintenance', 'Packaging', 'Fuel', 'Office Expenses', 
    'Machinery / Repairs', 'Other'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMsg('');

    if (!title.trim()) {
      setErrorMsg('Expense title / description is required.');
      return;
    }
    if (amount <= 0) {
      setErrorMsg('Expense amount must be greater than zero.');
      return;
    }

    setIsSubmitting(true);

    addExpense({
      title: title.trim(),
      category,
      amount,
      expenseDate,
      branchId,
      paidTo: paidTo.trim() || 'Vendor',
      paymentMethod,
      referenceNo: referenceNo.trim() || undefined,
      notes: notes.trim() || undefined
    });

    setIsSubmitting(false);
    onClose();
    resetForm();
  };

  const resetForm = () => {
    setTitle('');
    setAmount(0);
    setPaidTo('');
    setReferenceNo('');
    setNotes('');
    setErrorMsg('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Quick Action — Record Factory Expense"
      subtitle="Adds factory operational overhead to shared expenses"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {errorMsg}
          </div>
        )}

        <div>
          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Expense Title / Description *
          </label>
          <input
            type="text"
            placeholder="e.g. Factory Electricity Bill - October"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            required
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Category *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              {expenseCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Expense Amount (PKR) *
            </label>
            <CurrencyInput
              value={amount}
              onChange={setAmount}
              placeholder="e.g. 145000"
              prefix="Rs."
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Expense Date *
            </label>
            <input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Branch *
            </label>
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value as BranchId)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Paid To (Payee)
            </label>
            <input
              type="text"
              placeholder="e.g. LESCO / Staff Payroll"
              value={paidTo}
              onChange={(e) => setPaidTo(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              {['Bank Transfer', 'Cash', 'Cheque', 'Online Transfer', 'JazzCash', 'Easypaisa', 'Other'].map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
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
            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-slate-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Notes
          </label>
          <input
            type="text"
            placeholder="e.g. Generator diesel fuel allocation"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-700 bg-slate-100 dark:bg-slate-800 dark:text-slate-300 rounded-xl"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 text-white bg-rose-600 hover:bg-rose-700 rounded-xl font-semibold shadow-md disabled:opacity-50"
          >
            Save Expense
          </button>
        </div>
      </form>
    </Modal>
  );
};
