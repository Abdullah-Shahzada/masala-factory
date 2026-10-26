import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Party, LedgerTransaction, BranchId } from '../types';
import { formatPKR, formatDate, formatTransactionTimestamp } from '../utils/formatters';
import { StatusBadge } from '../components/common/StatusBadge';
import { StatementModal } from '../components/ledger/StatementModal';
import { ProofViewerModal } from '../components/common/ProofViewerModal';
import { ProofBadge } from '../components/common/ProofBadge';
import { 
  BookOpen, 
  Calendar, 
  Filter, 
  Printer, 
  FileText, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Search, 
  Image as ImageIcon,
  Building2,
  Users,
  Clock
} from 'lucide-react';

export const Ledger: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const { 
    parties, 
    salesBills, 
    paymentsReceived, 
    purchases, 
    supplierPayments,
    branches, 
    selectedBranchId 
  } = useApp();

  const [partyTypeTab, setPartyTypeTab] = useState<'all' | 'Customer' | 'Supplier'>('all');
  const partyIdFromUrl = searchParams.get('partyId') || parties[0]?.id || '';
  const [selectedPartyId, setSelectedPartyId] = useState<string>(partyIdFromUrl);

  useEffect(() => {
    if (partyIdFromUrl) {
      setSelectedPartyId(partyIdFromUrl);
    }
  }, [partyIdFromUrl]);

  // Filters
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [statementModalOpen, setStatementModalOpen] = useState(false);
  const [proofModal, setProofModal] = useState<{ isOpen: boolean; url?: string; docNo?: string; notes?: string }>({ isOpen: false });

  const filteredParties = parties.filter(p => {
    if (partyTypeTab === 'Customer') return p.type === 'Customer';
    if (partyTypeTab === 'Supplier') return p.type === 'Supplier';
    return true;
  });

  const party = parties.find(p => p.id === selectedPartyId) || filteredParties[0] || parties[0];

  // Auto-switch selectedPartyId if current selected party is not in filtered list
  const handleTabSelect = (tab: 'all' | 'Customer' | 'Supplier') => {
    setPartyTypeTab(tab);
    const available = parties.filter(p => {
      if (tab === 'Customer') return p.type === 'Customer';
      if (tab === 'Supplier') return p.type === 'Supplier';
      return true;
    });
    if (available.length > 0 && !available.some(p => p.id === selectedPartyId)) {
      setSelectedPartyId(available[0].id);
      setSearchParams({ partyId: available[0].id });
    }
  };

  // Assemble full transaction timeline for chosen party with accurate chronological running balance
  const compileTransactions = (): LedgerTransaction[] => {
    if (!party) return [];

    const rawList: LedgerTransaction[] = [];

    // 1. Sales Bills for this party (excluding soft-deleted bills)
    salesBills
      .filter(b => b.partyId === party.id && !b.isDeleted)
      .forEach(b => {
        const parsed = formatTransactionTimestamp(b.billDate, b.billTime, b.createdAt);
        rawList.push({
          id: `tx-sb-${b.id}`,
          date: b.billDate,
          time: b.billTime,
          hasExactTime: parsed.hasTime,
          displayDate: parsed.formattedDate,
          displayTime: parsed.formattedTime,
          sortTimestamp: parsed.sortTimestamp,
          createdAt: b.createdAt,
          type: 'Sales Bill',
          billNumber: b.billNumber,
          description: `Sales Bill for ${b.items.length} items`,
          itemsSummary: b.items.map(i => `${i.productName} (${i.quantity} ${i.unit} @ ${formatPKR(i.rate)})`).join(' | '),
          billTotal: b.grandTotal,
          paymentAmount: 0,
          remainingBalance: 0,
          proofUrl: b.proofUrl,
          proofStatus: b.proofStatus,
          notes: b.notes,
          branchId: b.branchId
        });
      });

    // 2. Payments Received from this party (excluding soft-deleted payments)
    paymentsReceived
      .filter(p => p.partyId === party.id && !p.isDeleted)
      .forEach(p => {
        const parsed = formatTransactionTimestamp(p.paymentDate, p.paymentTime, p.createdAt);
        rawList.push({
          id: `tx-pr-${p.id}`,
          date: p.paymentDate,
          time: p.paymentTime,
          hasExactTime: parsed.hasTime,
          displayDate: parsed.formattedDate,
          displayTime: parsed.formattedTime,
          sortTimestamp: parsed.sortTimestamp,
          createdAt: p.createdAt,
          type: 'Payment Received',
          billNumber: p.receiptNumber,
          description: `Payment Received via ${p.paymentMethod} ${p.referenceNo ? `(Ref: ${p.referenceNo})` : ''}`,
          billTotal: 0,
          paymentAmount: p.amountReceived,
          remainingBalance: 0,
          proofUrl: p.proofUrl,
          proofStatus: p.proofStatus,
          notes: p.notes,
          branchId: p.branchId
        });
      });

    // 3. Supplier Purchase Bills for this party (excluding soft-deleted purchases)
    purchases
      .filter(pb => pb.supplierId === party.id && !pb.isDeleted)
      .forEach(pb => {
        const parsed = formatTransactionTimestamp(pb.billDate, pb.billTime, pb.createdAt);
        rawList.push({
          id: `tx-pb-${pb.id}`,
          date: pb.billDate,
          time: pb.billTime,
          hasExactTime: parsed.hasTime,
          displayDate: parsed.formattedDate,
          displayTime: parsed.formattedTime,
          sortTimestamp: parsed.sortTimestamp,
          createdAt: pb.createdAt,
          type: 'Purchase Bill',
          billNumber: pb.billNumber,
          description: `Supplier Raw Material Purchase (${pb.items.length} items)`,
          itemsSummary: pb.items.map(i => `${i.productName} (${i.quantity} ${i.unit} @ ${formatPKR(i.rate)})`).join(' | '),
          billTotal: pb.grandTotal,
          paymentAmount: 0,
          remainingBalance: 0,
          proofUrl: pb.proofUrl,
          proofStatus: pb.proofStatus,
          notes: pb.notes,
          branchId: pb.branchId
        });
      });

    // 4. Supplier Payments for this party (excluding soft-deleted payments)
    supplierPayments
      .filter(sp => sp.supplierId === party.id && !sp.isDeleted)
      .forEach(sp => {
        const parsed = formatTransactionTimestamp(sp.paymentDate, sp.paymentTime, sp.createdAt);
        rawList.push({
          id: `tx-sp-${sp.id}`,
          date: sp.paymentDate,
          time: sp.paymentTime,
          hasExactTime: parsed.hasTime,
          displayDate: parsed.formattedDate,
          displayTime: parsed.formattedTime,
          sortTimestamp: parsed.sortTimestamp,
          createdAt: sp.createdAt,
          type: 'Supplier Payment',
          billNumber: sp.receiptNumber,
          description: `Supplier Payment Against Bill ${sp.purchaseBillNumber}${sp.referenceNo ? ` (Ref: ${sp.referenceNo})` : ''}`,
          billTotal: 0,
          paymentAmount: sp.amountPaid,
          remainingBalance: 0,
          proofUrl: sp.proofUrl,
          proofStatus: sp.proofStatus,
          notes: sp.notes,
          branchId: sp.branchId
        });
      });

    // Sort chronologically (oldest first) using actual transaction date AND time
    rawList.sort((a, b) => {
      if ((a.sortTimestamp ?? 0) !== (b.sortTimestamp ?? 0)) {
        return (a.sortTimestamp ?? 0) - (b.sortTimestamp ?? 0);
      }
      // On identical date/time, bills (debits) precede payments (credits)
      const aIsBill = a.type === 'Sales Bill' || a.type === 'Purchase Bill';
      const bIsBill = b.type === 'Sales Bill' || b.type === 'Purchase Bill';
      if (aIsBill && !bIsBill) return -1;
      if (!aIsBill && bIsBill) return 1;

      // Stable deterministic tie-breaker
      const aKey = a.createdAt || a.id;
      const bKey = b.createdAt || b.id;
      return aKey.localeCompare(bKey);
    });

    // Compute running balance chronologically forward in time
    let runningBalance = 0;
    const computedList = rawList.map(tx => {
      if (tx.type === 'Sales Bill' || tx.type === 'Purchase Bill') {
        runningBalance += tx.billTotal;
      } else if (tx.type === 'Payment Received' || tx.type === 'Supplier Payment') {
        runningBalance -= tx.paymentAmount;
      }
      return {
        ...tx,
        remainingBalance: Math.max(0, runningBalance)
      };
    });

    // Display newest-first while preserving each transaction's chronological running balance
    return computedList.sort((a, b) => {
      if ((a.sortTimestamp ?? 0) !== (b.sortTimestamp ?? 0)) {
        return (b.sortTimestamp ?? 0) - (a.sortTimestamp ?? 0);
      }
      // Reverse tie-breaker for display so payment is above bill when newest is at top
      const aIsBill = a.type === 'Sales Bill' || a.type === 'Purchase Bill';
      const bIsBill = b.type === 'Sales Bill' || b.type === 'Purchase Bill';
      if (!aIsBill && bIsBill) return -1;
      if (aIsBill && !bIsBill) return 1;

      const aKey = a.createdAt || a.id;
      const bKey = b.createdAt || b.id;
      return bKey.localeCompare(aKey);
    });
  };

  const allTransactions = compileTransactions();

  // Apply filters
  const filteredTransactions = allTransactions.filter(t => {
    // Branch filter
    if (selectedBranchId !== 'all' && t.branchId !== selectedBranchId) return false;
    // Date range filter
    if (startDate && t.date < startDate) return false;
    if (endDate && t.date > endDate) return false;
    // Type filter
    if (typeFilter !== 'all' && t.type !== typeFilter) return false;
    // Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchNo = t.billNumber.toLowerCase().includes(q);
      const matchDesc = t.description.toLowerCase().includes(q);
      const matchItems = t.itemsSummary?.toLowerCase().includes(q);
      if (!matchNo && !matchDesc && !matchItems) return false;
    }
    return true;
  });

  // Calculate aggregates
  const totalSales = filteredTransactions
    .filter(t => t.type === 'Sales Bill')
    .reduce((sum, t) => sum + t.billTotal, 0);

  const totalPayments = filteredTransactions
    .filter(t => t.type === 'Payment Received')
    .reduce((sum, t) => sum + t.paymentAmount, 0);

  const totalPurchases = filteredTransactions
    .filter(t => t.type === 'Purchase Bill')
    .reduce((sum, t) => sum + t.billTotal, 0);

  const totalSupplierPayments = filteredTransactions
    .filter(t => t.type === 'Supplier Payment')
    .reduce((sum, t) => sum + t.paymentAmount, 0);

  const customerRemainingBalance = Math.max(0, totalSales - totalPayments);
  const supplierRemainingPayable = Math.max(0, totalPurchases - totalSupplierPayments);
  const netBalance = (totalSales - totalPayments) + (totalPurchases - totalSupplierPayments);

  const handlePartyChange = (id: string) => {
    setSelectedPartyId(id);
    setSearchParams({ partyId: id });
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            Detailed Party Ledger & Audit Trail
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Complete transaction history compiled from sales bills, payments received, supplier purchases, and line items.
          </p>
        </div>

        <button
          onClick={() => setStatementModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md flex items-center gap-2 transition-colors self-start sm:self-auto"
        >
          <Printer className="w-4 h-4" />
          Generate Statement PDF
        </button>
      </div>

      {/* Party Switcher & Aggregates */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        
        {/* Party Type Segment Pills */}
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-2">Filter Directory:</span>
          {(['all', 'Customer', 'Supplier'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => handleTabSelect(tab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                partyTypeTab === tab
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {tab === 'all' ? `All Parties (${parties.filter(p => !p.isDeleted).length})` : tab === 'Customer' ? `Customers (${parties.filter(p => !p.isDeleted && p.type === 'Customer').length})` : `Suppliers (${parties.filter(p => !p.isDeleted && p.type === 'Supplier').length})`}
            </button>
          ))}
        </div>

        {/* Party Selector Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold flex items-center justify-center text-sm shadow-sm">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Selected Party Ledger</label>
              <select
                value={selectedPartyId}
                onChange={(e) => handlePartyChange(e.target.value)}
                className="text-base font-bold text-slate-900 dark:text-white bg-transparent border-none focus:outline-none cursor-pointer pr-4"
              >
                {filteredParties.map(p => (
                  <option key={p.id} value={p.id} className="dark:bg-slate-900 text-sm">
                    {p.name} ({p.type} - {p.city}) {p.isDeleted ? ' [Archived / Deleted]' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {party && (
            <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap gap-4">
              <div>Phone: <strong className="text-slate-900 dark:text-white">{party.phone}</strong></div>
              <div>WhatsApp: <strong className="text-emerald-600 dark:text-emerald-400">{party.whatsapp}</strong></div>
              <div>City: <strong className="text-slate-900 dark:text-white">{party.city}</strong></div>
            </div>
          )}
        </div>

        {/* Live Aggregates Summary at the Top of Ledger */}
        <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {party?.type === 'Supplier' ? (
            <>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Purchases</span>
                <span className="text-xl font-bold text-slate-900 dark:text-white mt-1 block">{formatPKR(totalPurchases)}</span>
              </div>
              <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60">
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">Total Payments Paid</span>
                <span className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-1 block">{formatPKR(totalSupplierPayments)}</span>
              </div>
              <div className="p-4 rounded-xl bg-rose-50/60 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-800/60">
                <span className="text-xs font-semibold text-rose-700 dark:text-rose-400 uppercase tracking-wider block">Remaining Payable Balance</span>
                <span className="text-xl font-bold text-rose-700 dark:text-rose-300 mt-1 block">{formatPKR(supplierRemainingPayable)}</span>
              </div>
            </>
          ) : party?.type === 'Customer' ? (
            <>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Sales Invoiced</span>
                <span className="text-xl font-bold text-slate-900 dark:text-white mt-1 block">{formatPKR(totalSales)}</span>
              </div>
              <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60">
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">Total Payments Received</span>
                <span className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-1 block">{formatPKR(totalPayments)}</span>
              </div>
              <div className="p-4 rounded-xl bg-rose-50/60 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-800/60">
                <span className="text-xs font-semibold text-rose-700 dark:text-rose-400 uppercase tracking-wider block">Remaining Receivable Balance</span>
                <span className="text-xl font-bold text-rose-700 dark:text-rose-300 mt-1 block">{formatPKR(customerRemainingBalance)}</span>
              </div>
            </>
          ) : (
            <>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Sales</span>
                <span className="text-xl font-bold text-slate-900 dark:text-white mt-1 block">{formatPKR(totalSales)}</span>
              </div>
              <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60">
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">Collections Received</span>
                <span className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-1 block">{formatPKR(totalPayments)}</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Purchases</span>
                <span className="text-xl font-bold text-slate-900 dark:text-white mt-1 block">{formatPKR(totalPurchases)}</span>
              </div>
              <div className="p-4 rounded-xl bg-rose-50/60 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-800/60">
                <span className="text-xs font-semibold text-rose-700 dark:text-rose-400 uppercase tracking-wider block">Net Balance Due</span>
                <span className="text-xl font-bold text-rose-700 dark:text-rose-300 mt-1 block">{formatPKR(netBalance)}</span>
              </div>
            </>
          )}
        </div>

      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Date Filter */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="font-semibold text-slate-700 dark:text-slate-300">Period:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
          />
          <span className="text-slate-400">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
          />
          {(startDate || endDate) && (
            <button
              onClick={() => { setStartDate(''); setEndDate(''); }}
              className="text-rose-600 font-semibold underline ml-1"
            >
              Reset
            </button>
          )}
        </div>

        {/* Type Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Type:
          </span>
          {['all', 'Sales Bill', 'Payment Received', 'Purchase Bill', 'Supplier Payment'].map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                typeFilter === t
                  ? 'bg-slate-900 text-white dark:bg-emerald-600 dark:text-white'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              {t === 'all' ? 'All Types' : t}
            </button>
          ))}
        </div>

      </div>

      {/* Transaction History Timeline Table */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-3">Date & Time</th>
                <th className="p-3">Transaction Type</th>
                <th className="p-3">Bill / Ref #</th>
                <th className="p-3">Description & Itemized Products</th>
                <th className="p-3 text-right">Bill Total</th>
                <th className="p-3 text-right">Payment</th>
                <th className="p-3 text-right">Remaining</th>
                <th className="p-3 text-center">Proof</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="p-3 font-medium whitespace-nowrap">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {tx.displayDate || formatDate(tx.date)}
                      </div>
                      {tx.displayTime ? (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5 font-normal">
                          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                          {tx.displayTime}
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 italic mt-0.5">
                          Date only
                        </div>
                      )}
                    </td>
                    <td className="p-3 font-semibold text-emerald-700 dark:text-emerald-400">{tx.type}</td>
                    <td className="p-3 font-mono font-bold">{tx.billNumber}</td>
                    <td className="p-3 max-w-md">
                      <div className="font-semibold text-slate-900 dark:text-white">{tx.description}</div>
                      {tx.itemsSummary && (
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {tx.itemsSummary}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-right font-medium">
                      {tx.billTotal > 0 ? formatPKR(tx.billTotal) : '-'}
                    </td>
                    <td className="p-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                      {tx.paymentAmount > 0 ? formatPKR(tx.paymentAmount) : '-'}
                    </td>
                    <td className="p-3 text-right font-bold text-slate-900 dark:text-white">
                      {formatPKR(tx.remainingBalance)}
                    </td>
                    <td className="p-3 text-center">
                      <ProofBadge
                        status={tx.proofUrl ? 'Proof Attached' : 'Not Required'}
                        proofUrl={tx.proofUrl}
                        onViewProof={() => setProofModal({ isOpen: true, url: tx.proofUrl, docNo: tx.billNumber, notes: tx.notes })}
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No transactions found for the selected party and date filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* STATEMENT PREVIEW MODAL */}
      {party && (
        <StatementModal
          isOpen={statementModalOpen}
          onClose={() => setStatementModalOpen(false)}
          party={party}
          transactions={filteredTransactions}
        />
      )}

      {/* PROOF VIEWER MODAL */}
      <ProofViewerModal
        isOpen={proofModal.isOpen}
        onClose={() => setProofModal({ isOpen: false })}
        title="Ledger Document Proof"
        proofUrl={proofModal.url}
        documentNumber={proofModal.docNo}
        notes={proofModal.notes}
      />

    </div>
  );
};
