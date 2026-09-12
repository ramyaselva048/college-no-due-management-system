import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  ShieldCheck,
  Award,
  Users,
  Building2,
  FileCheck2,
  Search,
  ArrowRight,
  CheckCircle2,
  QrCode,
  Receipt
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const [searchCode, setSearchCode] = useState('');
  const navigate = useNavigate();

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchCode.trim()) {
      navigate(`/verify/${searchCode.trim()}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <header className="h-20 bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40 px-6 sm:px-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-100">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg text-slate-900 tracking-tight leading-none">
              Apex Institute of Technology
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Autonomous Academic Institution</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/verify"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <QrCode className="w-4 h-4" />
            Verify Certificate
          </Link>
          <Link
            to="/login"
            className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all flex items-center gap-1.5"
          >
            Portal Login <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col">
        <section className="pt-16 pb-12 px-6 sm:px-12 max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-6">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            Centralized Digital No Due & Clearance Infrastructure
          </div>

          <h2 className="font-display text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight sm:leading-tight">
            Seamless College Clearance, <br className="hidden sm:inline" />
            Zero Paperwork Friction.
          </h2>

          <p className="mt-4 text-slate-600 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Eliminate manual queues across Library, Accounts, Laboratories, Hostels, and Departments.
            Settle outstanding dues online, monitor real-time clearance approvals, and receive an authentic,
            tamper-evident digital No Due Certificate with QR verification.
          </p>

          {/* Quick Action CTA */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/login"
              id="cta-portal-login"
              className="px-6 py-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              Sign In to Clearance Portal <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/verify"
              className="px-5 py-3 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-all flex items-center gap-1.5"
            >
              <QrCode className="w-4 h-4 text-slate-500" /> Verify Issued Certificate
            </Link>
          </div>

          {/* Quick Public Verification Bar */}
          <div className="mt-8 max-w-xl mx-auto bg-white p-2 rounded-2xl shadow-lg border border-slate-200">
            <form onSubmit={handleVerify} className="flex items-center gap-2">
              <div className="pl-3 text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="Enter Certificate Verification Code (e.g. VFY-XXXXXX)"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                className="flex-1 text-xs py-2 px-2 text-slate-800 placeholder-slate-400 bg-transparent focus:outline-none"
              />
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shrink-0"
              >
                Verify Code
              </button>
            </form>
          </div>
        </section>

        {/* Portal Cards */}
        <section className="py-12 px-6 sm:px-12 max-w-6xl mx-auto w-full">
          <div className="text-center mb-10">
            <h3 className="font-display text-xl sm:text-2xl font-bold text-slate-900">
              Access Your Designated Workspace
            </h3>
            <p className="text-xs text-slate-500 mt-1">Select your institutional role to continue</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Student Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <h4 className="font-display font-bold text-base text-slate-900">Student Portal</h4>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Inspect pending departmental dues, clear fees via simulated institutional gateway, submit clearance requests, and download official PDF certificates.
                </p>
                <ul className="mt-4 space-y-2 text-xs text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    Track multi-department review
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    Direct online due settlement
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    Tamper-proof PDF certificate
                  </li>
                </ul>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col gap-2">
                <Link
                  to="/login?role=student"
                  className="w-full text-center px-4 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs"
                >
                  Student Login
                </Link>
              </div>
            </div>

            {/* HOD Portal Card */}
            <div className="bg-white rounded-2xl p-6 border border-amber-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between ring-1 ring-amber-100">
              <div>
                <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                  <Building2 className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-1.5">
                  <h4 className="font-display font-bold text-base text-slate-900">HOD Portal</h4>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">Key Role</span>
                </div>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Head of Department controls. Allocate semester-wise clearance nodes and assign faculty in-charge for student dues clearance.
                </p>
                <ul className="mt-4 space-y-2 text-xs text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    Allocate Year/Sem nodes
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    Assign subject faculty
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    HOD endorsement sign-off
                  </li>
                </ul>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col gap-2">
                <Link
                  to="/login?role=hod"
                  className="w-full text-center px-4 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors shadow-xs"
                >
                  HOD Login
                </Link>
              </div>
            </div>

            {/* Department Staff Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                  <Building2 className="w-6 h-6" />
                </div>
                <h4 className="font-display font-bold text-base text-slate-900">Department Staff</h4>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Designated clearance officers for Central Library, Accounts, Labs, Hostels, Transport, Sports, and Academic Departments.
                </p>
                <ul className="mt-4 space-y-2 text-xs text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    Enforced single-dept access
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    Record & waive student dues
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    Approve / reject clearance inbox
                  </li>
                </ul>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <Link
                  to="/login?role=staff"
                  className="w-full text-center px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors"
                >
                  Staff and Officer Sign In
                </Link>
              </div>
            </div>

            {/* Administration Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h4 className="font-display font-bold text-base text-slate-900">Institutional Admin</h4>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  College-wide oversight. Manage departments, staff accounts, due categories, review overall requests, and issue digital No Due certificates.
                </p>
                <ul className="mt-4 space-y-2 text-xs text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    Final review & certificate issuance
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    Full audit logs & governance
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    Analytics & collection reports
                  </li>
                </ul>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <Link
                  to="/login?role=admin"
                  className="w-full text-center px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors"
                >
                  Admin Console
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Workflow overview */}
        <section className="py-12 bg-white border-t border-slate-200 mt-auto">
          <div className="max-w-6xl mx-auto px-6 sm:px-12">
            <h3 className="font-display font-bold text-lg text-slate-900 text-center mb-8">
              End-to-End Clearance Workflow
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 text-center">
              <div className="p-4">
                <div className="w-10 h-10 mx-auto rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs mb-3">
                  01
                </div>
                <h5 className="font-bold text-xs text-slate-900">Clear Dues</h5>
                <p className="text-[11px] text-slate-500 mt-1">
                  Students inspect and settle all pending dues across all college departments.
                </p>
              </div>
              <div className="p-4">
                <div className="w-10 h-10 mx-auto rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs mb-3">
                  02
                </div>
                <h5 className="font-bold text-xs text-slate-900">Initiate Request</h5>
                <p className="text-[11px] text-slate-500 mt-1">
                  Student submits No Due request, automatically generating clearance checkpoints.
                </p>
              </div>
              <div className="p-4">
                <div className="w-10 h-10 mx-auto rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs mb-3">
                  03
                </div>
                <h5 className="font-bold text-xs text-slate-900">Staff Review</h5>
                <p className="text-[11px] text-slate-500 mt-1">
                  Each department reviews and digitally signs off once criteria are met.
                </p>
              </div>
              <div className="p-4">
                <div className="w-10 h-10 mx-auto rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs mb-3">
                  04
                </div>
                <h5 className="font-bold text-xs text-slate-900">Certificate Issued</h5>
                <p className="text-[11px] text-slate-500 mt-1">
                  Administration approves and issues authenticated PDF certificate with QR code.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-6 px-6 sm:px-12 text-center text-xs border-t border-slate-800">
        <p>© 2026 Apex Institute of Technology. All institutional rights reserved.</p>
        <p className="text-[11px] text-slate-500 mt-1">Integrated Institutional No Due & Digital Clearance System</p>
      </footer>
    </div>
  );
};
