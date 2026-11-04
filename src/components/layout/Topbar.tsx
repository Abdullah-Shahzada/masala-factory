import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  Building2, 
  Moon, 
  Sun, 
  ChevronDown, 
  PanelLeftClose, 
  PanelLeftOpen,
  Menu,
  CheckCheck,
  User,
  ShieldCheck,
  Building,
  LogOut,
  Flame,
  RefreshCw,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

interface TopbarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen
}) => {
  const { 
    branches, 
    selectedBranchId, 
    setSelectedBranchId, 
    darkMode,
    toggleDarkMode,
    notifications,
    markNotificationRead,
    deleteNotification,
    clearAllNotifications,
    businessName,
    refreshData,
    isSyncing
  } = useApp();
  const { user, logout, isSupabaseMode } = useAuth();
  const navigate = useNavigate();

  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="sticky top-0 z-30 h-14 sm:h-16 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800 px-3 sm:px-4 lg:px-6 flex items-center justify-between gap-2 sm:gap-4 safe-area-pt">
      
      {/* Left side: Collapse toggle + Mobile Menu & Brand */}
      <div className="flex items-center gap-1.5 sm:gap-3">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-1.5 lg:hidden">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-emerald-600 to-amber-500 text-white flex items-center justify-center shadow-xs shrink-0">
            <Flame className="w-4 h-4 animate-pulse" />
          </div>
          <span className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate max-w-[130px] sm:max-w-none">
            {businessName || 'Masala Factory'}
          </span>
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
        </button>
      </div>

      {/* Right side: Branch switcher, Notifications, Theme, Profile */}
      <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">

        {/* Branch Switcher Dropdown */}
        <div className="relative">
          <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
            <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="bg-transparent pr-4 py-0.5 font-medium focus:outline-none cursor-pointer appearance-none text-[11px] sm:text-xs max-w-[100px] sm:max-w-none truncate"
              title="Filter by Factory Branch"
            >
              <option value="all" className="dark:bg-slate-900 text-slate-900 dark:text-white">All Factories</option>
              {branches.map(b => (
                <option key={b.id} value={b.id} className="dark:bg-slate-900 text-slate-900 dark:text-white">
                  📍 {b.name} ({b.city}){b.status === 'Inactive' ? ' [Inactive]' : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 opacity-60 pointer-events-none -ml-3.5" />
          </div>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Toggle Dark/Light Mode"
        >
          {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Live Cloud Database Sync Status / Refresh Button */}
        <button
          type="button"
          onClick={() => refreshData()}
          disabled={isSyncing}
          title="Live Sync: All laptops & phones automatically stay updated with TiDB Cloud. Click to sync instantly."
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
            isSyncing 
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' 
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <RefreshCw className={`w-4 h-4 text-emerald-600 dark:text-emerald-400 ${isSyncing ? 'animate-spin' : ''}`} />
          <span className="hidden md:inline text-[11px] font-semibold text-slate-700 dark:text-slate-300">
            {isSyncing ? 'Syncing...' : 'Live Sync'}
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
        </button>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            )}
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-rose-600 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Modal Dropdown */}
          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-4 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Notifications</h4>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full">
                    {unreadCount} New
                  </span>
                </div>
                {notifications.length > 0 && (
                  <button
                    onClick={clearAllNotifications}
                    className="text-xs text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Clear All
                  </button>
                )}
              </div>

              <div className="mt-3 space-y-2 max-h-72 overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markNotificationRead(n.id)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-colors relative group ${
                        n.read 
                          ? 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400' 
                          : 'bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-200/80 dark:border-emerald-800/80 text-slate-900 dark:text-white font-medium'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-emerald-700 dark:text-emerald-400 truncate">{n.title}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] text-slate-400">{n.date}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(n.id);
                            }}
                            title="Delete notification"
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors opacity-70 group-hover:opacity-100"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="mt-1 text-slate-600 dark:text-slate-300">{n.message}</p>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-xs text-slate-400">
                    No new notifications right now.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Avatar */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-emerald-600 text-white font-bold text-xs flex items-center justify-center shadow-md">
              {user?.username ? user.username.slice(0, 2).toUpperCase() : 'MF'}
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-bold text-slate-900 dark:text-white leading-none">
                {user?.fullName || user?.username || 'Factory Admin'}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                {user?.role || 'B2B Manager'}
              </span>
            </div>
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-4 z-50">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shadow-md">
                  {user?.username ? user.username.slice(0, 2).toUpperCase() : 'MF'}
                </div>
                <div className="overflow-hidden">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                    {user?.fullName || user?.username || 'Factory Manager'}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {user?.email || 'admin@masalafactory.pk'}
                  </p>
                </div>
              </div>
              <div className="mt-3 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                  <span className="flex items-center gap-1.5"><Building className="w-3.5 h-3.5 text-emerald-500" /> Operating Scope</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">2 Branches</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                  <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-blue-500" /> Auth Mode</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    {isSupabaseMode ? 'Supabase Auth' : 'Demo Mode'}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 p-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};
