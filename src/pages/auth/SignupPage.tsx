import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  ShieldCheck,
  Search,
  UserCheck,
  Building2,
  BookOpen,
  Lock,
  Mail,
  Hash
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export const SignupPage: React.FC = () => {
  const [registerNumber, setRegisterNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    verified: boolean;
    student?: {
      full_name: string;
      register_number: string;
      email: string;
      department_name: string;
      course_name: string;
      year: number;
      section: string;
      is_already_registered?: boolean;
    };
    error?: string;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { signup } = useAuth();
  const navigate = useNavigate();

  // Trigger institutional check when register number and email are both provided
  const handleVerifyStudent = async () => {
    const cleanReg = registerNumber.trim().toUpperCase();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanReg) {
      setError('Please enter your official Register / Roll Number');
      return;
    }
    if (!cleanEmail) {
      setError('Please enter your official College Email address');
      return;
    }

    setVerifying(true);
    setError(null);
    setVerificationResult(null);

    try {
      const res = await api.post('/auth/verify-student', {
        register_number: cleanReg,
        email: cleanEmail
      });

      if (res.data.verified && res.data.student) {
        setVerificationResult({
          verified: true,
          student: res.data.student
        });
      } else {
        setVerificationResult({
          verified: false,
          error: res.data.detail || 'Student verification failed'
        });
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.detail ||
        'Institutional Verification Failed: This Register Number & College Email were not found in the Admin Portal records.';
      setVerificationResult({
        verified: false,
        error: msg
      });
      setError(msg);
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanReg = registerNumber.trim().toUpperCase();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanReg || !cleanEmail || !password) {
      setError('Register Number, College Email, and Password are all required.');
      return;
    }

    if (password.length < 8) {
      setError('Your password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Password and Confirm Password do not match.');
      return;
    }

    setLoading(true);

    try {
      await signup({
        register_number: cleanReg,
        email: cleanEmail,
        password: password
      });

      setSuccessMessage('Account registered and verified successfully! Redirecting to student portal...');
      setTimeout(() => {
        navigate('/student/dashboard');
      }, 1000);
    } catch (err: any) {
      const msg =
        err.response?.data?.detail ||
        'Registration failed. Only students pre-enrolled by the college administration in the Admin Portal can create an account.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 selection:bg-indigo-500 selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-2 mb-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
            <GraduationCap className="w-5 h-5" />
          </div>
          <span className="font-display font-bold text-xl text-slate-900">Apex College</span>
        </Link>
        <h2 className="font-display font-bold text-2xl text-slate-900 tracking-tight">
          Student Portal Registration
        </h2>
        <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
          Sign up using your official Register Number, College Email, and set your own secure password.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-8 rounded-2xl shadow-xl border border-slate-200">
          {/* Institutional Policy Notice */}
          <div className="mb-5 p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs text-indigo-900 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-[11px] text-indigo-950 uppercase tracking-wider">
                Institutional Security Rule
              </p>
              <p className="text-[11px] text-indigo-800/90 mt-0.5 leading-relaxed">
                Only students already enrolled by College Administration in the Admin Portal can activate their account. Random registrations are strictly blocked.
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <div>
                <p className="font-bold text-[11px]">Enrollment Check</p>
                <p className="text-[11px] mt-0.5 leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="font-semibold">{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 1. Register Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                College Register / Roll Number <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Hash className="w-4 h-4" />
                </div>
                <input
                  id="input-register-number"
                  type="text"
                  required
                  placeholder="e.g. 2022BCSE042 or 713521104001"
                  value={registerNumber}
                  onChange={(e) => {
                    setRegisterNumber(e.target.value.toUpperCase());
                    setVerificationResult(null);
                  }}
                  className="w-full text-xs pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 text-slate-800 uppercase placeholder:normal-case font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            {/* 2. College Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Official College Email Address <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="input-college-email"
                  type="email"
                  required
                  placeholder="e.g. student@college.edu"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setVerificationResult(null);
                  }}
                  className="w-full text-xs pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            {/* Verification Button if not verified yet */}
            {(!verificationResult || !verificationResult.verified) && (
              <button
                type="button"
                id="btn-verify-enrollment"
                onClick={handleVerifyStudent}
                disabled={verifying || !registerNumber.trim() || !email.trim()}
                className="w-full py-2 px-3 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {verifying ? (
                  <>Checking Institutional Registry...</>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    Verify Enrollment in Admin Portal
                  </>
                )}
              </button>
            )}

            {/* Verified Student Details Banner */}
            {verificationResult && verificationResult.verified && verificationResult.student && (
              <div className="p-3.5 bg-emerald-50/90 border border-emerald-200 rounded-xl text-emerald-950 space-y-1.5 animate-fadeIn">
                <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Enrolled Record Verified in Admin Portal</span>
                </div>
                <div className="text-[11px] text-emerald-900/90 grid grid-cols-2 gap-x-2 gap-y-1 pt-1 border-t border-emerald-100">
                  <div>
                    <span className="text-emerald-700 font-semibold block text-[10px] uppercase">Name</span>
                    <span className="font-bold">{verificationResult.student.full_name}</span>
                  </div>
                  <div>
                    <span className="text-emerald-700 font-semibold block text-[10px] uppercase">Register No</span>
                    <span className="font-mono font-bold">{verificationResult.student.register_number}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-emerald-700 font-semibold block text-[10px] uppercase">Department & Degree</span>
                    <span>
                      {verificationResult.student.course_name} ({verificationResult.student.department_name})
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Own Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Set Your Own Password <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-slate-400">Min. 8 characters</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="input-own-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Create your own secure password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-xs pl-9 pr-10 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
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

            {/* 4. Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Confirm Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="input-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              id="btn-signup-submit"
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              {loading ? (
                'Verifying & Creating Account...'
              ) : (
                <>
                  Create Student Account <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Already registered?{' '}
              <Link to="/login?role=student" className="text-indigo-600 font-bold hover:underline">
                Sign in with Register Number / Email
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
