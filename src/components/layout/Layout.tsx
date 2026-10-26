import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

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

        {/* Page Viewport */}
        <main className="flex-1 p-4 lg:p-6 max-w-7xl mx-auto w-full space-y-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
