import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MainLayout } from '../layouts/MainLayout';
import { LoginPage } from '../pages/Login/LoginPage';
import { DashboardPage } from '../pages/Dashboard/DashboardPage';
import { EnquiriesPage } from '../pages/Enquiries/EnquiriesPage';
import { AdmissionsPage } from '../pages/Admissions/AdmissionsPage';
import { GuestsPage } from '../pages/Guests/GuestsPage';
import { BookingsPage } from '../pages/Bookings/BookingsPage';
import { RoomsPage } from '../pages/Rooms/RoomsPage';
import { AttendancePage } from '../pages/Attendance/AttendancePage';
import { FeeReceiptsPage } from '../pages/FeeReceipts/FeeReceiptsPage';
import { AccountsPage } from '../pages/Accounts/AccountsPage';
import { OthersPage } from '../pages/Others/OthersPage';
import { ReportsPage } from '../pages/Reports/ReportsPage';
import { SettingsPage } from '../pages/Settings/SettingsPage';
import { LoadingState } from '../components/LoadingState';

const ProtectedRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({
  children,
  adminOnly = false,
}) => {
  const { isAuthenticated, isLoading, isAdmin } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FB]">
        <LoadingState message="Authenticating session..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="enquiries" element={<EnquiriesPage />} />
        <Route path="admissions" element={<AdmissionsPage />} />
        <Route path="guests" element={<GuestsPage />} />
        <Route path="bookings" element={<BookingsPage />} />
        <Route path="rooms" element={<RoomsPage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="fee-receipts" element={<FeeReceiptsPage />} />
        <Route path="accounts" element={<AccountsPage />} />
        <Route path="others" element={<OthersPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route
          path="settings"
          element={
            <ProtectedRoute adminOnly>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};
