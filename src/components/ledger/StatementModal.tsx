import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Party, LedgerTransaction } from '../../types';
import { formatPKR, formatDate } from '../../utils/formatters';
import { generateStatementPrintHTML, printDocument, generateLedgerStatementPDF, shareOrDownloadPDF } from '../../utils/pdfGenerator';
import { Printer, Download, Share2, Calendar, FileText, MessageCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { WhatsAppShareModal } from '../common/WhatsAppShareModal';
import { formatLedgerStatementWAMessage } from '../../utils/whatsappHelper';

interface StatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  party: Party;
  transactions: LedgerTransaction[];
}

export const StatementModal: React.FC<StatementModalProps> = ({
  isOpen,
  onClose,
  party,
  transactions
}) => {
  const { selectedBranchId, branches, companyProfile } = useApp();
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isWAModalOpen, setIsWAModalOpen] = useState(false);

  // Filter transactions by date
  const filteredTransactions = transactions.filter(t => {
    if (startDate && t.date < startDate) return false;
    if (endDate && t.date > endDate) return false;
    return true;
  });

  const totalSales = filteredTransactions
    .filter(t => t.type === 'Sales Bill')
    .reduce((sum, t) => sum + t.billTotal, 0);

  const totalPayments = filteredTransactions
    .filter(t => t.type === 'Payment Received')
    .reduce((sum, t) => sum + t.paymentAmount, 0);

  const totalPurchases = filteredTransactions
    .filter(t => t.type === 'Purchase Bill')
    .reduce((sum, t) => sum + t.billTotal, 0);

  const netBalance = totalSales - totalPayments + (totalPurchases - filteredTransactions
    .filter(t => t.type === 'Supplier Payment')
    .reduce((sum, t) => sum + t.paymentAmount, 0));

  const branchName = selectedBranchId === 'all' 
    ? 'All Branches (Global Network)' 
    : branches.find(b => b.id === selectedBranchId)?.name || 'Selected Branch';

  const handleDownloadPDF = () => {
    const doc = generateLedgerStatementPDF(party, filteredTransactions, startDate, endDate, companyProfile, branchName);
    const safeParty = party.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    doc.save(`Party-Ledger-${safeParty}.pdf`);
  };

  const handlePrint = () => {
    const html = generateStatementPrintHTML(party, filteredTransactions, startDate, endDate, branchName);
    printDocument(html);
  };

  const handleShare = () => {
    setIsWAModalOpen(true);
  };

  const waMessage = formatLedgerStatementWAMessage({
    partyName: party.name,
    partyType: party.type,
    startDate,
    endDate,
    totalSales,
    totalPayments,
    closingBalance: netBalance,
    branchName
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Statement Preview — ${party.name}`}
      subtitle={`Official B2B Financial Statement for ${party.companyName || party.name}`}
      maxWidth="4xl"
    >
      <div className="space-y-6">
        
        {/* Date Filter Bar & Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs">
              <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">Date Range:</span>
            </div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
            />
            {(startDate || endDate) && (
              <button
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="text-xs text-rose-600 dark:text-rose-400 underline font-medium"
              >
                Reset
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleDownloadPDF}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-950/20 flex items-center gap-1.5 transition-colors"
              title="Download official PDF Statement"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>
            <button
              onClick={handleShare}
              className="px-3.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 rounded-xl flex items-center gap-1.5 transition-colors border border-emerald-200 dark:border-emerald-800"
              title="Message Statement on WhatsApp"
            >
              <MessageCircle className="w-4 h-4" />
              Message on WhatsApp
            </button>
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-xl flex items-center gap-1.5 transition-colors"
              title="Print document"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
          </div>
        </div>

        {/* Printable Document Preview Shell */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between border-b pb-4 border-slate-200 dark:border-slate-800 gap-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-emerald-800 dark:text-emerald-400">
                MASALA FACTORY MANAGEMENT SYSTEM
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                B2B Spices Manufacturing & Supply Network | {branchName}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-xs uppercase font-bold tracking-wider text-slate-400 block">Party Statement</span>
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {formatDate(new Date().toISOString())}
              </span>
            </div>
          </div>

          {/* Statement Aggregate Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Period Sales</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white mt-1 block">{formatPKR(totalSales)}</span>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60">
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Payments Received</span>
              <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300 mt-1 block">{formatPKR(totalPayments)}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Period Purchases</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white mt-1 block">{formatPKR(totalPurchases)}</span>
            </div>
            <div className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-800/60">
              <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">Net Balance Due</span>
              <span className="text-lg font-bold text-rose-700 dark:text-rose-300 mt-1 block">{formatPKR(netBalance)}</span>
            </div>
          </div>

          {/* Transaction Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3">Date & Time</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Bill / Ref #</th>
                  <th className="p-3">Description & Products</th>
                  <th className="p-3 text-right">Bill Amount</th>
                  <th className="p-3 text-right">Payment</th>
                  <th className="p-3 text-right">Remaining</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-3 font-medium whitespace-nowrap">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {t.displayDate || formatDate(t.date)}
                        </div>
                        {t.displayTime && (
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                            {t.displayTime}
                          </div>
                        )}
                      </td>
                      <td className="p-3 font-semibold text-emerald-700 dark:text-emerald-400">{t.type}</td>
                      <td className="p-3 font-mono">{t.billNumber}</td>
                      <td className="p-3 max-w-xs truncate">
                        <div>{t.description}</div>
                        {t.itemsSummary && <div className="text-[10px] text-slate-400">{t.itemsSummary}</div>}
                      </td>
                      <td className="p-3 text-right font-medium">{t.billTotal > 0 ? formatPKR(t.billTotal) : '-'}</td>
                      <td className="p-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">{t.paymentAmount > 0 ? formatPKR(t.paymentAmount) : '-'}</td>
                      <td className="p-3 text-right font-bold text-slate-900 dark:text-white">{formatPKR(t.remainingBalance)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No transaction records match the specified criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>

        {/* WHATSAPP SHARE MODAL */}
        <WhatsAppShareModal
          isOpen={isWAModalOpen}
          onClose={() => setIsWAModalOpen(false)}
          defaultPhone={party.whatsapp || party.phone || ''}
          defaultMessage={waMessage}
          title={`Share Ledger Statement — ${party.name}`}
          recipientLabel={party.name}
          referenceNumber={`STMT-${party.id.slice(-4).toUpperCase()}`}
          onDownloadDocument={handlePrint}
        />
      </div>
    </Modal>
  );
};
