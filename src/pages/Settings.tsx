import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatPKR } from '../utils/formatters';
import { Modal } from '../components/common/Modal';
import { CurrencyInput } from '../components/common/CurrencyInput';
import { 
  Settings as SettingsIcon, 
  Building2, 
  Package, 
  Plus, 
  Edit3, 
  Save, 
  Check,
  Globe,
  Sliders,
  ShieldCheck,
  Flame,
  Upload,
  Image as ImageIcon,
  Trash2,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Shield,
  Smartphone,
  Download
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Settings: React.FC = () => {
  const { 
    branches, 
    addBranch, 
    products, 
    addProduct, 
    updateProduct, 
    businessName, 
    setBusinessName,
    companyProfile,
    updateCompanyProfile 
  } = useApp();

  const { user, changePassword, isSupabaseMode } = useAuth();

  const [activeTab, setActiveTab] = useState<'business' | 'branches' | 'products' | 'security'>('business');

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [pwdError, setPwdError] = useState('');

  // Business Profile form
  const [profileData, setProfileData] = useState({
    name: companyProfile.name || businessName,
    logoUrl: companyProfile.logoUrl || '',
    address: companyProfile.address || '',
    city: companyProfile.city || '',
    phone: companyProfile.phone || '',
    email: companyProfile.email || '',
    taxNumber: companyProfile.taxNumber || ''
  });
  const [logoError, setLogoError] = useState('');
  const [bSaved, setBSaved] = useState(false);

  // Sync profileData when companyProfile updates from context/storage
  React.useEffect(() => {
    setProfileData({
      name: companyProfile.name || businessName,
      logoUrl: companyProfile.logoUrl || '',
      address: companyProfile.address || '',
      city: companyProfile.city || '',
      phone: companyProfile.phone || '',
      email: companyProfile.email || '',
      taxNumber: companyProfile.taxNumber || ''
    });
  }, [companyProfile, businessName]);

  // New Branch Form
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [branchName, setBranchName] = useState('');
  const [branchCode, setBranchCode] = useState('');
  const [branchCity, setBranchCity] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [branchPhone, setBranchPhone] = useState('');

  // New Product Form
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState('Formulated Spice Mix');
  const [prodUnit, setProdUnit] = useState('1kg Pack');
  const [prodRate, setProdRate] = useState<number>(1000);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setLogoError('');
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setLogoError('Please select a valid image file (PNG, JPG, SVG, WebP).');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setLogoError('Image size exceeds 2MB limit. Please upload a smaller logo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const rawDataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const pngDataUrl = canvas.toDataURL('image/png');
            setProfileData(prev => ({ ...prev, logoUrl: pngDataUrl }));
            updateCompanyProfile({ ...profileData, logoUrl: pngDataUrl });
            return;
          }
        } catch {
          // fallback to rawDataUrl
        }
        setProfileData(prev => ({ ...prev, logoUrl: rawDataUrl }));
        updateCompanyProfile({ ...profileData, logoUrl: rawDataUrl });
      };
      img.onerror = () => {
        setProfileData(prev => ({ ...prev, logoUrl: rawDataUrl }));
        updateCompanyProfile({ ...profileData, logoUrl: rawDataUrl });
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBusiness = (e: React.FormEvent) => {
    e.preventDefault();
    updateCompanyProfile(profileData);
    setBusinessName(profileData.name);
    setBSaved(true);
    setTimeout(() => setBSaved(false), 2500);
  };

  const handleAddBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName || !branchCity) return;
    addBranch({
      name: branchName,
      code: branchCode || `BR-${branches.length + 1}`,
      city: branchCity,
      address: branchAddress,
      phone: branchPhone
    });
    setBranchModalOpen(false);
    setBranchName('');
  };

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName) return;
    addProduct({
      name: prodName,
      category: prodCategory,
      unit: prodUnit,
      defaultRate: prodRate
    });
    setProductModalOpen(false);
    setProdName('');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdSuccess('');
    setPwdError('');

    if (!currentPassword) {
      setPwdError('Please enter your current password.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPwdError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError('New password and confirmation password do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setPwdError('New password must be different from your current password.');
      return;
    }

    setPwdLoading(true);
    try {
      const res = await changePassword(currentPassword, newPassword);
      if (res.success) {
        setPwdSuccess(res.message);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPwdError(res.message);
      }
    } catch (err: any) {
      setPwdError(err?.message || 'Failed to update password.');
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            System Settings & Master Catalog
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure factory business branding, manage dynamic factory branches across Pakistan, and customize spice product price lists.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setActiveTab('business')}
          className={`px-5 py-3 border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'business'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Business Branding Profile
        </button>

        <button
          onClick={() => setActiveTab('branches')}
          className={`px-5 py-3 border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'branches'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Factory Branch Management ({branches.length})
        </button>

        <button
          onClick={() => setActiveTab('products')}
          className={`px-5 py-3 border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'products'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Spice Products & Rates Catalog ({products.length})
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`px-5 py-3 border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'security'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          Security & Password
        </button>
      </div>

      {/* BUSINESS BRANDING TAB */}
      {activeTab === 'business' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm max-w-2xl space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Company Profile & Document Branding
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              These details and factory logo will appear on all generated PDF invoices, payment receipts, vouchers, and ledger statements.
            </p>
          </div>

          <form onSubmit={handleSaveBusiness} className="space-y-4 text-xs">
            {/* Logo Upload Section */}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Factory Logo (For Official Documents & Watermark)
              </label>
              <div className="flex items-center gap-4 p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40">
                {profileData.logoUrl ? (
                  <div className="relative group w-20 h-20 rounded-xl overflow-hidden bg-white border border-slate-200 dark:border-slate-700 flex items-center justify-center p-1 shadow-sm">
                    <img 
                      src={profileData.logoUrl} 
                      alt="Company Logo Preview" 
                      className="max-h-full max-w-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setProfileData(prev => ({ ...prev, logoUrl: '' }));
                        updateCompanyProfile({ ...profileData, logoUrl: '' });
                      }}
                      className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove Logo"
                    >
                      <Trash2 className="w-4 h-4 text-rose-400" />
                    </button>
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 flex flex-col items-center justify-center text-slate-400">
                    <ImageIcon className="w-8 h-8 stroke-[1.5]" />
                    <span className="text-[10px] mt-1">No Logo</span>
                  </div>
                )}

                <div className="flex-1 space-y-1.5">
                  <label className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold cursor-pointer hover:bg-slate-50 transition-colors shadow-sm">
                    <Upload className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{profileData.logoUrl ? 'Change Logo Image' : 'Upload Logo Image'}</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleLogoUpload}
                    />
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Recommended: High-resolution PNG or JPG with transparent background (Max 2MB).
                  </p>
                  {logoError && (
                    <p className="text-[11px] text-rose-600 font-semibold">{logoError}</p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Factory Business Name *
              </label>
              <input
                type="text"
                value={profileData.name}
                onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold"
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Factory Street Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. Plot 42-A, Industrial Estate, Kot Lakhpat"
                  value={profileData.address}
                  onChange={(e) => setProfileData(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  City
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lahore"
                  value={profileData.city}
                  onChange={(e) => setProfileData(prev => ({ ...prev, city: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Contact Phone / Hotline
                </label>
                <input
                  type="text"
                  placeholder="+92 42 35891234"
                  value={profileData.phone}
                  onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Official Email
                </label>
                <input
                  type="email"
                  placeholder="info@masalafactory.pk"
                  value={profileData.email}
                  onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tax / NTN / STRN Registration Number
              </label>
              <input
                type="text"
                placeholder="NTN: 4419201-7 | STRN: 3277876123456"
                value={profileData.taxNumber}
                onChange={(e) => setProfileData(prev => ({ ...prev, taxNumber: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Default Currency
                </label>
                <input
                  type="text"
                  value="Pakistani Rupee (PKR / Rs.)"
                  disabled
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Operating Phase Mode
                </label>
                <input
                  type="text"
                  value="Production Enterprise System"
                  disabled
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-slate-500"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="submit"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-md flex items-center gap-2"
              >
                {bSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {bSaved ? 'Branding Saved!' : 'Save Business Details'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* BRANCH MANAGEMENT TAB */}
      {activeTab === 'branches' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Configured Factory Branches
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Permanent business facilities. Configure operational status and view production metrics.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="/factories"
                className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors"
              >
                Full Factory Management →
              </a>
              <button
                onClick={() => setBranchModalOpen(true)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Factory Branch
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {branches.map(b => (
              <div key={b.id} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">{b.name}</h4>
                    <span className="text-[11px] text-slate-500 font-medium">{b.city}, Pakistan</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
                      {b.code}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      b.status === 'Active' 
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                        : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      {b.status || 'Active'}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-500">{b.address}</p>
                <div className="text-xs text-slate-400 font-mono">Phone: {b.phone}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SPICE PRODUCTS CATALOG TAB */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Spice Products & Default Rates Catalog
            </h3>
            <button
              onClick={() => setProductModalOpen(true)}
              className="px-3.5 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add Spice Product
            </button>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                  <tr>
                    <th className="p-3">Product Name</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Unit Packaging</th>
                    <th className="p-3 text-right">Default Rate (PKR)</th>
                    <th className="p-3 text-right">Stock Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {products.map(p => (
                    <tr key={p.id}>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">{p.name}</td>
                      <td className="p-3">{p.category}</td>
                      <td className="p-3">{p.unit}</td>
                      <td className="p-3 text-right font-extrabold text-emerald-600 dark:text-emerald-400">
                        {formatPKR(p.defaultRate)}
                      </td>
                      <td className="p-3 text-right font-mono">{p.stockQty || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECURITY & CHANGE PASSWORD TAB */}
      {activeTab === 'security' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm max-w-2xl space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Account Security & Password Management
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Update your account password securely using Supabase Authentication.
            </p>
          </div>

          {/* Active Account Info Card */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Authenticated User:</span>
              <span className="font-bold text-slate-900 dark:text-white">{user?.fullName || 'Factory Administrator'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Username / Email:</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">{user?.email || 'admin@masalafactory.pk'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Auth System:</span>
              <span className="px-2 py-0.5 rounded-full font-semibold text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Enterprise Cloud Session
              </span>
            </div>
          </div>

          {/* Feedback Alerts */}
          {pwdSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{pwdSuccess}</span>
            </div>
          )}

          {pwdError && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{pwdError}</span>
            </div>
          )}

          {/* Change Password Form */}
          <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
            {/* Current Password */}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Current Password *
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                New Password *
              </label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  placeholder="Enter new password (min. 6 characters)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Confirm New Password *
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="submit"
                disabled={pwdLoading}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition disabled:opacity-60 flex items-center gap-2"
              >
                <Lock className="w-4 h-4" />
                {pwdLoading ? 'Updating Password...' : 'Update Password'}
              </button>
            </div>
          </form>

          {/* Cross-Device Security Note */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Cross-Device Session Revocation</span>
              <span className="text-[11px] opacity-90">
                Updating your password immediately updates the central database and forces an automatic logout on all other mobile phones and open browser tabs.
              </span>
            </div>
          </div>

          {/* Mobile App PWA Installation Guide */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h4 className="font-bold text-slate-900 dark:text-white text-xs">
                Install as Mobile App (PWA)
              </h4>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              You can install Masala Factory on Android or iPhone to use it with full-screen native app performance without browser search bars.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
              <div className="p-3 rounded-lg bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 space-y-1">
                <span className="font-bold text-slate-800 dark:text-slate-200 block">Android (Chrome / Edge)</span>
                <span className="text-slate-500 dark:text-slate-400 block">
                  Tap the three dots (⋮) in the top-right corner and select <strong className="text-emerald-600 dark:text-emerald-400">"Install app"</strong> or <strong className="text-emerald-600 dark:text-emerald-400">"Add to Home screen"</strong>.
                </span>
              </div>
              <div className="p-3 rounded-lg bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 space-y-1">
                <span className="font-bold text-slate-800 dark:text-slate-200 block">iPhone / iPad (Safari)</span>
                <span className="text-slate-500 dark:text-slate-400 block">
                  Tap the Share button (⬆) at the bottom and select <strong className="text-emerald-600 dark:text-emerald-400">"Add to Home Screen"</strong>.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD BRANCH MODAL */}
      <Modal
        isOpen={branchModalOpen}
        onClose={() => setBranchModalOpen(false)}
        title="Add New Factory Branch"
        maxWidth="sm"
      >
        <form onSubmit={handleAddBranch} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Branch Name *</label>
            <input
              type="text"
              placeholder="e.g. Rawalpindi Supply Hub"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              required
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">City *</label>
            <input
              type="text"
              placeholder="Rawalpindi"
              value={branchCity}
              onChange={(e) => setBranchCity(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              required
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Address</label>
            <input
              type="text"
              placeholder="IJP Road, Rawalpindi"
              value={branchAddress}
              onChange={(e) => setBranchAddress(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Phone</label>
            <input
              type="text"
              placeholder="+92 51 1234567"
              value={branchPhone}
              onChange={(e) => setBranchPhone(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setBranchModalOpen(false)} className="px-3 py-1.5 bg-slate-100 rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg font-semibold">Save Branch</button>
          </div>
        </form>
      </Modal>

      {/* ADD PRODUCT MODAL */}
      <Modal
        isOpen={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        title="Add New Spice Product"
        maxWidth="sm"
      >
        <form onSubmit={handleAddProduct} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Product Name *</label>
            <input
              type="text"
              placeholder="e.g. Qorma Masala Special"
              value={prodName}
              onChange={(e) => setProdName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Category</label>
              <select
                value={prodCategory}
                onChange={(e) => setProdCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="Formulated Spice Mix">Formulated Spice Mix</option>
                <option value="Pure Spice Powder">Pure Spice Powder</option>
                <option value="Raw Spice Material">Raw Spice Material</option>
                <option value="Packaging Materials">Packaging Materials</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Unit</label>
              <input
                type="text"
                placeholder="1kg Pack"
                value={prodUnit}
                onChange={(e) => setProdUnit(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Default Rate (PKR) *</label>
            <CurrencyInput
              placeholder="1,000"
              value={prodRate}
              onChange={setProdRate}
              prefix="Rs."
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setProductModalOpen(false)} className="px-3 py-1.5 bg-slate-100 rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg font-semibold">Save Product</button>
          </div>
        </form>
      </Modal>

    </div>
  );
};
