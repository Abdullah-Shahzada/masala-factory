import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { CurrencyInput } from '../common/CurrencyInput';
import { InlineContactModal } from '../common/InlineContactModal';
import { InlineProductModal } from '../common/InlineProductModal';
import { useApp } from '../../context/AppContext';
import { BillItem, BranchId } from '../../types';
import { formatPKR } from '../../utils/formatters';
import { Plus, Trash2, AlertCircle, ShoppingBag, UserPlus } from 'lucide-react';

interface QuickPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickPurchaseModal: React.FC<QuickPurchaseModalProps> = ({ isOpen, onClose }) => {
  const { 
    addPurchase, 
    parties, 
    products, 
    branches, 
    selectedBranchId 
  } = useApp();

  const [supplierId, setSupplierId] = useState<string>('');
  const [billNumber, setBillNumber] = useState<string>('');
  const [billDate, setBillDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState<string>(new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]);
  const [branchId, setBranchId] = useState<BranchId>(
    selectedBranchId !== 'all' ? (selectedBranchId as BranchId) : 'b1'
  );
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Sync selected branch when modal opens
  React.useEffect(() => {
    if (isOpen && selectedBranchId !== 'all') {
      setBranchId(selectedBranchId as BranchId);
    }
  }, [isOpen, selectedBranchId]);

  // Inline Modals
  const [inlineContactOpen, setInlineContactOpen] = useState(false);
  const [inlineProductOpen, setInlineProductOpen] = useState<{ isOpen: boolean; itemIndex: number }>({ isOpen: false, itemIndex: 0 });

  const [items, setItems] = useState<Omit<BillItem, 'id'>[]>([
    {
      productId: products[0]?.id || 'prod-06',
      productName: products[0]?.name || 'Crushed Red Chilli (Stemless)',
      quantity: 5,
      unit: products[0]?.unit || '25kg Bag',
      rate: products[0]?.defaultRate || 18500,
      lineTotal: 92500
    }
  ]);

  const grandTotal = items.reduce((sum, item) => sum + item.lineTotal, 0);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMsg('');

    if (!supplierId) {
      setErrorMsg('Please select a supplier party.');
      return;
    }
    if (!billNumber.trim()) {
      setErrorMsg('Manual Supplier Bill Number is required (e.g. SUP-882).');
      return;
    }

    setIsSubmitting(true);
    const supplier = parties.find(p => p.id === supplierId);

    addPurchase({
      billNumber: billNumber.trim(),
      supplierId,
      supplierName: supplier ? supplier.name : 'Supplier',
      billDate,
      dueDate,
      branchId,
      items: items.map((i, idx) => ({ ...i, id: `pbi-${Date.now()}-${idx}` })),
      grandTotal,
      amountPaid,
      notes: notes || undefined
    });

    setIsSubmitting(false);
    onClose();
    resetForm();
  };

  const resetForm = () => {
    setSupplierId('');
    setBillNumber('');
    setAmountPaid(0);
    setNotes('');
    setErrorMsg('');
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Quick Action — Record Supplier Purchase"
        subtitle="Saves supplier purchase bill directly to shared factory state"
        maxWidth="3xl"
      >
        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Supplier *</label>
                <button
                  type="button"
                  onClick={() => setInlineContactOpen(true)}
                  className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-0.5"
                >
                  <UserPlus className="w-3 h-3" /> + New
                </button>
              </div>
              <select
                value={supplierId}
                onChange={(e) => {
                  if (e.target.value === 'ADD_NEW_CONTACT') {
                    setInlineContactOpen(true);
                  } else {
                    setSupplierId(e.target.value);
                  }
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                required
              >
                <option value="">-- Choose Supplier --</option>
                <option value="ADD_NEW_CONTACT" className="font-bold text-indigo-600">+ Add New Supplier Contact</option>
                {parties.filter(p => p.type === 'Supplier' || p.type === 'Both').map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.city})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Supplier Bill No *
              </label>
              <input
                type="text"
                placeholder="e.g. SUP-882"
                value={billNumber}
                onChange={(e) => setBillNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Bill Date *
              </label>
              <input
                type="date"
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
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
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b pb-1">
              <span className="font-bold uppercase tracking-wider text-[11px] text-slate-700 dark:text-slate-300">Items Purchased</span>
              <button
                type="button"
                onClick={addItemRow}
                className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-semibold rounded-lg text-[11px] flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Row
              </button>
            </div>

            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 items-center">
                <div className="col-span-4">
                  <select
                    value={item.productId}
                    onChange={(e) => handleProductChange(index, e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  >
                    <option value="ADD_NEW_PRODUCT" className="font-bold text-indigo-600">+ Add New Product</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <input
                    type="number"
                    min="0.1"
                    value={item.quantity}
                    onChange={(e) => handleQtyRateChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                  />
                </div>

                <div className="col-span-3">
                  <CurrencyInput
                    value={item.rate}
                    onChange={(val) => handleQtyRateChange(index, 'rate', val)}
                    placeholder="Rate"
                  />
                </div>

                <div className="col-span-2 text-right font-bold text-slate-900 dark:text-white">
                  {formatPKR(item.lineTotal)}
                </div>

                <div className="col-span-1 text-right">
                  <button
                    type="button"
                    onClick={() => removeItemRow(index)}
                    className="p-1 text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-between">
            <div className="w-1/2">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Advance Amount Paid</label>
              <CurrencyInput
                value={amountPaid}
                onChange={setAmountPaid}
                prefix="Rs."
              />
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-500 block">Grand Total: <strong className="text-slate-900 dark:text-white">{formatPKR(grandTotal)}</strong></span>
              <span className="text-xs text-slate-500 block">Outstanding: <strong className="text-rose-600 dark:text-rose-400">{formatPKR(Math.max(0, grandTotal - amountPaid))}</strong></span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl font-semibold shadow-md disabled:opacity-50"
            >
              Save Purchase
            </button>
          </div>
        </form>
      </Modal>

      {/* INLINE MODALS */}
      <InlineContactModal
        isOpen={inlineContactOpen}
        onClose={() => setInlineContactOpen(false)}
        defaultType="Supplier"
        onCreated={(newParty) => setSupplierId(newParty.id)}
      />

      <InlineProductModal
        isOpen={inlineProductOpen.isOpen}
        onClose={() => setInlineProductOpen({ isOpen: false, itemIndex: 0 })}
        onCreated={(newProd) => handleProductChange(inlineProductOpen.itemIndex, newProd.id)}
      />
    </>
  );
};
