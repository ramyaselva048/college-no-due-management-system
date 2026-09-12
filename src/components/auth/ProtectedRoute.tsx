import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

interface ProtectedRouteProps {
  allowedRoles?: (UserRole | string)[];
  requiredRoles?: (UserRole | string)[];
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, requiredRoles, children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-500">Securing institutional session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    const rolesList = (allowedRoles || requiredRoles || []).map((r) => String(r).toUpperCase());
    const targetRole = rolesList.includes('ADMIN') ? 'admin' : rolesList.includes('HOD') ? 'hod' : rolesList.includes('STAFF') ? 'staff' : 'student';
    return <Navigate to={`/login?role=${targetRole}`} state={{ from: location }} replace />;
  }

  const checkRoles = (allowedRoles || requiredRoles || []).map((r) => String(r).toUpperCase());
  const currentRole = (user.role || '').toUpperCase();

  if (checkRoles.length > 0 && !checkRoles.includes(currentRole)) {
    // Redirect to their default dashboard
    if (currentRole === 'STUDENT') return <Navigate to="/student/dashboard" replace />;
    if (currentRole === 'HOD') return <Navigate to="/hod/dashboard" replace />;
    if (currentRole === 'STAFF') return <Navigate to="/staff/dashboard" replace />;
    if (currentRole === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/login" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
