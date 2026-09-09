import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  GraduationCap,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Search,
  Calendar,
  Building2,
  User,
  Hash,
  BookOpen,
  ArrowLeft,
  Printer
} from 'lucide-react';
import api from '../../services/api';
import { PublicVerificationResult } from '../../types';

export const VerifyCertificatePage: React.FC = () => {
  const { code } = useParams<{ code?: string }>();
  const [verificationCode, setVerificationCode] = useState(code || '');
  const [result, setResult] = useState<PublicVerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVerification = async (c: string) => {
    if (!c.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await api.get(`/certificates/verify/${c.trim()}`);
      setResult(res.data);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          'Certificate with this verification code was not found in institutional records.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (code) {
      setVerificationCode(code);
      fetchVerification(code);
    }
  }, [code]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchVerification(verificationCode);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Header */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 sm:px-12 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
            <GraduationCap className="w-4 h-4" />
          </div>
          <span className="font-display font-bold text-sm text-slate-900">Apex Institute of Technology</span>
        </Link>

        <Link
          to="/login"
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
        >
          Portal Sign In
        </Link>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold mb-3">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Official Digital Registry Verification
          </div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-slate-900">
            Verify No Due Certificate
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Validate the institutional authenticity and active clearance status of a student No Due Certificate.
          </p>
        </div>

        {/* Verification Code Input */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-8">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              type="text"
              required
              placeholder="Enter Verification Code (e.g. VFY-XXXXXX)"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              className="flex-1 text-xs sm:text-sm font-mono uppercase px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            <button
              id="btn-verify-submit"
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs disabled:opacity-50 shrink-0"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </form>
        </div>

        {error && (
          <div className="bg-white rounded-2xl p-8 text-center border border-rose-200 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <XCircle className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-base text-slate-900">Verification Failed</h3>
            <p className="text-xs text-rose-600 mt-1 max-w-sm mx-auto">{error}</p>
            <p className="text-[11px] text-slate-400 mt-4">
              Please ensure the verification code was typed correctly or contact the college registrar.
            </p>
          </div>
        )}

        {result && (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden print:shadow-none print:border-none">
            {/* Status Header Banner */}
            <div
              className={`p-6 flex items-center justify-between border-b ${
                result.is_valid
                  ? 'bg-emerald-50/70 border-emerald-100 text-emerald-900'
                  : 'bg-rose-50/70 border-rose-100 text-rose-900'
              }`}
            >
              <div className="flex items-center gap-3">
                {result.is_valid ? (
                  <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-200">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-200">
                    <XCircle className="w-6 h-6" />
                  </div>
                )}
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider block">
                    Institutional Record Status
                  </span>
                  <span className="font-display font-extrabold text-xl tracking-tight">
                    {result.status_message}
                  </span>
                </div>
              </div>

              <button
                onClick={() => window.print()}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
              >
                <Printer className="w-3.5 h-3.5" /> Print Verification
              </button>
            </div>

            {/* Certificate Details */}
            <div className="p-6 sm:p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-6 border-b border-slate-100">
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Certificate Number
                  </p>
                  <p className="text-base font-mono font-bold text-slate-900 mt-0.5">
                    {result.certificate_number}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Verification Code
                  </p>
                  <p className="text-base font-mono font-bold text-indigo-700 mt-0.5">
                    {result.verification_code}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                <div className="space-y-4">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Student Full Name</span>
                    <span className="font-bold text-slate-900 text-sm">{result.student_name}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-0.5">Registration Number</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {result.register_number}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-0.5">Academic Degree / Course</span>
                    <span className="font-semibold text-slate-900">{result.course_name}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Department</span>
                    <span className="font-semibold text-slate-900">{result.department_name}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-0.5">Academic Batch</span>
                    <span className="font-semibold text-slate-900">{result.academic_year}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-0.5">Official Date of Issuance</span>
                    <span className="font-semibold text-slate-900">
                      {new Date(result.issued_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-0.5">Issued By</span>
                    <span className="font-semibold text-slate-900">
                      {result.issued_by || 'Institutional Administrator'}
                    </span>
                  </div>
                </div>
              </div>

              {!result.is_valid && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                  <p className="font-bold mb-1">Notice of Revocation</p>
                  <p>
                    This certificate was revoked by the college administration on{' '}
                    <span className="font-semibold">
                      {result.revoked_at ? new Date(result.revoked_at).toLocaleDateString() : 'Record Date'}
                    </span>
                    .
                  </p>
                  {result.revocation_reason && (
                    <p className="mt-1">
                      <span className="font-semibold">Reason:</span> {result.revocation_reason}
                    </p>
                  )}
                </div>
              )}

              {/* Institution Seal Card */}
              <div className="mt-8 p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{result.college_name}</p>
                    <p className="text-[11px] text-slate-500">
                      Office of the Registrar & Academic Clearances
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                    Secured Digital Signature
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
