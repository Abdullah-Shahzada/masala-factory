import React, { useState } from 'react';
import { Modal } from './Modal';
import { Product } from '../../types';
import { useApp } from '../../context/AppContext';
import { CurrencyInput } from './CurrencyInput';

interface InlineProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newProduct: Product) => void;
}

export const InlineProductModal: React.FC<InlineProductModalProps> = ({
  isOpen,
  onClose,
  onCreated
}) => {
  const { products, addProduct } = useApp();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('Formulated Spice Mix');
  const [unit, setUnit] = useState('1kg Pack');
  const [defaultRate, setDefaultRate] = useState<number>(1000);
  const [description, setDescription] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!name.trim()) {
      setErrorMsg('Product name is required.');
      return;
    }
    if (defaultRate <= 0) {
      setErrorMsg('Default Rate must be greater than zero.');
      return;
    }

    // Check for duplicate product by name
    const duplicate = products.find(p => p.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (duplicate) {
      setErrorMsg(`Product "${duplicate.name}" already exists in the catalogue. Please select it from the catalogue or use a distinct product name.`);
      return;
    }

    const createdProduct = addProduct({
      name: name.trim(),
      category,
      unit,
      defaultRate,
      description: description.trim() || undefined
    });

    onCreated(createdProduct);
    onClose();
    resetForm();
  };

  const resetForm = () => {
    setName('');
    setCategory('Formulated Spice Mix');
    setUnit('1kg Pack');
    setDefaultRate(1000);
    setDescription('');
    setErrorMsg('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Spice Product"
      subtitle="Adds to product catalog & selects in current line item"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
            <span className="font-bold">Error:</span> {errorMsg}
          </div>
        )}
        <div>
          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Product Name *
          </label>
          <input
            type="text"
            placeholder="e.g. Karahi Masala Special"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold"
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
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="Formulated Spice Mix">Formulated Spice Mix</option>
              <option value="Pure Spice Powder">Pure Spice Powder</option>
              <option value="Raw Spice Material">Raw Spice Material</option>
              <option value="Packaging Materials">Packaging Materials</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Unit Packaging *
            </label>
            <input
              type="text"
              placeholder="e.g. 1kg Pack / 25kg Bag"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              required
            />
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Default Rate (PKR) *
          </label>
          <CurrencyInput
            value={defaultRate}
            onChange={setDefaultRate}
            placeholder="Rate (PKR)"
            prefix="Rs."
            required
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Description
          </label>
          <input
            type="text"
            placeholder="e.g. Rich traditional karahi spice blend"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-700 bg-slate-100 dark:bg-slate-800 dark:text-slate-300 rounded-xl"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2 font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md"
          >
            Save & Select Product
          </button>
        </div>
      </form>
    </Modal>
  );
};
