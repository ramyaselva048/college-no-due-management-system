import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { GraduationCap, Lock, Mail, ArrowRight, AlertCircle, Eye, EyeOff, Building2, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

export const LoginPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialRole = (searchParams.get('role')?.toUpperCase() as UserRole) || 'STUDENT';

  const [activeRole, setActiveRole] = useState<UserRole>(initialRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login, user } = useAuth();
  const navigate = useNavigate();

  // If already logged in, redirect to respective dashboard
  useEffect(() => {
    if (user) {
      if (user.role === 'STUDENT') navigate('/student/dashboard');
      else if (user.role === 'STAFF') navigate('/staff/dashboard');
      else if (user.role === 'ADMIN') navigate('/admin/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const loggedIn = await login(email.trim(), password);
      if (loggedIn.role === 'STUDENT') navigate('/student/dashboard');
      else if (loggedIn.role === 'STAFF') navigate('/staff/dashboard');
      else if (loggedIn.role === 'ADMIN') navigate('/admin/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid email or password. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const autofill = (r: UserRole, em: string, pw: string) => {
    setActiveRole(r);
    setEmail(em);
    setPassword(pw);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-indigo-500 selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
            <GraduationCap className="w-5 h-5" />
          </div>
          <span className="font-display font-bold text-xl text-slate-900">Apex College</span>
        </Link>
        <h2 className="font-display font-bold text-2xl text-slate-900 tracking-tight">
          Sign In to Clearance Portal
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Enter institutional credentials or choose a pre-configured demo account
        </p>
      </div>

      {/* Main Login Card */}
      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-2xl shadow-xl border border-slate-200">
          {/* Role Tabs */}
          <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => {
                setActiveRole('STUDENT');
                setError(null);
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeRole === 'STUDENT'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              Student
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveRole('STAFF');
                setError(null);
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeRole === 'STAFF'
                  ? 'bg-white text-emerald-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              Staff
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveRole('ADMIN');
                setError(null);
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeRole === 'ADMIN'
                  ? 'bg-white text-purple-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Admin
            </button>
          </div>

          {activeRole === 'ADMIN' && (
            <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-xl text-purple-800 text-xs flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 text-purple-600" />
              <span>
                <strong>College Admin Access:</strong> Restricted to authorized administrator (<code className="font-semibold text-purple-900">ramya@sasurie.edu</code>).
              </span>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Institutional Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="input-email"
                  type="email"
                  required
                  placeholder={
                    activeRole === 'STUDENT'
                      ? 'student@college.edu'
                      : activeRole === 'STAFF'
                      ? 'staff.library@college.edu'
                      : 'ramya@sasurie.edu'
                  }
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">Password</label>
                <Link
                  to="/forgot-password"
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="input-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-xs pl-9 pr-10 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              id="btn-login-submit"
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                'Authenticating...'
              ) : (
                <>
                  Sign In as {activeRole} <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Autofill Panel */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2.5 text-center">
              Quick Test Accounts (1-Click Fill)
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => autofill('STUDENT', 'student@college.edu', 'StudentPassword@123')}
                className="p-2 border border-slate-200 rounded-lg text-left hover:border-blue-300 hover:bg-blue-50/50 transition-all"
              >
                <p className="text-[11px] font-bold text-blue-700">Student</p>
                <p className="text-[10px] text-slate-500 truncate">Aditya Sharma</p>
              </button>

              <button
                type="button"
                onClick={() => autofill('STAFF', 'staff.library@college.edu', 'StaffPassword@123')}
                className="p-2 border border-slate-200 rounded-lg text-left hover:border-emerald-300 hover:bg-emerald-50/50 transition-all"
              >
                <p className="text-[11px] font-bold text-emerald-700">Staff</p>
                <p className="text-[10px] text-slate-500 truncate">Library Officer</p>
              </button>

              <button
                type="button"
                id="btn-autofill-admin"
                onClick={() => autofill('ADMIN', 'ramya@sasurie.edu', 'RamyaSasurie@123')}
                className="p-2 border border-slate-200 rounded-lg text-left hover:border-purple-300 hover:bg-purple-50/50 transition-all"
              >
                <p className="text-[11px] font-bold text-purple-700">Admin</p>
                <p className="text-[10px] text-slate-500 truncate">Ramya (Principal)</p>
              </button>
            </div>
          </div>

          <div className="mt-6 text-center pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              New student without an account?{' '}
              <Link to="/register" id="link-student-register" className="text-indigo-600 font-bold hover:underline">
                Register here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
