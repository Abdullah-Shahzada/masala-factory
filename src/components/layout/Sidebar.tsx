import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Receipt, 
  CreditCard, 
  CalendarClock, 
  ShoppingBag, 
  Wallet, 
  Users, 
  BookOpen, 
  BarChart3, 
  Settings, 
  ChevronDown, 
  Flame,
  ChevronRight,
  Menu,
  X,
  Trash2,
  Building2,
  Smartphone
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen
}) => {
  const location = useLocation();
  const { scheduleItems, salesBills, totalRecentlyDeletedCount, companyProfile, businessName } = useApp();
  const [scheduleMenuOpen, setScheduleMenuOpen] = useState(location.pathname.startsWith('/schedule'));

  // Notification badge counts
  const overdueCount = scheduleItems.filter(s => s.status === 'Overdue' || s.status === 'Due Today').length;
  const unpaidSalesCount = salesBills.filter(s => s.status === 'Unpaid').length;

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { 
      name: 'Recently Deleted', 
      path: '/recently-deleted', 
      icon: Trash2, 
      badge: totalRecentlyDeletedCount > 0 ? totalRecentlyDeletedCount : null, 
      badgeColor: 'bg-rose-500' 
    },
    { name: 'Sales / Bills', path: '/sales', icon: Receipt, badge: unpaidSalesCount > 0 ? unpaidSalesCount : null, badgeColor: 'bg-emerald-500' },
    { name: 'Payments Received', path: '/payments', icon: CreditCard },
    { 
      name: 'Payment Schedule', 
      path: '/schedule', 
      icon: CalendarClock,
      isSubmenu: true,
      badge: overdueCount > 0 ? overdueCount : null,
      badgeColor: 'bg-rose-500',
      children: [
        { name: 'Payments to Receive', path: '/schedule?tab=receive' },
        { name: 'Payments to Pay', path: '/schedule?tab=pay' }
      ]
    },
    { name: 'Purchases', path: '/purchases', icon: ShoppingBag },
    { name: 'Supplier Payments', path: '/purchases?tab=payments', icon: Receipt },
    { name: 'Expenses', path: '/expenses', icon: Wallet },
    { name: 'Contacts / Parties', path: '/contacts', icon: Users },
    { name: 'Factories', path: '/factories', icon: Building2 },
    { name: 'Ledger', path: '/ledger', icon: BookOpen },
    { name: 'Reports', path: '/reports', icon: BarChart3 },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={`
        fixed top-0 bottom-0 left-0 z-40 flex flex-col bg-slate-900 text-slate-300 transition-all duration-300 ease-in-out border-r border-slate-800
        ${collapsed ? 'w-20' : 'w-64'}
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Brand Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800/80 bg-slate-950/50">
          <div className="flex items-center gap-3 overflow-hidden">
            {companyProfile?.logoUrl ? (
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white p-1 shadow-lg shadow-emerald-900/40 shrink-0 overflow-hidden">
                <img src={companyProfile.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
              </div>
            ) : (
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-amber-500 text-white shadow-lg shadow-emerald-900/40 shrink-0">
                <Flame className="w-6 h-6 animate-pulse" />
              </div>
            )}
            {!collapsed && (
              <div className="flex flex-col truncate">
                <span className="font-bold text-sm tracking-wide text-white font-sans truncate">
                  {businessName ? businessName.toUpperCase() : 'MASALA FACTORY'}
                </span>
                <span className="text-[10px] text-emerald-400 font-medium tracking-wider uppercase">
                  B2B Management
                </span>
              </div>
            )}
          </div>

          <button
            onClick={() => setMobileOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            
            const computeIsActive = () => {
              if (item.path.includes('?')) {
                const [path, query] = item.path.split('?');
                return location.pathname === path && location.search === `?${query}`;
              }
              if (item.path === '/purchases') {
                return location.pathname === '/purchases' && !location.search.includes('tab=payments');
              }
              if (item.path === '/') {
                return location.pathname === '/';
              }
              return location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(`${item.path}/`));
            };

            const isActive = computeIsActive();

            if (item.isSubmenu) {
              return (
                <div key={item.name} className="space-y-1">
                  <button
                    onClick={() => {
                      if (collapsed) setCollapsed(false);
                      setScheduleMenuOpen(!scheduleMenuOpen);
                    }}
                    className={`
                      w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors group
                      ${isActive ? 'bg-emerald-950/60 text-emerald-400 font-semibold' : 'hover:bg-slate-800/60 hover:text-white text-slate-300'}
                    `}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-white'}`} />
                      {!collapsed && <span>{item.name}</span>}
                    </div>

                    {!collapsed && (
                      <div className="flex items-center gap-2">
                        {item.badge && (
                          <span className={`px-2 py-0.5 text-[10px] font-bold text-white rounded-full ${item.badgeColor}`}>
                            {item.badge}
                          </span>
                        )}
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${scheduleMenuOpen ? 'rotate-180' : ''}`} />
                      </div>
                    )}
                  </button>

                  {/* Submenu Items */}
                  {!collapsed && scheduleMenuOpen && (
                    <div className="pl-9 pr-2 space-y-1 py-1">
                      {item.children?.map(sub => (
                        <NavLink
                          key={sub.path}
                          to={sub.path}
                          onClick={() => setMobileOpen(false)}
                          className={({ isActive: isSubActive }) => `
                            block px-3 py-2 rounded-lg text-xs font-medium transition-colors
                            ${isSubActive ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800/40'}
                          `}
                        >
                          {sub.name}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={() => `
                  flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group
                  ${isActive 
                    ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-md shadow-emerald-950/50' 
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'}
                `}
              >
                <div className="flex items-center gap-3 truncate">
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                  {!collapsed && <span>{item.name}</span>}
                </div>

                {!collapsed && item.badge && (
                  <span className={`px-2 py-0.5 text-[10px] font-bold text-white rounded-full ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer Branch Badge & Install Button */}
        {!collapsed && (
          <div className="p-3 border-t border-slate-800/80 bg-slate-950/30 space-y-2">
            <button
              onClick={() => {
                setMobileOpen(false);
                window.dispatchEvent(new CustomEvent('open-pwa-install'));
              }}
              className="w-full p-2.5 rounded-xl bg-gradient-to-r from-emerald-600/20 to-teal-600/20 hover:from-emerald-600/30 hover:to-teal-600/30 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <Smartphone className="w-4 h-4" />
              <span>Install Mobile App</span>
            </button>
            <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-[11px]">
              <span className="text-slate-400 block font-medium">Enterprise Database</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Enterprise Cloud Active
              </span>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
