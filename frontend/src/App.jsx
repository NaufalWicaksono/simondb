import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout.jsx';
import { ProtectedRoute } from './components/auth/ProtectedRoute.jsx';

const Login = lazy(() => import('./pages/Login.jsx'));
const Register = lazy(() => import('./pages/Register.jsx'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword.jsx'));
const ResetPassword = lazy(() => import('./pages/ResetPassword.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const ExportData = lazy(() => import('./pages/ExportData.jsx'));
const ManajemenPengguna = lazy(() => import('./pages/ManajemenPengguna.jsx'));
const RevitalisasiPendidikan = lazy(() => import('./pages/RevitalisasiPendidikan.jsx'));

const Loader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loader />}>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="revitalisasi" element={<RevitalisasiPendidikan />} />
            <Route path="export-data" element={<ExportData />} />
            <Route path="users" element={<ManajemenPengguna />} />

            {/* 404 Fallback */}
            <Route path="*" element={
              <div className="flex items-center justify-center h-64 text-gray-400">
                <div className="text-center">
                  <p className="text-4xl font-bold text-gray-200">404</p>
                  <p className="text-sm mt-2">Halaman tidak ditemukan</p>
                </div>
              </div>
            } />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
