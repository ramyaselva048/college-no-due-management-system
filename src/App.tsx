import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';

// Public Pages
import { LandingPage } from './pages/public/LandingPage';
import { LoginPage } from './pages/auth/LoginPage';
import { VerifyCertificatePage } from './pages/public/VerifyCertificatePage';

// Student Pages
import { StudentDashboard } from './pages/student/StudentDashboard';
import { StudentDuesPage } from './pages/student/StudentDuesPage';
import { StudentRequestPage } from './pages/student/StudentRequestPage';
import { StudentCertificatePage } from './pages/student/StudentCertificatePage';

// Staff Pages
import { StaffDashboard } from './pages/staff/StaffDashboard';
import { StaffApprovalsPage } from './pages/staff/StaffApprovalsPage';
import { StaffStudentsPage } from './pages/staff/StaffStudentsPage';
import { StaffDuesPage } from './pages/staff/StaffDuesPage';

// HOD Pages
import { HODDashboard } from './pages/hod/HODDashboard';
import { HODCurriculumPage } from './pages/hod/HODCurriculumPage';
import { HODRequestsPage } from './pages/hod/HODRequestsPage';
import { HODStaffDuesPage } from './pages/hod/HODStaffDuesPage';
import { HODStudentsPage } from './pages/hod/HODStudentsPage';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminRequestsPage } from './pages/admin/AdminRequestsPage';
import { AdminStudentsPage } from './pages/admin/AdminStudentsPage';
import { AdminStaffPage } from './pages/admin/AdminStaffPage';
import { AdminDepartmentsPage } from './pages/admin/AdminDepartmentsPage';
import { AdminDegreesPage } from './pages/admin/AdminDegreesPage';
import { AdminCoursesPage } from './pages/admin/AdminCoursesPage';
import { AdminCertificatesPage } from './pages/admin/AdminCertificatesPage';
import { AdminAuditLogsPage } from './pages/admin/AdminAuditLogsPage';
import { AdminReportsPage } from './pages/admin/AdminReportsPage';
import { AdminDuesPage } from './pages/admin/AdminDuesPage';

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <NotificationProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<Navigate to="/login" replace />} />
            <Route path="/signup" element={<Navigate to="/login" replace />} />
            <Route path="/verify" element={<VerifyCertificatePage />} />
            <Route path="/verify/:code" element={<VerifyCertificatePage />} />

            {/* Student Protected Routes */}
            <Route
              path="/student"
              element={
                <ProtectedRoute requiredRoles={['student']}>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/student/dashboard" replace />} />
              <Route path="dashboard" element={<StudentDashboard />} />
              <Route path="dues" element={<StudentDuesPage />} />
              <Route path="request" element={<StudentRequestPage />} />
              <Route path="certificate" element={<StudentCertificatePage />} />
            </Route>

            {/* Staff Protected Routes */}
            <Route
              path="/staff"
              element={
                <ProtectedRoute requiredRoles={['staff']}>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/staff/dashboard" replace />} />
              <Route path="dashboard" element={<StaffDashboard />} />
              <Route path="approvals" element={<StaffApprovalsPage />} />
              <Route path="students" element={<StaffStudentsPage />} />
              <Route path="dues" element={<StaffDuesPage />} />
            </Route>

            {/* HOD Protected Routes */}
            <Route
              path="/hod"
              element={
                <ProtectedRoute requiredRoles={['hod', 'admin']}>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/hod/dashboard" replace />} />
              <Route path="dashboard" element={<HODDashboard />} />
              <Route path="curriculum" element={<HODCurriculumPage />} />
              <Route path="requests" element={<HODRequestsPage />} />
              <Route path="staff-dues" element={<HODStaffDuesPage />} />
              <Route path="students" element={<HODStudentsPage />} />
            </Route>

            {/* Admin Protected Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRoles={['admin']}>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="requests" element={<AdminRequestsPage />} />
              <Route path="students" element={<AdminStudentsPage />} />
              <Route path="dues" element={<AdminDuesPage />} />
              <Route path="staff" element={<AdminStaffPage />} />
              <Route path="departments" element={<AdminDepartmentsPage />} />
              <Route path="degrees" element={<AdminDegreesPage />} />
              <Route path="courses" element={<AdminCoursesPage />} />
              <Route path="subject-courses" element={<Navigate to="/admin/courses" replace />} />
              <Route path="certificates" element={<AdminCertificatesPage />} />
              <Route path="audit-logs" element={<AdminAuditLogsPage />} />
              <Route path="reports" element={<AdminReportsPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </Router>
  );
}
