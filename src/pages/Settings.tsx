import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Download,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Product } from '../types';

export const Settings: React.FC = () => {
  const { 
    branches, 
    addBranch, 
    products, 
    addProduct, 
    updateProduct, 
    deleteProduct,
    businessName, 
    setBusinessName,
    companyProfile,
    updateCompanyProfile 
  } = useApp();

  const { user, changePassword, isSupabaseMode } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'business' | 'products' | 'security'>('business');

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
  const [isDirty, setIsDirty] = useState(false);
  const [isSavingBusiness, setIsSavingBusiness] = useState(false);
  const [logoError, setLogoError] = useState('');
  const [bSaved, setBSaved] = useState(false);

  // Sync profileData when companyProfile updates from context/storage, but only if user hasn't edited locally
  React.useEffect(() => {
    if (!isDirty) {
      setProfileData({
        name: companyProfile.name || businessName,
        logoUrl: companyProfile.logoUrl || '',
        address: companyProfile.address || '',
        city: companyProfile.city || '',
        phone: companyProfile.phone || '',
        email: companyProfile.email || '',
        taxNumber: companyProfile.taxNumber || ''
      });
    }
  }, [companyProfile, businessName, isDirty]);

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

  // Edit Product Form
  const [editProductModalOpen, setEditProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editProdName, setEditProdName] = useState('');
  const [editProdCategory, setEditProdCategory] = useState('Formulated Spice Mix');
  const [editProdUnit, setEditProdUnit] = useState('1kg Pack');
  const [editProdRate, setEditProdRate] = useState<number>(1000);

  // Delete Product Form
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  const handleOpenEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setEditProdName(prod.name);
    setEditProdCategory(prod.category || 'Formulated Spice Mix');
    setEditProdUnit(prod.unit || '1kg Pack');
    setEditProdRate(prod.defaultRate || 0);
    setEditProductModalOpen(true);
  };

  const handleSaveEditProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editProdName.trim()) return;
    updateProduct(editingProduct.id, {
      name: editProdName.trim(),
      category: editProdCategory,
      unit: editProdUnit,
      defaultRate: editProdRate
    });
    setEditProductModalOpen(false);
    setEditingProduct(null);
  };

  const handleConfirmDeleteProduct = () => {
    if (!deletingProduct) return;
    deleteProduct(deletingProduct.id);
    setDeletingProduct(null);
  };

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
          const maxDim = 600;
          let w = img.naturalWidth || img.width;
          let h = img.naturalHeight || img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
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

  const handleSaveBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileData.name.trim()) return;

    setIsSavingBusiness(true);
    try {
      await updateCompanyProfile(profileData);
      setBusinessName(profileData.name.trim());
      setIsDirty(false);
      setBSaved(true);
      setTimeout(() => setBSaved(false), 3000);
    } finally {
      setIsSavingBusiness(false);
    }
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
          className={`px-5 py-3 border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'business'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          Business Profile & Branding
        </button>

        <button
          onClick={() => setActiveTab('products')}
          className={`px-5 py-3 border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'products'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          Spice Products Catalog ({products.length})
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Factory Business Name & Document Branding
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                This factory business name and official logo appear on all generated PDF invoices, payment receipts, vouchers, and ledger statements.
              </p>
            </div>
          </div>

          {/* Branch management redirect banner */}
          <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Building2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <p className="font-bold text-xs text-slate-800 dark:text-slate-100">
                  Individual Factory Branches & Plants
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Manage branch licenses, owner names, two phone numbers, and plant addresses on the Factories page.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/factories')}
              className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-emerald-700 dark:text-emerald-300 font-semibold rounded-lg text-xs shrink-0 flex items-center gap-1 shadow-xs transition"
            >
              <span>Manage Factories</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
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
                        setIsDirty(true);
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
                onChange={(e) => {
                  setIsDirty(true);
                  setProfileData(prev => ({ ...prev, name: e.target.value }));
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold"
                placeholder="e.g. Awais Masala Factory"
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
                  placeholder="e.g. Plot 42-A, Industrial Estate Phase II"
                  value={profileData.address}
                  onChange={(e) => {
                    setIsDirty(true);
                    setProfileData(prev => ({ ...prev, address: e.target.value }));
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  City
                </label>
                <input
                  type="text"
                  placeholder="e.g. Multan"
                  value={profileData.city}
                  onChange={(e) => {
                    setIsDirty(true);
                    setProfileData(prev => ({ ...prev, city: e.target.value }));
                  }}
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
                  placeholder="+92 61 4567890"
                  value={profileData.phone}
                  onChange={(e) => {
                    setIsDirty(true);
                    setProfileData(prev => ({ ...prev, phone: e.target.value }));
                  }}
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
                  onChange={(e) => {
                    setIsDirty(true);
                    setProfileData(prev => ({ ...prev, email: e.target.value }));
                  }}
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
                onChange={(e) => {
                  setIsDirty(true);
                  setProfileData(prev => ({ ...prev, taxNumber: e.target.value }));
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
              />
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="submit"
                disabled={isSavingBusiness}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold rounded-xl shadow-md flex items-center gap-2 transition"
              >
                {bSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {isSavingBusiness ? 'Saving Changes...' : bSaved ? 'Branding Saved!' : 'Save Business Details'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SPICE PRODUCTS CATALOG TAB */}
      {activeTab === 'products' && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Spice Products & Wholesale Master Price List
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Manage manufactured masala mixes, pure powders, and standard packaging rates. Edits sync to all branch billing terminals.
              </p>
            </div>
            <button
              onClick={() => {
                setProdName('');
                setProdCategory('Formulated Spice Mix');
                setProdUnit('1kg Pack');
                setProdRate(1000);
                setProductModalOpen(true);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              Add Spice Product
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Product Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Standard Packaging</th>
                  <th className="px-4 py-3 text-right">Default Wholesale Rate</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {products.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Flame className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      {p.name}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/50">
                        {p.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-medium">
                      {p.unit}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {formatPKR(p.defaultRate)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditProduct(p)}
                          className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          title="Edit Product"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingProduct(p)}
                          className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                          title="Delete Product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No products found. Click "Add Spice Product" to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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
              Update your account password. Changes sync immediately to central database and logout other sessions.
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

      {/* EDIT PRODUCT MODAL */}
      <Modal
        isOpen={editProductModalOpen}
        onClose={() => setEditProductModalOpen(false)}
        title="Edit Spice Product"
        maxWidth="sm"
      >
        <form onSubmit={handleSaveEditProduct} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Product Name *</label>
            <input
              type="text"
              placeholder="e.g. Qorma Masala Special"
              value={editProdName}
              onChange={(e) => setEditProdName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Category</label>
              <select
                value={editProdCategory}
                onChange={(e) => setEditProdCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="Formulated Spice Mix">Formulated Spice Mix</option>
                <option value="Pure Spice Powder">Pure Spice Powder</option>
                <option value="Raw Spice Material">Raw Spice Material</option>
                <option value="Packaging Materials">Packaging Materials</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Standard Packaging Unit</label>
              <input
                type="text"
                placeholder="1kg Pack"
                value={editProdUnit}
                onChange={(e) => setEditProdUnit(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Default Wholesale Rate (PKR) *</label>
            <CurrencyInput
              placeholder="1,000"
              value={editProdRate}
              onChange={setEditProdRate}
              prefix="Rs."
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditProductModalOpen(false)}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold"
            >
              Update Product
            </button>
          </div>
        </form>
      </Modal>

      {/* DELETE PRODUCT CONFIRMATION MODAL */}
      {deletingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-sm p-5">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950/60">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Delete Spice Product</h4>
                <p className="text-[11px] text-slate-500">Confirm permanent deletion</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mb-5 leading-relaxed">
              Are you sure you want to delete <span className="font-bold text-slate-900 dark:text-white">{deletingProduct.name}</span> ({deletingProduct.unit})? This item will be removed from future bill creation dropdowns.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingProduct(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteProduct}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
