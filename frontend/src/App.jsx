import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';

import AppLayout from './layouts/AppLayout.jsx';
import AuthLayout from './layouts/AuthLayout.jsx';

import { AdminRoute, GuestOnly, ProtectedRoute } from './routes/ProtectedRoute.jsx';

import LoginPage from './pages/auth/LoginPage.jsx';
import RegisterPage from './pages/auth/RegisterPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import EstimatorPage from './pages/EstimatorPage.jsx';
import UsagePage from './pages/UsagePage.jsx';
import BudgetsPage from './pages/BudgetsPage.jsx';
import CredentialsPage from './pages/CredentialsPage.jsx';
import SubscriptionPage from './pages/SubscriptionPage.jsx';

import AdminDashboardPage from './pages/admin/AdminDashboardPage.jsx';
import AdminUsersPage from './pages/admin/AdminUsersPage.jsx';
import AdminProvidersPage from './pages/admin/AdminProvidersPage.jsx';
import AdminModelsPage from './pages/admin/AdminModelsPage.jsx';
import AdminFeedbackPage from './pages/admin/AdminFeedbackPage.jsx';

function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center text-center">
      <div>
        <div className="text-5xl font-semibold mb-2">404</div>
        <div className="text-sm text-neutral-500">Page not found.</div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <Routes>
              <Route element={<GuestOnly />}>
                <Route element={<AuthLayout />}>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                </Route>
              </Route>

              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route index element={<DashboardPage />} />
                  <Route path="/estimate" element={<EstimatorPage />} />
                  <Route path="/usage" element={<UsagePage />} />
                  <Route path="/budgets" element={<BudgetsPage />} />
                  <Route path="/credentials" element={<CredentialsPage />} />
                  <Route path="/subscription" element={<SubscriptionPage />} />

                  <Route element={<AdminRoute />}>
                    <Route path="/admin" element={<AdminDashboardPage />} />
                    <Route path="/admin/users" element={<AdminUsersPage />} />
                    <Route path="/admin/providers" element={<AdminProvidersPage />} />
                    <Route path="/admin/models" element={<AdminModelsPage />} />
                    <Route path="/admin/feedback" element={<AdminFeedbackPage />} />
                  </Route>

                  <Route path="*" element={<NotFound />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
