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

  const [showForgotModal, setShowForgotModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const loggedIn = await login(email.trim(), password, activeRole);
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
          Enter institutional credentials to access your designated clearance portal
        </p>
      </div>

      {/* Main Login Card */}
      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-2xl shadow-xl border border-slate-200">
          {/* Role Tabs */}
          <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl mb-6">
            <button
              type="button"
              id="tab-role-student"
              onClick={() => {
                setActiveRole('STUDENT');
                setEmail('');
                setPassword('');
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
              id="tab-role-staff"
              onClick={() => {
                setActiveRole('STAFF');
                setEmail('');
                setPassword('');
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
              id="tab-role-admin"
              onClick={() => {
                setActiveRole('ADMIN');
                setEmail('');
                setPassword('');
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

          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {activeRole === 'STUDENT'
                  ? 'Register Number or College Email'
                  : activeRole === 'STAFF'
                  ? 'Employee ID or College Email'
                  : 'Institutional Admin Email'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="input-email"
                  type="text"
                  required
                  placeholder={
                    activeRole === 'STUDENT'
                      ? 'e.g. 732423104036 or student@sasurie.edu'
                      : activeRole === 'STAFF'
                      ? 'e.g. EMP-LIB-101 or staff.library@college.edu'
                      : 'e.g. admin@sasurie.edu'
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
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Forgot Password?
                </button>
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

            {/* Quick Demo Autofill Chips */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center justify-between">
                <span>Quick Fill Credentials:</span>
                <span className="text-indigo-600 font-semibold lowercase">click to autofill</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {activeRole === 'STUDENT' && (
                  <>
                    <button
                      type="button"
                      onClick={() => autofill('STUDENT', '732423104036', 'RamyaSasurie@123')}
                      className="px-2 py-1 text-[11px] font-semibold bg-white hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 border border-slate-200 rounded-lg text-slate-700 transition-all text-left shadow-2xs"
                    >
                      🎓 Ramya S <span className="text-slate-400 text-[10px] font-mono">(732423104036)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => autofill('STUDENT', '732921104001', 'StudentPassword@123')}
                      className="px-2 py-1 text-[11px] font-semibold bg-white hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 border border-slate-200 rounded-lg text-slate-700 transition-all text-left shadow-2xs"
                    >
                      🎓 Aravindhan R <span className="text-slate-400 text-[10px] font-mono">(732921104001)</span>
                    </button>
                  </>
                )}
                {activeRole === 'STAFF' && (
                  <>
                    <button
                      type="button"
                      onClick={() => autofill('STAFF', 'EMP-LIB-101', 'StaffPassword@123')}
                      className="px-2 py-1 text-[11px] font-semibold bg-white hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 border border-slate-200 rounded-lg text-slate-700 transition-all text-left shadow-2xs"
                    >
                      📚 Library Officer <span className="text-slate-400 text-[10px] font-mono">(EMP-LIB-101)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => autofill('STAFF', 'EMP-CSE-201', 'StaffPassword@123')}
                      className="px-2 py-1 text-[11px] font-semibold bg-white hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 border border-slate-200 rounded-lg text-slate-700 transition-all text-left shadow-2xs"
                    >
                      💻 CSE HOD <span className="text-slate-400 text-[10px] font-mono">(EMP-CSE-201)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => autofill('STAFF', 'EMP-ACC-301', 'StaffPassword@123')}
                      className="px-2 py-1 text-[11px] font-semibold bg-white hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 border border-slate-200 rounded-lg text-slate-700 transition-all text-left shadow-2xs"
                    >
                      💰 Accounts Officer <span className="text-slate-400 text-[10px] font-mono">(EMP-ACC-301)</span>
                    </button>
                  </>
                )}
                {activeRole === 'ADMIN' && (
                  <>
                    <button
                      type="button"
                      onClick={() => autofill('ADMIN', 'ramya@sasurie.edu', 'RamyaSasurie@123')}
                      className="px-2 py-1 text-[11px] font-semibold bg-white hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 border border-slate-200 rounded-lg text-slate-700 transition-all text-left shadow-2xs"
                    >
                      ⚡ College Admin <span className="text-slate-400 text-[10px] font-mono">(ramya@sasurie.edu)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => autofill('ADMIN', 'ramyacse23@sasurie.com', 'RamyaSasurie@123')}
                      className="px-2 py-1 text-[11px] font-semibold bg-white hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 border border-slate-200 rounded-lg text-slate-700 transition-all text-left shadow-2xs"
                    >
                      ⚡ Sasurie Admin <span className="text-slate-400 text-[10px] font-mono">(ramyacse23@sasurie.com)</span>
                    </button>
                  </>
                )}
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

          <div className="mt-6 text-center pt-4 border-t border-slate-100">
            <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-600">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span>Institutional Secure Access</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Student accounts are registered by the College Administrator. Use your assigned institutional credentials to log in.
            </p>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Clearance Account Password Help</h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Clearance accounts and passwords are centrally managed by the College Administration. If you forgot your password or need your institutional credentials, please contact the College Administration Office or use the Quick Fill buttons on the sign-in form.
            </p>
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="w-full py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors"
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
