import React, { useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  GraduationCap,
  LayoutDashboard,
  Receipt,
  FileCheck2,
  Award,
  Users,
  Building2,
  ShieldCheck,
  History,
  BarChart3,
  LogOut,
  Menu,
  X,
  UserCheck,
  CheckCircle2,
  ExternalLink,
  BookOpen
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { NotificationsDropdown } from './NotificationsDropdown';

interface AppLayoutProps {
  children?: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { user, studentProfile, staffProfile, logout, isStudent, isStaff, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Nav Items based on Role
  let navItems: Array<{ label: string; href: string; icon: any }> = [];

  if (isStudent) {
    navItems = [
      { label: 'Overview', href: '/student/dashboard', icon: LayoutDashboard },
      { label: 'Dues & Fees', href: '/student/dues', icon: Receipt },
      { label: 'Clearance Request', href: '/student/request', icon: FileCheck2 },
      { label: 'My Certificate', href: '/student/certificate', icon: Award },
    ];
  } else if (isStaff) {
    navItems = [
      { label: 'Dashboard', href: '/staff/dashboard', icon: LayoutDashboard },
      { label: 'Clearance Inbox', href: '/staff/approvals', icon: CheckCircle2 },
      { label: 'Students Directory', href: '/staff/students', icon: Users },
      { label: 'Department Dues', href: '/staff/dues', icon: Receipt },
    ];
  } else if (isAdmin) {
    navItems = [
      { label: 'Overview', href: '/admin/dashboard', icon: LayoutDashboard },
      { label: 'Clearance Requests', href: '/admin/requests', icon: FileCheck2 },
      { label: 'All Students', href: '/admin/students', icon: Users },
      { label: 'Institutional Dues', href: '/admin/dues', icon: Receipt },
      { label: 'Staff & Officers', href: '/admin/staff', icon: UserCheck },
      { label: 'Departments', href: '/admin/departments', icon: Building2 },
      { label: 'Degrees & Branches', href: '/admin/courses', icon: GraduationCap },
      { label: 'Certificates Ledger', href: '/admin/certificates', icon: Award },
      { label: 'Audit Trail', href: '/admin/audit-logs', icon: History },
      { label: 'Reports & Analytics', href: '/admin/reports', icon: BarChart3 },
    ];
  }

  const roleLabel = isStudent ? 'Student' : isStaff ? 'Department Staff' : 'Administrator';
  const roleBadgeColor = isStudent
    ? 'bg-blue-50 text-blue-700 border-blue-200'
    : isStaff
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : 'bg-purple-50 text-purple-700 border-purple-200';

  const userDisplayName =
    studentProfile?.full_name ||
    staffProfile?.full_name ||
    (isAdmin ? 'Administrator' : user?.email?.split('@')[0] || 'User');

  const subLabel =
    studentProfile?.register_number ||
    staffProfile?.department_name ||
    (isAdmin ? 'Institutional Control' : user?.email);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 text-slate-900">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex md:w-64 flex-col bg-white border-r border-slate-200 shrink-0 select-none">
        {/* Institutional Branding */}
        <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-200">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-display font-bold text-sm tracking-tight text-slate-900 leading-tight">
              Apex College
            </span>
            <span className="text-[11px] text-slate-500 font-medium">No Due Portal</span>
          </div>
        </div>

        {/* User Card */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
              {userDisplayName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{userDisplayName}</p>
              <p className="text-xs text-slate-500 truncate">{subLabel}</p>
            </div>
          </div>
          <div className="mt-2.5 flex items-center justify-between">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${roleBadgeColor}`}>
              {roleLabel}
            </span>
            <Link
              to="/verify"
              className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1"
              target="_blank"
            >
              Verify QR <ExternalLink className="w-2.5 h-2.5" />
            </Link>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href || location.pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer / Sign Out */}
        <div className="p-4 border-t border-slate-200">
          <button
            id="btn-sidebar-logout"
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between z-30 sticky top-0">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-indigo-600 flex items-center justify-center text-white">
              <GraduationCap className="w-4 h-4" />
            </div>
            <span className="font-display font-bold text-sm text-slate-900">Apex No Due</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <NotificationsDropdown />
          <button
            onClick={handleLogout}
            className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 p-4 space-y-2 z-20 shadow-lg">
          <div className="pb-3 mb-2 border-b border-slate-100">
            <p className="text-sm font-bold text-slate-900">{userDisplayName}</p>
            <p className="text-xs text-slate-500">{subLabel}</p>
            <span className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${roleBadgeColor}`}>
              {roleLabel}
            </span>
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold ${
                  isActive ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
          <div className="pt-2 border-t border-slate-100">
            <Link
              to="/verify"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-indigo-600"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Public Certificate Verification
            </Link>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Desktop Top Header Bar */}
        <header className="hidden md:flex h-16 bg-white border-b border-slate-200 px-8 items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {roleLabel} Workspace
            </span>
            {isStaff && staffProfile?.department_name && (
              <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md font-medium border border-slate-200">
                {staffProfile.department_name}
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/verify"
              className="text-xs text-slate-600 hover:text-indigo-600 font-semibold px-3 py-1.5 rounded-md hover:bg-slate-100 transition-colors inline-flex items-center gap-1.5"
              target="_blank"
            >
              Public Certificate Verifier <ExternalLink className="w-3.5 h-3.5" />
            </Link>

            <div className="h-4 w-px bg-slate-200"></div>

            <NotificationsDropdown />
          </div>
        </header>

        {/* Scrollable Page Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};
