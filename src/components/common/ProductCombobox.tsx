import React, { useState, useRef, useEffect } from 'react';
import { Product } from '../../types';
import { InlineProductModal } from './InlineProductModal';
import { Search, ChevronDown, Plus, Check, X, Package } from 'lucide-react';
import { formatPKR } from '../../utils/formatters';

interface ProductComboboxProps {
  products: Product[];
  selectedProductId: string;
  onSelect: (product: Product) => void;
  placeholder?: string;
  required?: boolean;
}

export const ProductCombobox: React.FC<ProductComboboxProps> = ({
  products,
  selectedProductId,
  onSelect,
  placeholder = 'Search spice product...',
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);

  const filteredProducts = products.filter(p => {
    if (!search.trim()) return true;
    const query = search.toLowerCase().trim();
    const nameMatch = p.name.toLowerCase().includes(query);
    const catMatch = p.category ? p.category.toLowerCase().includes(query) : false;
    const unitMatch = p.unit ? p.unit.toLowerCase().includes(query) : false;
    return nameMatch || catMatch || unitMatch;
  });

  const selectedProduct = products.find(p => p.id === selectedProductId);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Reset highlight index when filtered list changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [search]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && listboxRef.current && listboxRef.current.children[highlightedIndex]) {
      const item = listboxRef.current.children[highlightedIndex] as HTMLElement;
      item.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < filteredProducts.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredProducts[highlightedIndex]) {
        onSelect(filteredProducts[highlightedIndex]);
        setIsOpen(false);
        setSearch('');
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const handleCreated = (newProduct: Product) => {
    onSelect(newProduct);
    setIsModalOpen(false);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div className="relative" ref={containerRef}>
      {selectedProduct && !isOpen ? (
        <div 
          onClick={() => {
            setIsOpen(true);
            setTimeout(() => inputRef.current?.focus(), 50);
          }}
          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs cursor-pointer hover:border-emerald-500 transition-colors"
        >
          <div className="truncate pr-2">
            <span className="font-semibold text-slate-900 dark:text-white">
              {selectedProduct.name}
            </span>
            <span className="text-[11px] text-slate-400 ml-1.5">
              ({selectedProduct.unit})
            </span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        </div>
      ) : (
        <div className="relative flex items-center">
          <input
            ref={inputRef}
            type="text"
            required={required && !selectedProductId}
            placeholder={placeholder}
            value={search}
            onFocus={() => setIsOpen(true)}
            onChange={(e) => {
              setSearch(e.target.value);
              setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            className="w-full px-2.5 py-1.5 pr-7 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
          />
          <button
            type="button"
            onClick={() => setIsOpen(prev => !prev)}
            className="absolute right-1.5 p-1 text-slate-400 hover:text-slate-600"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Dropdown Options */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden text-xs">
          <div className="p-1 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-850">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-emerald-600 dark:text-emerald-400 font-semibold hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg transition-colors text-left"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add New Product</span>
            </button>
          </div>

          <ul
            ref={listboxRef}
            className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/50"
            role="listbox"
          >
            {filteredProducts.length === 0 ? (
              <li className="p-3 text-center text-slate-400">
                <p>No products matching "{search}"</p>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="mt-1 text-xs font-semibold text-emerald-600 underline"
                >
                  Create "{search}" as product
                </button>
              </li>
            ) : (
              filteredProducts.map((product, index) => {
                const isSelected = product.id === selectedProductId;
                const isHighlighted = index === highlightedIndex;

                return (
                  <li
                    key={product.id}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => {
                      onSelect(product);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={`px-3 py-2 cursor-pointer flex items-center justify-between transition-colors ${
                      isHighlighted
                        ? 'bg-slate-100 dark:bg-slate-700'
                        : isSelected
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-750'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-semibold text-slate-900 dark:text-white truncate">
                        {product.name}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                        <span>{product.unit}</span>
                        <span>•</span>
                        <span>{product.category}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                        {formatPKR(product.defaultRate)}
                      </span>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      )}
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}

      {/* Inline Product Modal */}
      <InlineProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
};
