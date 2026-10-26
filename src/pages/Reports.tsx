import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatPKR, formatDate } from '../utils/formatters';
import { StatCard } from '../components/common/StatCard';
import { ProofBadge } from '../components/common/ProofBadge';
import { WhatsAppShareModal } from '../components/common/WhatsAppShareModal';
import { 
  generateAuditReportPrintHTML, 
  generateAuditReportPDF, 
  downloadPDFDirect, 
  printDocument 
} from '../utils/pdfGenerator';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Clock, 
  ShoppingBag, 
  Wallet, 
  Building2, 
  Calendar,
  PieChart as PieChartIcon,
  Printer,
  Download,
  MessageSquare,
  AlertTriangle,
  FileCheck
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export const Reports: React.FC = () => {
  const { salesBills, paymentsReceived, purchases, expenses, branches, selectedBranchId, companyProfile } = useApp();
  const [reportType, setReportType] = useState<'sales' | 'payments' | 'expenses' | 'branch' | 'missing_proofs'>('sales');
  const [dateRangePreset, setDateRangePreset] = useState<'all' | 'weekly' | 'monthly' | 'custom'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isWAModalOpen, setIsWAModalOpen] = useState(false);

  // Quick Date Range Handler
  const handlePresetChange = (preset: 'all' | 'weekly' | 'monthly' | 'custom') => {
    setDateRangePreset(preset);
    const now = new Date();
    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'weekly') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 86400000);
      setStartDate(oneWeekAgo.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (preset === 'monthly') {
      const oneMonthAgo = new Date(now.getTime() - 30 * 86400000);
      setStartDate(oneMonthAgo.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    }
  };

  const matchesDate = (dateStr: string) => {
    if (startDate && dateStr < startDate) return false;
    if (endDate && dateStr > endDate) return false;
    return true;
  };

  // Filter out soft-deleted sales bills and apply branch and date filters
  const activeSalesBills = salesBills.filter(b => !b.isDeleted && (selectedBranchId === 'all' || b.branchId === selectedBranchId) && matchesDate(b.billDate));
  const activePayments = paymentsReceived.filter(p => (selectedBranchId === 'all' || p.branchId === selectedBranchId) && matchesDate(p.paymentDate));
  const activePurchases = purchases.filter(p => (selectedBranchId === 'all' || p.branchId === selectedBranchId) && matchesDate(p.billDate));
  const activeExpenses = expenses.filter(e => (selectedBranchId === 'all' || e.branchId === selectedBranchId) && matchesDate(e.expenseDate));

  // Audit: Missing Proof Items
  const missingProofSales = activeSalesBills.filter(b => !b.proofUrl);
  const missingProofPayments = activePayments.filter(p => !p.proofUrl);
  const missingProofPurchases = activePurchases.filter(p => !p.proofUrl);
  const missingProofExpenses = activeExpenses.filter(e => !e.proofUrl);
  const totalMissingProofCount = missingProofSales.length + missingProofPayments.length + missingProofPurchases.length + missingProofExpenses.length;

  const totalSales = activeSalesBills.reduce((sum, b) => sum + b.grandTotal, 0);
  const totalReceived = activePayments.reduce((sum, p) => sum + p.amountReceived, 0);
  const totalPurchases = activePurchases.reduce((sum, p) => sum + p.grandTotal, 0);
  const totalExpenses = activeExpenses.reduce((sum, e) => sum + e.amount, 0);

  const branchName = selectedBranchId === 'all' ? 'All Factory Branches' : (branches.find(b => b.id === selectedBranchId)?.name || 'Main Factory');

  const getReportData = () => {
    let title = 'Financial Operations Summary';
    let headers: string[] = [];
    let rows: string[][] = [];

    if (reportType === 'sales') {
      title = 'Sales Invoices & Receivables Audit';
      headers = ['Bill No', 'Customer', 'Date', 'Total (PKR)', 'Received (PKR)', 'Balance (PKR)'];
      rows = activeSalesBills.map(b => [b.billNumber, b.partyName, formatDate(b.billDate), formatPKR(b.grandTotal), formatPKR(b.receivedAmount), formatPKR(b.remainingAmount)]);
    } else if (reportType === 'payments') {
      title = 'Customer Payments Collection Log';
      headers = ['Receipt #', 'Customer', 'Method', 'Date', 'Amount (PKR)'];
      rows = activePayments.map(p => [p.receiptNumber, p.partyName, p.paymentMethod, formatDate(p.paymentDate), formatPKR(p.amountReceived)]);
    } else if (reportType === 'expenses') {
      title = 'Factory Operating Overhead Report';
      headers = ['Expense #', 'Category', 'Description', 'Date', 'Amount (PKR)'];
      rows = activeExpenses.map(e => [e.expenseNumber, e.category, e.title, formatDate(e.expenseDate), formatPKR(e.amount)]);
    } else if (reportType === 'missing_proofs') {
      title = 'Missing Photo Proofs & Compliance Audit';
      headers = ['Module', 'Reference #', 'Party / Payee', 'Date', 'Amount (PKR)'];
      rows = [
        ...missingProofSales.map(b => ['Sales Bill', b.billNumber, b.partyName, formatDate(b.billDate), formatPKR(b.grandTotal)]),
        ...missingProofPayments.map(p => ['Payment Receipt', p.receiptNumber, p.partyName, formatDate(p.paymentDate), formatPKR(p.amountReceived)]),
        ...missingProofPurchases.map(pb => ['Purchase Bill', pb.billNumber, pb.supplierName, formatDate(pb.billDate), formatPKR(pb.grandTotal)]),
        ...missingProofExpenses.map(e => ['Expense Claim', e.expenseNumber, e.paidTo, formatDate(e.expenseDate), formatPKR(e.amount)])
      ];
    } else {
      title = 'Branch Revenue & Overheads Comparison';
      headers = ['Branch Name', 'Sales Revenue', 'Operating Expenses'];
      rows = branches.map(b => {
        const s = activeSalesBills.filter(sb => sb.branchId === b.id).reduce((sum, sb) => sum + sb.grandTotal, 0);
        const ex = activeExpenses.filter(e => e.branchId === b.id).reduce((sum, e) => sum + e.amount, 0);
        return [b.name, formatPKR(s), formatPKR(ex)];
      });
    }

    const summaryCards = [
      { label: 'Total Invoiced', value: formatPKR(totalSales) },
      { label: 'Collections', value: formatPKR(totalReceived) },
      { label: 'Purchases', value: formatPKR(totalPurchases) },
      { label: 'Expenses', value: formatPKR(totalExpenses) }
    ];

    return { title, headers, rows, summaryCards };
  };

  const handleDownloadReportPDF = () => {
    const data = getReportData();
    const doc = generateAuditReportPDF({
      reportTitle: data.title,
      category: reportType,
      branchName,
      startDate,
      endDate,
      summaryCards: data.summaryCards,
      headers: data.headers,
      rows: data.rows
    }, companyProfile);
    downloadPDFDirect(doc, `Business-Report-${reportType}.pdf`);
  };

  const handlePrintReport = () => {
    const data = getReportData();
    const html = generateAuditReportPrintHTML({
      reportTitle: data.title,
      category: reportType,
      branchName,
      startDate,
      endDate,
      summaryCards: data.summaryCards,
      headers: data.headers,
      rows: data.rows
    });
    printDocument(html);
  };

  const getWAMessage = () => {
    return (
      `*MASALA FACTORY MANAGEMENT*\n` +
      `*EXECUTIVE REPORT SUMMARY*\n` +
      `--------------------------------\n` +
      `*Scope:* ${branchName}\n` +
      `*Period:* ${startDate ? formatDate(startDate) : 'All Records'} ${endDate ? `to ${formatDate(endDate)}` : ''}\n` +
      `--------------------------------\n` +
      `*Total Sales:* ${formatPKR(totalSales)}\n` +
      `*Collections:* ${formatPKR(totalReceived)}\n` +
      `*Purchases:* ${formatPKR(totalPurchases)}\n` +
      `*Expenses:* ${formatPKR(totalExpenses)}\n` +
      `*Missing Proof Records:* ${totalMissingProofCount}\n` +
      `--------------------------------\n` +
      `Official Executive Management Audit`
    );
  };

  // Branch Performance Data
  const branchData = branches.map(b => {
    const bBills = salesBills.filter(sb => sb.branchId === b.id && !sb.isDeleted);
    const bExp = expenses.filter(ex => ex.branchId === b.id);
    return {
      branchName: b.code ? `${b.code}` : b.name.split(' ')[0],
      sales: bBills.reduce((sum, sb) => sum + sb.grandTotal, 0),
      expenses: bExp.reduce((sum, ex) => sum + ex.amount, 0)
    };
  });

  const COLORS = ['#16a34a', '#d97706', '#dc2626', '#2563eb', '#7c3aed'];

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            Financial Reports & Analytics
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Consolidated reporting hub for sales trends, collections, supplier payables, operating expenses, and audit proofs.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleDownloadReportPDF}
            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-md flex items-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </button>

          <button
            onClick={() => setIsWAModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md flex items-center gap-2 transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            Message on WhatsApp
          </button>

          <button
            onClick={handlePrintReport}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-md flex items-center gap-2 transition-colors dark:bg-slate-700 dark:hover:bg-slate-600"
          >
            <Printer className="w-4 h-4" />
            Print Report
          </button>
        </div>
      </div>

      {/* Date Range Filter Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Date Range Preset:</span>
          {(['all', 'weekly', 'monthly', 'custom'] as const).map(p => (
            <button
              key={p}
              onClick={() => handlePresetChange(p)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold capitalize transition-all ${
                dateRangePreset === p
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {p === 'all' ? 'All Time' : p === 'weekly' ? 'Last 7 Days' : p === 'monthly' ? 'Last 30 Days' : 'Custom'}
            </button>
          ))}
        </div>

        {dateRangePreset === 'custom' && (
          <div className="flex items-center gap-2 text-xs">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>
        )}
      </div>

      {/* Report Type Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        {[
          { id: 'sales', label: 'Sales & Receivables', icon: TrendingUp },
          { id: 'payments', label: 'Collections Log', icon: DollarSign },
          { id: 'expenses', label: 'Expenses Analysis', icon: Wallet },
          { id: 'branch', label: 'Branch Comparison', icon: Building2 },
          { id: 'missing_proofs', label: `Missing Proofs Audit (${totalMissingProofCount})`, icon: AlertTriangle, alert: totalMissingProofCount > 0 },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = reportType === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setReportType(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                isActive 
                  ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                  : tab.alert 
                    ? 'text-rose-600 dark:text-rose-400 font-bold hover:bg-rose-50 dark:hover:bg-rose-950/30' 
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Summary KPI Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Sales" value={formatPKR(totalSales)} icon={TrendingUp} colorScheme="emerald" />
        <StatCard title="Payments Collected" value={formatPKR(totalReceived)} icon={DollarSign} colorScheme="emerald" />
        <StatCard title="Total Purchases" value={formatPKR(totalPurchases)} icon={ShoppingBag} colorScheme="indigo" />
        <StatCard title="Operating Expenses" value={formatPKR(totalExpenses)} icon={Wallet} colorScheme="rose" />
      </div>

      {/* Branch Performance Comparison Chart */}
      {reportType === 'branch' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Branch Revenue vs Expense Comparison
          </h3>
          <div className="h-80 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branchData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                <XAxis dataKey="branchName" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(val) => `Rs.${val/1000}k`} />
                <Tooltip formatter={(value: any) => [formatPKR(Number(value)), 'Amount']} />
                <Legend />
                <Bar dataKey="sales" name="Sales Revenue" fill="#16a34a" radius={[6, 6, 0, 0]} />
                <Bar dataKey="expenses" name="Operating Expenses" fill="#dc2626" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Sales Report Table */}
      {reportType === 'sales' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Sales & Receivables Aging Breakdown
          </h3>
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                <tr>
                  <th className="p-3">Bill No</th>
                  <th className="p-3">Customer Party</th>
                  <th className="p-3">Bill Date</th>
                  <th className="p-3 text-right">Grand Total</th>
                  <th className="p-3 text-right">Received</th>
                  <th className="p-3 text-right">Remaining Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {activeSalesBills.map(b => (
                  <tr key={b.id}>
                    <td className="p-3 font-mono font-bold text-emerald-600">{b.billNumber}</td>
                    <td className="p-3 font-medium">{b.partyName}</td>
                    <td className="p-3">{formatDate(b.billDate)}</td>
                    <td className="p-3 text-right font-bold">{formatPKR(b.grandTotal)}</td>
                    <td className="p-3 text-right text-emerald-600 font-semibold">{formatPKR(b.receivedAmount)}</td>
                    <td className="p-3 text-right text-rose-600 font-bold">{formatPKR(b.remainingAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Expenses Report */}
      {reportType === 'expenses' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Operating Expense Breakdown Log
          </h3>
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                <tr>
                  <th className="p-3">Expense #</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Title</th>
                  <th className="p-3">Date</th>
                  <th className="p-3 text-right">Amount (PKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {expenses.map(e => (
                  <tr key={e.id}>
                    <td className="p-3 font-mono text-rose-600 font-bold">{e.expenseNumber}</td>
                    <td className="p-3 font-semibold">{e.category}</td>
                    <td className="p-3">{e.title}</td>
                    <td className="p-3">{formatDate(e.expenseDate)}</td>
                    <td className="p-3 text-right font-bold text-rose-600">{formatPKR(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Collections Report */}
      {reportType === 'payments' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Customer Payments Collection Summary
          </h3>
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                <tr>
                  <th className="p-3">Receipt No</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Method</th>
                  <th className="p-3">Date</th>
                  <th className="p-3 text-right">Amount (PKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {activePayments.map(p => (
                  <tr key={p.id}>
                    <td className="p-3 font-mono text-emerald-600 font-bold">{p.receiptNumber}</td>
                    <td className="p-3 font-medium">{p.partyName}</td>
                    <td className="p-3">{p.paymentMethod}</td>
                    <td className="p-3">{formatDate(p.paymentDate)}</td>
                    <td className="p-3 text-right font-bold text-emerald-600">{formatPKR(p.amountReceived)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Missing Proofs Compliance Audit Table */}
      {reportType === 'missing_proofs' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                Missing Document Proofs & Compliance Audit Log
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Financial records without attached invoices, payment slips, or expense receipts.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
              {totalMissingProofCount} Items Flagged
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                <tr>
                  <th className="p-3">Record Type</th>
                  <th className="p-3">Doc / Ref No</th>
                  <th className="p-3">Party / Vendor</th>
                  <th className="p-3">Date</th>
                  <th className="p-3 text-right">Amount (PKR)</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {missingProofSales.map(b => (
                  <tr key={b.id} className="hover:bg-rose-50/40 dark:hover:bg-rose-950/20">
                    <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">Sales Bill</td>
                    <td className="p-3 font-mono text-emerald-600 font-bold">{b.billNumber}</td>
                    <td className="p-3">{b.partyName}</td>
                    <td className="p-3">{formatDate(b.billDate)}</td>
                    <td className="p-3 text-right font-bold">{formatPKR(b.grandTotal)}</td>
                    <td className="p-3 text-center">
                      <ProofBadge status="Proof Missing" />
                    </td>
                  </tr>
                ))}
                {missingProofPayments.map(p => (
                  <tr key={p.id} className="hover:bg-rose-50/40 dark:hover:bg-rose-950/20">
                    <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">Payment Received</td>
                    <td className="p-3 font-mono text-emerald-600 font-bold">{p.receiptNumber}</td>
                    <td className="p-3">{p.partyName}</td>
                    <td className="p-3">{formatDate(p.paymentDate)}</td>
                    <td className="p-3 text-right font-bold text-emerald-600">{formatPKR(p.amountReceived)}</td>
                    <td className="p-3 text-center">
                      <ProofBadge status="Proof Missing" />
                    </td>
                  </tr>
                ))}
                {missingProofPurchases.map(pb => (
                  <tr key={pb.id} className="hover:bg-rose-50/40 dark:hover:bg-rose-950/20">
                    <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">Purchase Bill</td>
                    <td className="p-3 font-mono text-indigo-600 font-bold">{pb.billNumber}</td>
                    <td className="p-3">{pb.supplierName}</td>
                    <td className="p-3">{formatDate(pb.billDate)}</td>
                    <td className="p-3 text-right font-bold">{formatPKR(pb.grandTotal)}</td>
                    <td className="p-3 text-center">
                      <ProofBadge status="Proof Missing" />
                    </td>
                  </tr>
                ))}
                {missingProofExpenses.map(e => (
                  <tr key={e.id} className="hover:bg-rose-50/40 dark:hover:bg-rose-950/20">
                    <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">Expense Claim</td>
                    <td className="p-3 font-mono text-rose-600 font-bold">{e.expenseNumber}</td>
                    <td className="p-3">{e.paidTo} ({e.title})</td>
                    <td className="p-3">{formatDate(e.expenseDate)}</td>
                    <td className="p-3 text-right font-bold text-rose-600">{formatPKR(e.amount)}</td>
                    <td className="p-3 text-center">
                      <ProofBadge status="Proof Missing" />
                    </td>
                  </tr>
                ))}
                {totalMissingProofCount === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-emerald-600 font-semibold">
                      All transaction records have valid proofs attached! Full audit compliance achieved.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* WHATSAPP SHARE MODAL */}
      <WhatsAppShareModal
        isOpen={isWAModalOpen}
        onClose={() => setIsWAModalOpen(false)}
        defaultPhone=""
        defaultMessage={getWAMessage()}
        title="Message Financial Report on WhatsApp"
        recipientLabel={branchName}
        referenceNumber={`RPT-${Date.now().toString().slice(-4)}`}
        onDownloadDocument={handleDownloadReportPDF}
      />

    </div>
  );
};
