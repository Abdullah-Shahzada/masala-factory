import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  MapPin, 
  Phone, 
  Mail, 
  CheckCircle2, 
  XCircle, 
  Edit3, 
  Eye, 
  ShieldCheck, 
  TrendingUp, 
  ShoppingBag, 
  Wallet, 
  AlertCircle,
  X,
  FileSpreadsheet,
  ArrowRight,
  Filter,
  Check
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Factory, FactoryStatus } from '../types';

export const Factories: React.FC = () => {
  const { 
    factories, 
    addFactory, 
    updateFactory, 
    toggleFactoryStatus,
    salesBills,
    purchases,
    expenses,
    setSelectedBranchId
  } = useApp();

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | FactoryStatus>('All');
  const [cityFilter, setCityFilter] = useState<string>('All');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingFactory, setEditingFactory] = useState<Factory | null>(null);
  const [viewingFactory, setViewingFactory] = useState<Factory | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    city: '',
    address: '',
    phone: '',
    email: '',
    status: 'Active' as FactoryStatus,
    notes: '',
    isMain: false
  });
  const [formError, setFormError] = useState<string | null>(null);

  // Distinct cities for filter
  const distinctCities = useMemo(() => {
    const set = new Set<string>();
    factories.forEach(f => {
      if (f.city) set.add(f.city.trim());
    });
    return Array.from(set).sort();
  }, [factories]);

  // Per-factory financial calculations
  const factoryMetrics = useMemo(() => {
    const map = new Map<string, {
      totalSales: number;
      pendingReceivables: number;
      totalPurchases: number;
      totalExpenses: number;
      salesCount: number;
      purchasesCount: number;
      expensesCount: number;
    }>();

    factories.forEach(f => {
      map.set(f.id, {
        totalSales: 0,
        pendingReceivables: 0,
        totalPurchases: 0,
        totalExpenses: 0,
        salesCount: 0,
        purchasesCount: 0,
        expensesCount: 0
      });
    });

    salesBills.forEach(b => {
      const metric = map.get(b.branchId);
      if (metric) {
        metric.totalSales += (b.grandTotal || 0);
        metric.pendingReceivables += (b.remainingAmount || 0);
        metric.salesCount += 1;
      }
    });

    purchases.forEach(p => {
      const metric = map.get(p.branchId);
      if (metric) {
        metric.totalPurchases += (p.grandTotal || 0);
        metric.purchasesCount += 1;
      }
    });

    expenses.forEach(e => {
      const metric = map.get(e.branchId);
      if (metric) {
        metric.totalExpenses += (e.amount || 0);
        metric.expensesCount += 1;
      }
    });

    return map;
  }, [factories, salesBills, purchases, expenses]);

  // Filtered factories
  const filteredFactories = useMemo(() => {
    return factories.filter(f => {
      const matchesSearch = 
        f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (f.email && f.email.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = statusFilter === 'All' || f.status === statusFilter;
      const matchesCity = cityFilter === 'All' || f.city.toLowerCase() === cityFilter.toLowerCase();

      return matchesSearch && matchesStatus && matchesCity;
    });
  }, [factories, searchTerm, statusFilter, cityFilter]);

  // Overall KPI counts
  const totalCount = factories.length;
  const activeCount = factories.filter(f => f.status === 'Active').length;
  const inactiveCount = factories.filter(f => f.status === 'Inactive').length;

  // Open Add Modal
  const handleOpenAdd = () => {
    // Generate suggested code
    const count = factories.length + 1;
    const codeSuggestion = `FAC-${count.toString().padStart(2, '0')}`;
    setFormData({
      code: codeSuggestion,
      name: '',
      city: 'Multan',
      address: '',
      phone: '',
      email: '',
      status: 'Active',
      notes: '',
      isMain: false
    });
    setFormError(null);
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (factory: Factory) => {
    setEditingFactory(factory);
    setFormData({
      code: factory.code,
      name: factory.name,
      city: factory.city,
      address: factory.address,
      phone: factory.phone,
      email: factory.email || '',
      status: factory.status,
      notes: factory.notes || '',
      isMain: !!factory.isMain
    });
    setFormError(null);
  };

  // Save new factory
  const handleCreateFactory = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name.trim()) {
      setFormError('Factory name is required.');
      return;
    }
    if (!formData.code.trim()) {
      setFormError('Factory code is required.');
      return;
    }
    if (!formData.city.trim()) {
      setFormError('City is required.');
      return;
    }
    if (!formData.address.trim()) {
      setFormError('Address is required.');
      return;
    }
    if (!formData.phone.trim()) {
      setFormError('Contact phone is required.');
      return;
    }

    try {
      addFactory({
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        city: formData.city.trim(),
        address: formData.address.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || undefined,
        status: formData.status,
        notes: formData.notes.trim() || undefined,
        isMain: formData.isMain
      });
      setIsAddModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to create factory.');
    }
  };

  // Save updated factory
  const handleUpdateFactory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFactory) return;
    setFormError(null);

    if (!formData.name.trim()) {
      setFormError('Factory name is required.');
      return;
    }
    if (!formData.code.trim()) {
      setFormError('Factory code is required.');
      return;
    }
    if (!formData.city.trim()) {
      setFormError('City is required.');
      return;
    }
    if (!formData.address.trim()) {
      setFormError('Address is required.');
      return;
    }
    if (!formData.phone.trim()) {
      setFormError('Contact phone is required.');
      return;
    }

    try {
      updateFactory(editingFactory.id, {
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        city: formData.city.trim(),
        address: formData.address.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || undefined,
        status: formData.status,
        notes: formData.notes.trim() || undefined,
        isMain: formData.isMain
      });
      setEditingFactory(null);
    } catch (err: any) {
      setFormError(err.message || 'Failed to update factory.');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
              <Building2 className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Factory Management
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configure, monitor, and scale manufacturing plants and distribution hubs across Pakistan.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-semibold text-sm shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Factory</span>
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Factories
            </span>
            <span className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <Building2 className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">{totalCount}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Permanent units</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Active Factories
            </span>
            <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{activeCount}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">In production</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Inactive Factories
            </span>
            <span className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
              <XCircle className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-700 dark:text-slate-300">{inactiveCount}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Archived/paused</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
              Cities Covered
            </span>
            <span className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400">
              <MapPin className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-sky-600 dark:text-sky-400">{distinctCities.length}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">{distinctCities.join(', ') || 'None'}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by factory name, code, city, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active Only</option>
            <option value="Inactive">Inactive Only</option>
          </select>

          {/* City Filter */}
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="All">All Cities</option>
            {distinctCities.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Permanent Record Safety Notice */}
      <div className="rounded-xl border border-amber-200/80 dark:border-amber-900/40 bg-amber-50/70 dark:bg-amber-950/20 p-3.5 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
          <span className="font-semibold">Permanent Business Architecture:</span> Factories represent permanent operational centers linked to invoices, purchases, and ledger balance histories. In accordance with system financial integrity rules, factories cannot be deleted. If a facility ceases operations, toggle its status to <span className="font-semibold">Inactive</span> to remove it from active bill creation while preserving all historical records and reports.
        </div>
      </div>

      {/* Factories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5">
        {filteredFactories.map(factory => {
          const metrics = factoryMetrics.get(factory.id) || {
            totalSales: 0,
            pendingReceivables: 0,
            totalPurchases: 0,
            totalExpenses: 0,
            salesCount: 0,
            purchasesCount: 0,
            expensesCount: 0
          };

          return (
            <div
              key={factory.id}
              className={`bg-white dark:bg-slate-900 rounded-2xl border transition-all duration-200 p-5 shadow-xs flex flex-col justify-between ${
                factory.status === 'Active' 
                  ? 'border-slate-200/90 dark:border-slate-800 hover:border-emerald-500/50 hover:shadow-md' 
                  : 'border-slate-200/60 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 opacity-90'
              }`}
            >
              <div>
                {/* Header row: Code, Name, Status Badge */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                      {factory.code}
                    </span>
                    {factory.isMain && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
                        Primary Unit
                      </span>
                    )}
                  </div>

                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    factory.status === 'Active'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${factory.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    {factory.status}
                  </span>
                </div>

                {/* Factory Name & Location */}
                <div className="mt-3">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {factory.name}
                  </h3>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{factory.city}, Pakistan</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                    {factory.address}
                  </p>
                </div>

                {/* Contact info snippet */}
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{factory.phone}</span>
                  </div>
                  {factory.email ? (
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{factory.email}</span>
                    </div>
                  ) : (
                    <div className="text-slate-400 italic text-[11px]">No email specified</div>
                  )}
                </div>

                {/* Live Financial Metrics preview */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                    <div className="text-[10px] font-semibold uppercase text-slate-400">Sales</div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                      Rs. {metrics.totalSales.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-400">{metrics.salesCount} bills</div>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                    <div className="text-[10px] font-semibold uppercase text-slate-400">Purchases</div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                      Rs. {metrics.totalPurchases.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-400">{metrics.purchasesCount} bills</div>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                    <div className="text-[10px] font-semibold uppercase text-slate-400">Expenses</div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                      Rs. {metrics.totalExpenses.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-400">{metrics.expensesCount} records</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setViewingFactory(factory)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                    title="View Details & Business Summaries"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Details</span>
                  </button>

                  <button
                    onClick={() => handleOpenEdit(factory)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                    title="Edit Factory Settings"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleFactoryStatus(factory.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      factory.status === 'Active'
                        ? 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60'
                        : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60'
                    }`}
                    title={factory.status === 'Active' ? 'Deactivate factory (mark inactive)' : 'Reactivate factory'}
                  >
                    {factory.status === 'Active' ? 'Mark Inactive' : 'Activate'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredFactories.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
            <Building2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">
              No factories found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Try adjusting your search terms or filters, or add a new factory.
            </p>
          </div>
        )}
      </div>

      {/* CREATE FACTORY MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                  <Building2 className="w-5 h-5" />
                </span>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Add New Factory Branch
                </h2>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateFactory} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Factory Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MLT-03, KHI-02"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Must be unique across all factories.</p>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    City <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Multan, Karachi, Lahore"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Factory / Plant Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Multan Northern Grinding Mills"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Physical Address <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Complete factory address, street, industrial area..."
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Contact Phone <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+92 61 1234567"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="factory@masala.pk"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Operational Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as FactoryStatus })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Active">Active (In Production)</option>
                    <option value="Inactive">Inactive (Suspended / Not in use)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="isMainCheckbox"
                    checked={formData.isMain}
                    onChange={(e) => setFormData({ ...formData, isMain: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-600 cursor-pointer"
                  />
                  <label htmlFor="isMainCheckbox" className="font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                    Set as Primary Facility
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Notes / Operating Specifications
                </label>
                <textarea
                  rows={2}
                  placeholder="Facility capacity, packaging units, milling equipment info..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors shadow-xs"
                >
                  Create Factory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT FACTORY MODAL */}
      {editingFactory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400">
                  <Edit3 className="w-5 h-5" />
                </span>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Edit Factory: {editingFactory.name}
                </h2>
              </div>
              <button
                onClick={() => setEditingFactory(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateFactory} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Factory Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    City <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Factory Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Physical Address <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Contact Phone <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Operational Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as FactoryStatus })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Active">Active (In Production)</option>
                    <option value="Inactive">Inactive (Suspended / Closed)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="editIsMainCheckbox"
                    checked={formData.isMain}
                    onChange={(e) => setFormData({ ...formData, isMain: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-600 cursor-pointer"
                  />
                  <label htmlFor="editIsMainCheckbox" className="font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                    Primary Facility
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingFactory(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW FACTORY DETAILS MODAL / DRAWER */}
      {viewingFactory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                    {viewingFactory.code}
                  </span>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    viewingFactory.status === 'Active'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${viewingFactory.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    {viewingFactory.status}
                  </span>
                  {viewingFactory.isMain && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
                      Primary Unit
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-2">
                  {viewingFactory.name}
                </h2>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{viewingFactory.city}, Pakistan</span>
                </div>
              </div>

              <button
                onClick={() => setViewingFactory(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Physical Address</span>
                <span className="text-slate-800 dark:text-slate-200 font-medium mt-0.5 block">{viewingFactory.address}</span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Contact Phone</span>
                <span className="text-slate-800 dark:text-slate-200 font-medium mt-0.5 block">{viewingFactory.phone}</span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Email Address</span>
                <span className="text-slate-800 dark:text-slate-200 font-medium mt-0.5 block">{viewingFactory.email || 'None recorded'}</span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Registered Date</span>
                <span className="text-slate-800 dark:text-slate-200 font-medium mt-0.5 block">{new Date(viewingFactory.createdAt).toLocaleDateString('en-PK', { dateStyle: 'medium' })}</span>
              </div>
            </div>

            {viewingFactory.notes && (
              <div className="mt-3 text-xs bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Operational Specifications</span>
                <p className="text-slate-700 dark:text-slate-300">{viewingFactory.notes}</p>
              </div>
            )}

            {/* Financial Performance Summary */}
            <div className="mt-6">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                Factory Business Summary
              </h3>

              {(() => {
                const m = factoryMetrics.get(viewingFactory.id) || {
                  totalSales: 0,
                  pendingReceivables: 0,
                  totalPurchases: 0,
                  totalExpenses: 0,
                  salesCount: 0,
                  purchasesCount: 0,
                  expensesCount: 0
                };
                const netOperating = m.totalSales - m.totalPurchases - m.totalExpenses;

                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/60">
                      <div className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400">Total Sales</div>
                      <div className="text-sm font-bold text-emerald-800 dark:text-emerald-200 mt-1">
                        Rs. {m.totalSales.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">{m.salesCount} invoices</div>
                    </div>

                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/60">
                      <div className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-400">Uncollected Bills</div>
                      <div className="text-sm font-bold text-amber-800 dark:text-amber-200 mt-1">
                        Rs. {m.pendingReceivables.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">Pending cash</div>
                    </div>

                    <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/60">
                      <div className="text-[10px] font-bold uppercase text-blue-700 dark:text-blue-400">Raw Purchases</div>
                      <div className="text-sm font-bold text-blue-800 dark:text-blue-200 mt-1">
                        Rs. {m.totalPurchases.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5">{m.purchasesCount} bills</div>
                    </div>

                    <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200/60 dark:border-purple-900/60">
                      <div className="text-[10px] font-bold uppercase text-purple-700 dark:text-purple-400">Operating Expenses</div>
                      <div className="text-sm font-bold text-purple-800 dark:text-purple-200 mt-1">
                        Rs. {m.totalExpenses.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-purple-600 dark:text-purple-400 mt-0.5">{m.expensesCount} expenses</div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Modal Actions */}
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedBranchId(viewingFactory.id);
                  setViewingFactory(null);
                }}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold transition-colors"
              >
                <span>Filter Workspace to this Factory</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const toEdit = viewingFactory;
                    setViewingFactory(null);
                    handleOpenEdit(toEdit);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors"
                >
                  Edit Factory
                </button>
                <button
                  type="button"
                  onClick={() => setViewingFactory(null)}
                  className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold hover:opacity-90 transition-opacity"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
