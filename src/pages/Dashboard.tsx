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
  FileText
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  BarChart,
  Bar,
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

  // Dynamic expense category data calculated from filtered expenses
  const expenseByCategory = filteredExpenses.reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
    return acc;
  }, {} as Record<string, number>);

  const dynamicCategoryList = Object.entries(expenseByCategory).map(([category, amount]) => ({
    category,
    amount
  })).sort((a, b) => b.amount - a.amount);

  const expenseCategoryData = dynamicCategoryList.length > 0 
    ? dynamicCategoryList.slice(0, 5)
    : [
        { category: 'Salaries', amount: 380000 },
        { category: 'Electricity', amount: 145000 },
        { category: 'Packaging', amount: 42000 },
        { category: 'Fuel', amount: 35000 },
        { category: 'Machinery', amount: 28000 },
      ];

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Factory Management
            </span>
            <span className="text-xs text-slate-400">
              Branch Scope: {selectedBranchId === 'all' ? `All Factory Branches (${branches.length} Factories)` : branches.find(b => b.id === selectedBranchId)?.name}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-2">
            Masala Factory Dashboard
          </h1>
          <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-xl">
            Real-time overview of sales bills, customer payments, supplier payables, operating expenses, and payment schedules.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="relative z-10 flex flex-wrap items-center gap-2">
          <button
            onClick={() => navigate('/sales')}
            className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-950/50 flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            New Sales Bill
          </button>
          <button
            onClick={() => navigate('/payments')}
            className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-xs border border-white/10 flex items-center gap-1.5 transition-all"
          >
            <Receipt className="w-4 h-4" />
            Record Payment
          </button>
          <button
            onClick={() => setIsPurchaseModalOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-950/50 flex items-center gap-1.5 transition-all"
          >
            <ShoppingBag className="w-4 h-4" />
            New Purchase
          </button>
          <button
            onClick={() => setIsExpenseModalOpen(true)}
            className="px-3.5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-950/50 flex items-center gap-1.5 transition-all"
          >
            <Wallet className="w-4 h-4" />
            New Expense
          </button>
        </div>
      </div>

      {/* Overdue Alert Banner if any */}
      {overdueItems.length > 0 && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
            <div className="text-xs">
              <span className="font-bold">Attention: {overdueItems.length} Payment(s) Overdue!</span>
              <span className="block text-rose-600/80 dark:text-rose-300/80 mt-0.5">
                Total overdue receivables: {formatPKR(overdueItems.reduce((sum, item) => sum + item.remainingAmount, 0))}
              </span>
            </div>
          </div>
          <button
            onClick={() => navigate('/schedule?tab=receive')}
            className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors"
          >
            View Overdue
          </button>
        </div>
      )}

      {/* KPI Stat Cards Grid (8 Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Sales"
          value={formatPKR(totalSales)}
          subtext={`${filteredBills.length} Sales Bills Recorded`}
          icon={TrendingUp}
          colorScheme="emerald"
          badgeText="Active"
          badgeType="success"
          onClick={() => navigate('/sales')}
        />
        <StatCard
          title="Payments Received"
          value={formatPKR(totalReceived)}
          subtext={`${filteredPayments.length} Payment Receipts`}
          icon={DollarSign}
          colorScheme="emerald"
          badgeText="Collected"
          badgeType="success"
          onClick={() => navigate('/payments')}
        />
        <StatCard
          title="Total Outstanding"
          value={formatPKR(totalOutstanding)}
          subtext="Pending Customer Receivables"
          icon={Clock}
          colorScheme="amber"
          badgeText="Pending"
          badgeType="warning"
          onClick={() => navigate('/schedule?tab=receive')}
        />
        <StatCard
          title="Total Purchases"
          value={formatPKR(totalPurchases)}
          subtext={`${filteredPurchases.length} Supplier Bills`}
          icon={ShoppingBag}
          colorScheme="indigo"
          onClick={() => navigate('/purchases')}
        />
        <StatCard
          title="Total Expenses"
          value={formatPKR(totalExpenses)}
          subtext={`${filteredExpenses.length} Factory Expense Claims`}
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

      {/* Analytics Charts & Recent Transactions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sales Trend Chart (2 Cols) */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Monthly Sales & Collection Performance
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Comparison of total invoiced sales vs actual cash collections in PKR.
              </p>
            </div>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg">
              PKR Currency
            </span>
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorReceived" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d97706" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#d97706" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickFormatter={(val) => `Rs.${val/1000}k`} />
                <Tooltip 
                  formatter={(value: any) => [formatPKR(Number(value)), 'Amount']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '12px' }}
                />
                <Legend />
                <Area type="monotone" dataKey="sales" name="Total Invoiced Sales" stroke="#16a34a" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
                <Area type="monotone" dataKey="received" name="Payments Received" stroke="#d97706" strokeWidth={2} fillOpacity={1} fill="url(#colorReceived)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Upcoming Payment Reminders Widget (1 Col) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Schedule Reminders
            </h3>
            <button 
              onClick={() => navigate('/schedule')} 
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              View All
            </button>
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {filteredSchedule.length > 0 ? (
              filteredSchedule.slice(0, 5).map(item => (
                <div 
                  key={item.id}
                  className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-200 transition-colors flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-slate-900 dark:text-white">{item.partyName}</span>
                      <StatusBadge status={item.status} size="sm" />
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Due: {formatDate(item.dueDate)} {item.relatedBillNumber ? `(${item.relatedBillNumber})` : ''}
                    </div>
                  </div>
                  <div className="text-right">
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

      {/* Recent Transactions Feed */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Recent Sales & Bills
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Latest sales bills recorded with real-time payment reconciliation.
            </p>
          </div>
          <button 
            onClick={() => navigate('/sales')}
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            View All Sales
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
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
                  <tr key={bill.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
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
