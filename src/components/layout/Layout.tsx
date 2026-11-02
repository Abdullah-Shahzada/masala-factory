import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MobileBottomNav } from './MobileBottomNav';

export const Layout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex">
      {/* Sidebar */}
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Main Content Area */}
      <div className={`
        flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out
        ${collapsed ? 'lg:ml-20' : 'lg:ml-64'}
      `}>
        {/* Topbar */}
        <Topbar
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
        />

        {/* Page Viewport (with pb-24 on mobile for bottom navigation) */}
        <main className="flex-1 p-3 sm:p-4 lg:p-6 pb-24 lg:pb-6 max-w-7xl mx-auto w-full space-y-4 sm:space-y-6">
          <Outlet />
        </main>

        {/* Mobile Bottom Navigation Bar */}
        <MobileBottomNav onOpenMenu={() => setMobileOpen(true)} />
      </div>
    </div>
  );
};
