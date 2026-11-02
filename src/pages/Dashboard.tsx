import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatPKR, formatDate } from '../utils/formatters';
import { StatCard } from '../components/common/StatCard';
import { StatusBadge } from '../components/common/StatusBadge';
import { QuickPurchaseModal } from '../components/dashboard/QuickPurchaseModal';
import { QuickExpenseModal } from '../components/dashboard/QuickExpenseModal';
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  ShoppingBag, 
  Wallet, 
  AlertTriangle, 
  Calendar, 
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Receipt,
  FileText,
  Activity,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  Phone,
  Building2,
  Sparkles
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  Legend
} from 'recharts';
import { useNavigate } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { 
    salesBills, 
    paymentsReceived, 
    purchases, 
    expenses, 
    scheduleItems, 
    selectedBranchId,
    branches
  } = useApp();

  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  // Filter dataset based on selected branch
  const filterByBranch = <T extends { branchId: string }>(items: T[]): T[] => {
    if (selectedBranchId === 'all') return items;
    return items.filter(item => item.branchId === selectedBranchId);
  };

  // Exclude soft-deleted sales bills from active KPI totals and feeds
  const activeBills = salesBills.filter(b => !b.isDeleted);
  const filteredBills = filterByBranch(activeBills);
  const filteredPayments = filterByBranch(paymentsReceived);
  const filteredPurchases = filterByBranch(purchases);
  const filteredExpenses = filterByBranch(expenses);
  const filteredSchedule = filterByBranch(scheduleItems);

  // Compute KPI metrics
  const totalSales = filteredBills.reduce((sum, b) => sum + b.grandTotal, 0);
  const totalReceived = filteredPayments.reduce((sum, p) => sum + p.amountReceived, 0);
  const totalOutstanding = filteredBills.reduce((sum, b) => sum + b.remainingAmount, 0);
  const totalPurchases = filteredPurchases.reduce((sum, p) => sum + p.grandTotal, 0);
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalOutflows = totalPurchases + totalExpenses;
  const netCashFlow = totalReceived - totalOutflows;

  // Collection efficiency rate
  const collectionRate = totalSales > 0 ? Math.min(100, Math.round((totalReceived / totalSales) * 100)) : 100;

  const dueTodayItems = filteredSchedule.filter(s => s.status === 'Due Today');
  const overdueItems = filteredSchedule.filter(s => s.status === 'Overdue');
  const upcomingItems = filteredSchedule.filter(s => s.status === 'Upcoming');

  // Chart data preparation
  const salesChartData = [
    { month: 'May', sales: 420000, received: 380000 },
    { month: 'Jun', sales: 580000, received: 510000 },
    { month: 'Jul', sales: 620000, received: 600000 },
    { month: 'Aug', sales: 510000, received: 490000 },
    { month: 'Sep', sales: 740000, received: 680000 },
    { month: 'Oct', sales: totalSales, received: totalReceived },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      
      {/* MOBILE NATIVE APP HEADER (< sm) */}
      <div className="block sm:hidden space-y-3">
        {/* User Greeting & Branch Pill */}
        <div className="flex items-center justify-between px-1">
          <div>
            <span className="text-[11px] text-slate-400 font-medium block">Welcome back,</span>
            <h1 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
              Factory Dashboard
            </h1>
          </div>
          <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800/60 px-2.5 py-1 rounded-full flex items-center gap-1">
            <Building2 className="w-3 h-3 text-emerald-500" />
            {selectedBranchId === 'all' ? 'All Factories' : branches.find(b => b.id === selectedBranchId)?.name?.split(' ')[0]}
          </span>
        </div>

        {/* Native 4-Button App Quick Launcher */}
        <div className="grid grid-cols-4 gap-2 pt-1">
          <button
            onClick={() => navigate('/sales')}
            className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 active:scale-95 transition-transform"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-900/30 mb-1">
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </div>
            <span className="text-[11px] font-bold text-slate-900 dark:text-white tracking-tight">New Bill</span>
          </button>

          <button
            onClick={() => navigate('/payments')}
            className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 active:scale-95 transition-transform"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-900/30 mb-1">
              <Receipt className="w-5 h-5 stroke-[2.5]" />
            </div>
            <span className="text-[11px] font-bold text-slate-900 dark:text-white tracking-tight">Receive</span>
          </button>

          <button
            onClick={() => setIsPurchaseModalOpen(true)}
            className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 active:scale-95 transition-transform"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-900/30 mb-1">
              <ShoppingBag className="w-5 h-5 stroke-[2.5]" />
            </div>
            <span className="text-[11px] font-bold text-slate-900 dark:text-white tracking-tight">Purchase</span>
          </button>

          <button
            onClick={() => setIsExpenseModalOpen(true)}
            className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-800/60 active:scale-95 transition-transform"
          >
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-900/30 mb-1">
              <Wallet className="w-5 h-5 stroke-[2.5]" />
            </div>
            <span className="text-[11px] font-bold text-slate-900 dark:text-white tracking-tight">Expense</span>
          </button>
        </div>
      </div>

      {/* DESKTOP HEADER BANNER (hidden on mobile, visible on sm+) */}
      <div className="hidden sm:block p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white shadow-xl relative overflow-hidden border border-emerald-900/40">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Factory Management System
              </span>
              <span className="text-xs text-slate-300 flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-md border border-white/10">
                <Building2 className="w-3 h-3 text-emerald-400" />
                {selectedBranchId === 'all' ? `All Factory Branches (${branches.length})` : branches.find(b => b.id === selectedBranchId)?.name}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-2 text-white">
              Masala Factory Executive Dashboard
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-xl">
              Real-time oversight of sales invoices, payment collections, supplier liabilities, and operating cashflow.
            </p>
          </div>

          {/* Quick Action Buttons on Desktop */}
          <div className="flex flex-wrap items-center gap-2 mt-2 md:mt-0">
            <button
              onClick={() => navigate('/sales')}
              className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-950/40 flex items-center justify-center gap-1.5 transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Bill</span>
            </button>
            <button
              onClick={() => navigate('/payments')}
              className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-xs border border-white/15 flex items-center justify-center gap-1.5 transition-all active:scale-95"
            >
              <Receipt className="w-3.5 h-3.5 text-emerald-400" />
              <span>Record Pay</span>
            </button>
            <button
              onClick={() => setIsPurchaseModalOpen(true)}
              className="px-3.5 py-2.5 rounded-xl bg-indigo-600/90 hover:bg-indigo-600 text-white text-xs font-semibold shadow-md shadow-indigo-950/40 flex items-center justify-center gap-1.5 transition-all active:scale-95"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>New Purchase</span>
            </button>
            <button
              onClick={() => setIsExpenseModalOpen(true)}
              className="px-3.5 py-2.5 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-semibold shadow-md shadow-rose-950/40 flex items-center justify-center gap-1.5 transition-all active:scale-95"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>New Expense</span>
            </button>
          </div>
        </div>
      </div>

      {/* Executive Financial Health & Collection Efficiency Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/40">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Executive Cashflow & Collection Efficiency
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                Live ratio of billed customer revenue collected into factory accounts
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs text-slate-500 dark:text-slate-400">Collection Rate</div>
              <div className="text-base sm:text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                {collectionRate}%
              </div>
            </div>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />
            <div className="text-right hidden sm:block">
              <div className="text-xs text-slate-500 dark:text-slate-400">Net Cash Flow</div>
              <div className={`text-base font-extrabold ${netCashFlow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {formatPKR(netCashFlow)}
              </div>
            </div>
          </div>
        </div>

        {/* Dual Progress Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex shadow-inner">
            <div 
              style={{ width: `${collectionRate}%` }} 
              className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500 rounded-l-full" 
              title={`Collected: ${formatPKR(totalReceived)} (${collectionRate}%)`}
            />
            <div 
              style={{ width: `${100 - collectionRate}%` }} 
              className="h-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500" 
              title={`Pending: ${formatPKR(totalOutstanding)} (${100 - collectionRate}%)`}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              Collected: <strong className="text-slate-900 dark:text-white">{formatPKR(totalReceived)}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
              Pending Receivables: <strong className="text-slate-900 dark:text-white">{formatPKR(totalOutstanding)}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Overdue Alert Banner if any */}
      {overdueItems.length > 0 && (
        <div className="p-3.5 sm:p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
            <div className="text-xs">
              <span className="font-bold">Attention: {overdueItems.length} Payment(s) Overdue!</span>
              <span className="block text-rose-600/80 dark:text-rose-300/80 mt-0.5 text-[11px] sm:text-xs">
                Total overdue: {formatPKR(overdueItems.reduce((sum, item) => sum + item.remainingAmount, 0))}
              </span>
            </div>
          </div>
          <button
            onClick={() => navigate('/schedule?tab=receive')}
            className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-rose-600 text-white text-[11px] sm:text-xs font-semibold hover:bg-rose-700 transition-colors shrink-0"
          >
            View Overdue
          </button>
        </div>
      )}

      {/* KPI Stat Cards Grid - 2 cols on mobile, 4 cols on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <StatCard
          title="Total Sales"
          value={formatPKR(totalSales)}
          subtext={`${filteredBills.length} Sales Bills`}
          icon={TrendingUp}
          colorScheme="emerald"
          badgeText="Active"
          badgeType="success"
          onClick={() => navigate('/sales')}
        />
        <StatCard
          title="Payments Received"
          value={formatPKR(totalReceived)}
          subtext={`${filteredPayments.length} Receipts`}
          icon={DollarSign}
          colorScheme="emerald"
          badgeText="Collected"
          badgeType="success"
          onClick={() => navigate('/payments')}
        />
        <StatCard
          title="Total Outstanding"
          value={formatPKR(totalOutstanding)}
          subtext="Pending Receivables"
          icon={Clock}
          colorScheme="amber"
          badgeText="Pending"
          badgeType="warning"
          onClick={() => navigate('/schedule?tab=receive')}
        />
        <StatCard
          title="Total Purchases"
          value={formatPKR(totalPurchases)}
          subtext={`${filteredPurchases.length} Raw Materials`}
          icon={ShoppingBag}
          colorScheme="indigo"
          onClick={() => navigate('/purchases')}
        />
        <StatCard
          title="Total Expenses"
          value={formatPKR(totalExpenses)}
          subtext={`${filteredExpenses.length} Expense Claims`}
          icon={Wallet}
          colorScheme="rose"
          onClick={() => navigate('/expenses')}
        />
        <StatCard
          title="Payments Due Today"
          value={`${dueTodayItems.length} Due`}
          subtext={formatPKR(dueTodayItems.reduce((sum, i) => sum + i.remainingAmount, 0))}
          icon={Calendar}
          colorScheme="amber"
          badgeText="Today"
          badgeType="warning"
          onClick={() => navigate('/schedule')}
        />
        <StatCard
          title="Payments Overdue"
          value={`${overdueItems.length} Overdue`}
          subtext={formatPKR(overdueItems.reduce((sum, i) => sum + i.remainingAmount, 0))}
          icon={AlertTriangle}
          colorScheme="rose"
          badgeText="Critical"
          badgeType="danger"
          onClick={() => navigate('/schedule')}
        />
        <StatCard
          title="Upcoming Payments"
          value={`${upcomingItems.length} Scheduled`}
          subtext={formatPKR(upcomingItems.reduce((sum, i) => sum + i.remainingAmount, 0))}
          icon={Clock}
          colorScheme="blue"
          badgeText="Upcoming"
          badgeType="info"
          onClick={() => navigate('/schedule')}
        />
      </div>

      {/* Analytics Charts & Upcoming Reminders Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        
        {/* Sales Trend Chart (2 Cols) */}
        <div className="lg:col-span-2 p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Sales & Collection Trend
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                Invoiced sales versus verified payment cash inflows (PKR)
              </p>
            </div>
            <span className="text-[11px] sm:text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-100 dark:border-emerald-800/40">
              PKR / Rs.
            </span>
          </div>

          <div className="h-60 sm:h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorReceived" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d97706" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#d97706" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10 }} tickFormatter={(val) => `Rs.${val/1000}k`} />
                <Tooltip 
                  formatter={(value: any) => [formatPKR(Number(value)), 'Amount']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '12px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Area type="monotone" dataKey="sales" name="Invoiced Sales" stroke="#059669" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSales)" />
                <Area type="monotone" dataKey="received" name="Collected Cash" stroke="#d97706" strokeWidth={2.5} fillOpacity={1} fill="url(#colorReceived)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Upcoming Payment Reminders Widget (1 Col) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Schedule Reminders
            </h3>
            <button 
              onClick={() => navigate('/schedule')} 
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {filteredSchedule.length > 0 ? (
              filteredSchedule.slice(0, 5).map(item => (
                <div 
                  key={item.id}
                  onClick={() => navigate('/schedule')}
                  className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-emerald-300 dark:hover:border-slate-700 transition-colors flex items-center justify-between cursor-pointer active:scale-98"
                >
                  <div className="space-y-0.5 min-w-0 pr-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-xs text-slate-900 dark:text-white truncate max-w-[120px]">{item.partyName}</span>
                      <StatusBadge status={item.status} size="sm" />
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      Due: {formatDate(item.dueDate)} {item.relatedBillNumber ? `(${item.relatedBillNumber})` : ''}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-xs text-slate-900 dark:text-white block">
                      {formatPKR(item.remainingAmount)}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {item.type === 'ToReceive' ? 'Receivable' : 'Payable'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No active schedule reminders.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Transactions Feed - Dual View (Mobile Cards + Desktop Table) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Recent Sales & Invoices
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
              Latest sales bills with real-time payment reconciliation
            </p>
          </div>
          <button 
            onClick={() => navigate('/sales')}
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Mobile View: High-End Stack of Cards (< sm) */}
        <div className="block sm:hidden space-y-2.5">
          {filteredBills.length > 0 ? (
            filteredBills.slice(0, 5).map((bill) => (
              <div 
                key={bill.id}
                onClick={() => navigate('/sales')}
                className="p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 space-y-2.5 active:bg-slate-100 dark:active:bg-slate-800 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      {bill.billNumber}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {formatDate(bill.billDate)}
                    </span>
                  </div>
                  <StatusBadge status={bill.status} size="sm" />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      {bill.partyName}
                    </h4>
                    {bill.partyPhone && (
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Phone className="w-2.5 h-2.5" />
                        {bill.partyPhone}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Grand Total</span>
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                      {formatPKR(bill.grandTotal)}
                    </span>
                  </div>
                </div>

                {/* Received & Remaining Micro-Pills */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px]">
                  <div className="bg-emerald-50 dark:bg-emerald-950/30 p-1.5 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block">Received</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-300">
                      {formatPKR(bill.receivedAmount)}
                    </span>
                  </div>
                  <div className="bg-rose-50 dark:bg-rose-950/30 p-1.5 rounded-lg border border-rose-100 dark:border-rose-900/30 text-right">
                    <span className="text-[10px] text-rose-600 dark:text-rose-400 block">Remaining</span>
                    <span className="font-bold text-rose-700 dark:text-rose-300">
                      {formatPKR(bill.remainingAmount)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">
              No sales bills recorded for the selected branch.
            </div>
          )}
        </div>

        {/* Desktop View: Full Responsive Table (>= sm) */}
        <div className="hidden sm:block overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-3">Bill No</th>
                <th className="p-3">Customer Party</th>
                <th className="p-3">Bill Date</th>
                <th className="p-3">Line Items</th>
                <th className="p-3 text-right">Grand Total</th>
                <th className="p-3 text-right">Received</th>
                <th className="p-3 text-right">Remaining</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredBills.length > 0 ? (
                filteredBills.slice(0, 5).map((bill) => (
                  <tr key={bill.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-3 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      {bill.billNumber}
                    </td>
                    <td className="p-3 font-medium text-slate-900 dark:text-white">
                      {bill.partyName}
                    </td>
                    <td className="p-3 text-slate-500">
                      {formatDate(bill.billDate)}
                    </td>
                    <td className="p-3 max-w-xs truncate text-slate-600 dark:text-slate-300">
                      {bill.items.map(i => `${i.productName} (${i.quantity} ${i.unit})`).join(', ')}
                    </td>
                    <td className="p-3 text-right font-bold text-slate-900 dark:text-white">
                      {formatPKR(bill.grandTotal)}
                    </td>
                    <td className="p-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatPKR(bill.receivedAmount)}
                    </td>
                    <td className="p-3 text-right font-semibold text-rose-600 dark:text-rose-400">
                      {formatPKR(bill.remainingAmount)}
                    </td>
                    <td className="p-3 text-center">
                      <StatusBadge status={bill.status} size="sm" />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-400">
                    No sales bills recorded for the selected branch.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* QUICK ACTION MODALS */}
      <QuickPurchaseModal
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
      />

      <QuickExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
      />

    </div>
  );
};
