import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Layout } from './components/layout/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { SalesBills } from './pages/SalesBills';
import { PaymentsReceived } from './pages/PaymentsReceived';
import { PaymentSchedule } from './pages/PaymentSchedule';
import { Purchases } from './pages/Purchases';
import { Expenses } from './pages/Expenses';
import { Contacts } from './pages/Contacts';
import { Ledger } from './pages/Ledger';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { RecentlyDeleted } from './pages/RecentlyDeleted';
import { Factories } from './pages/Factories';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Auth Route */}
            <Route path="/login" element={<Login />} />

            {/* Protected Application Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="recently-deleted" element={<RecentlyDeleted />} />
                <Route path="sales" element={<SalesBills />} />
                <Route path="payments" element={<PaymentsReceived />} />
                <Route path="schedule" element={<PaymentSchedule />} />
                <Route path="purchases" element={<Purchases />} />
                <Route path="expenses" element={<Expenses />} />
                <Route path="contacts" element={<Contacts />} />
                <Route path="factories" element={<Factories />} />
                <Route path="ledger" element={<Ledger />} />
                <Route path="reports" element={<Reports />} />
                <Route path="settings" element={<Settings />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </AuthProvider>
  );
};

export default App;
