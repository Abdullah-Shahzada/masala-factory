import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Receipt, 
  CreditCard, 
  ShoppingBag, 
  Menu
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface MobileBottomNavProps {
  onOpenMenu: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onOpenMenu }) => {
  const location = useLocation();
  const { salesBills, scheduleItems } = useApp();

  const unpaidCount = salesBills.filter(b => b.status === 'Unpaid').length;
  const overdueCount = scheduleItems.filter(s => s.status === 'Overdue' || s.status === 'Due Today').length;
  const totalAlerts = unpaidCount + overdueCount;

  const tabs = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Sales', path: '/sales', icon: Receipt, badge: unpaidCount > 0 ? unpaidCount : null },
    { name: 'Payments', path: '/payments', icon: CreditCard },
    { name: 'Purchases', path: '/purchases', icon: ShoppingBag },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200/90 dark:border-slate-800 lg:hidden px-2 py-1.5 shadow-2xl safe-area-pb">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.path === '/' 
            ? location.pathname === '/' 
            : location.pathname.startsWith(tab.path);

          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all relative ${
                isActive 
                  ? 'text-emerald-600 dark:text-emerald-400 font-bold' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''} transition-transform`} />
                {tab.badge && (
                  <span className="absolute -top-1.5 -right-2.5 w-4 h-4 bg-emerald-500 text-white text-[9px] font-extrabold rounded-full flex items-center justify-center shadow-xs">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight font-medium">
                {tab.name}
              </span>
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-emerald-500 mt-0.5" />
              )}
            </NavLink>
          );
        })}

        {/* Menu Button to trigger sidebar */}
        <button
          onClick={onOpenMenu}
          className="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all relative"
        >
          <div className="relative">
            <Menu className="w-5 h-5" />
            {totalAlerts > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
            )}
            {totalAlerts > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full" />
            )}
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight font-medium">
            Menu
          </span>
        </button>
      </div>
    </nav>
  );
};
