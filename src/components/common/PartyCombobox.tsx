import React, { useState, useRef, useEffect } from 'react';
import { Party, PartyType } from '../../types';
import { InlineContactModal } from './InlineContactModal';
import { Search, ChevronDown, Plus, Check, X, User } from 'lucide-react';

interface PartyComboboxProps {
  parties: Party[];
  selectedPartyId: string;
  onSelect: (party: Party) => void;
  onClear?: () => void;
  filterType?: PartyType | 'all';
  placeholder?: string;
  required?: boolean;
}

export const PartyCombobox: React.FC<PartyComboboxProps> = ({
  parties,
  selectedPartyId,
  onSelect,
  onClear,
  filterType = 'Customer',
  placeholder = 'Search customer by name or phone...',
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);

  // Filter parties by type (if specified) and search term
  const eligibleParties = parties.filter(p => {
    if (p.isDeleted) return false;
    if (filterType === 'all') return true;
    if (filterType === 'Customer') return p.type === 'Customer' || p.type === 'Both';
    if (filterType === 'Supplier') return p.type === 'Supplier' || p.type === 'Both';
    return p.type === filterType;
  });

  const filteredParties = eligibleParties.filter(p => {
    if (!search.trim()) return true;
    const query = search.toLowerCase().trim();
    const cleanQuery = query.replace(/[^0-9]/g, '');
    const cleanPhone = p.phone.replace(/[^0-9]/g, '');

    const nameMatch = p.name.toLowerCase().includes(query);
    const companyMatch = p.companyName ? p.companyName.toLowerCase().includes(query) : false;
    const cityMatch = p.city ? p.city.toLowerCase().includes(query) : false;
    const phoneMatch = cleanQuery.length >= 3 && cleanPhone.includes(cleanQuery);

    return nameMatch || companyMatch || cityMatch || phoneMatch;
  });

  const selectedParty = parties.find(p => p.id === selectedPartyId);

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
      setHighlightedIndex(prev => (prev < filteredParties.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredParties[highlightedIndex]) {
        onSelect(filteredParties[highlightedIndex]);
        setIsOpen(false);
        setSearch('');
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const handleCreated = (newParty: Party) => {
    onSelect(newParty);
    setIsModalOpen(false);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* If a party is selected, show clear informative card with Change / Clear buttons */}
      {selectedParty && !isOpen ? (
        <div className="flex items-center justify-between p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/30 text-xs">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
              {selectedParty.name.charAt(0).toUpperCase()}
            </div>
            <div className="truncate">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 dark:text-white truncate">
                  {selectedParty.name}
                </span>
                {selectedParty.companyName && (
                  <span className="text-[11px] text-slate-500 truncate">
                    ({selectedParty.companyName})
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 font-mono">
                <span>{selectedParty.phone}</span>
                {selectedParty.city && <span>• {selectedParty.city}</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            <button
              type="button"
              onClick={() => {
                setIsOpen(true);
                setTimeout(() => inputRef.current?.focus(), 50);
              }}
              className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-lg transition-colors"
            >
              Change
            </button>
            {onClear && (
              <button
                type="button"
                onClick={onClear}
                className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                title="Clear selection"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Search Input */
        <div className="relative">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-3 text-slate-400 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              required={required && !selectedPartyId}
              placeholder={placeholder}
              value={search}
              onFocus={() => setIsOpen(true)}
              onChange={(e) => {
                setSearch(e.target.value);
                setIsOpen(true);
              }}
              onKeyDown={handleKeyDown}
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={() => setIsOpen(prev => !prev)}
              className="absolute right-2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Dropdown Options */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden text-xs">
          {/* Header Action: Add New Contact */}
          <div className="p-1.5 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-850">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="w-full flex items-center gap-2 px-3 py-2 text-emerald-600 dark:text-emerald-400 font-semibold hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg transition-colors text-left"
            >
              <Plus className="w-4 h-4" />
              <span>+ Create New Party / Customer</span>
            </button>
          </div>

          {/* Listbox */}
          <ul
            ref={listboxRef}
            className="max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/50"
            role="listbox"
          >
            {filteredParties.length === 0 ? (
              <li className="p-4 text-center text-slate-400">
                <p>No parties matching "{search}"</p>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="mt-2 text-xs font-semibold text-emerald-600 underline"
                >
                  Create "{search}" as new contact
                </button>
              </li>
            ) : (
              filteredParties.map((party, index) => {
                const isSelected = party.id === selectedPartyId;
                const isHighlighted = index === highlightedIndex;

                return (
                  <li
                    key={party.id}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => {
                      onSelect(party);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={`p-2.5 cursor-pointer flex items-center justify-between transition-colors ${
                      isHighlighted
                        ? 'bg-slate-100 dark:bg-slate-700'
                        : isSelected
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-750'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 text-xs shrink-0">
                        {party.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-900 dark:text-white truncate">
                            {party.name}
                          </span>
                          {party.companyName && (
                            <span className="text-[11px] text-slate-400 truncate">
                              • {party.companyName}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 font-mono">
                          <span>{party.phone}</span>
                          {party.city && <span>• {party.city}</span>}
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            {party.type}
                          </span>
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}

      {/* Inline Contact Modal */}
      <InlineContactModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={handleCreated}
        defaultType={filterType === 'all' ? 'Customer' : filterType}
      />
    </div>
  );
};
