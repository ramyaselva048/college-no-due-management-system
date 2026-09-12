import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap,
  Receipt,
  FileCheck2,
  Award,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Clock,
  ShieldCheck,
  Building2,
  AlertCircle
} from 'lucide-react';
import api from '../../services/api';
import { StudentDuesSummary } from '../../types';
import { useAuth } from '../../context/AuthContext';

export const StudentDashboard: React.FC = () => {
  const { studentProfile } = useAuth();
  const [summary, setSummary] = useState<StudentDuesSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const res = await api.get('/student/summary');
      setSummary(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load clearance summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 font-medium mt-3">Loading academic clearance status...</p>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-center gap-3">
        <AlertCircle className="w-5 h-5 shrink-0" />
        <span>{error || 'Unable to retrieve student profile'}</span>
      </div>
    );
  }

  const activeRequest = summary.active_request;
  const pendingAmount = Number(summary.pending_due_amount ?? (summary as any).pending_dues_amount ?? 0);
  const clearedAmount = Number(summary.cleared_due_amount ?? (summary as any).cleared_dues_amount ?? 0);
  const hasDues = pendingAmount > 0;
  const depts = (summary.departments_summary || (summary as any).department_statuses || []) as any[];

  return (
    <div className="space-y-6">
      {/* Student Profile Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-display font-extrabold text-xl shadow-xs">
            {summary.student.full_name?.charAt(0)}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display font-bold text-lg text-slate-900">
                {summary.student.full_name}
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                Year {summary.student.year} • Sem {summary.student.semester || (summary.student.year ? summary.student.year * 2 - 1 : 1)}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                Batch {summary.student.admission_year}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Reg No: <span className="font-bold text-indigo-700">{summary.student.register_number}</span> •{' '}
              {summary.student.course_name} ({summary.student.department_name})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {summary.can_request_no_due ? (
            <Link
              to="/student/request"
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs inline-flex items-center gap-1.5"
            >
              Apply for Clearance <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : hasDues ? (
            <Link
              to="/student/dues"
              className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-xs inline-flex items-center gap-1.5"
            >
              Pay Dues (₹{pendingAmount.toFixed(2)}) <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <Link
              to="/student/certificate"
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-xs inline-flex items-center gap-1.5"
            >
              View Certificate <Award className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Pending Dues</span>
            <div className={`p-2 rounded-xl ${hasDues ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <p className={`font-display font-extrabold text-2xl mt-2 ${hasDues ? 'text-rose-600' : 'text-emerald-600'}`}>
            ₹{pendingAmount.toFixed(2)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {hasDues ? 'Must be cleared to request No Due' : 'All accounts settled'}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Settled</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="font-display font-extrabold text-2xl text-slate-900 mt-2">
            ₹{clearedAmount.toFixed(2)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Receipts verified on ledger</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Clearance Status</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <p className="font-display font-extrabold text-base text-slate-900 mt-2 capitalize">
            {activeRequest ? activeRequest.status.replace('_', ' ') : hasDues ? 'Dues Outstanding' : 'Ready to Apply'}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {activeRequest ? 'Review in progress' : 'Checklist status'}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">No Due Certificate</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <p className="font-display font-extrabold text-base text-slate-900 mt-2">
            {activeRequest?.status === 'completed' || activeRequest?.status === 'approved' ? 'Issued' : 'Pending Clearance'}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Digital QR validation</p>
        </div>
      </div>

      {/* Active Request Progress Banner (if exists) */}
      {activeRequest && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              <h3 className="font-display font-bold text-slate-900 text-base">
                Active Clearance Application (Request #{activeRequest.id})
              </h3>
            </div>
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase ${
                activeRequest.status === 'completed' || activeRequest.status === 'approved'
                  ? 'bg-emerald-50 text-emerald-700'
                  : activeRequest.status === 'rejected'
                  ? 'bg-rose-50 text-rose-700'
                  : 'bg-amber-50 text-amber-700'
              }`}
            >
              {activeRequest.status.replace('_', ' ')}
            </span>
          </div>

          <p className="text-xs text-slate-600 mb-4">
            Submitted on {new Date(activeRequest.submitted_at).toLocaleDateString()} • Multi-department review checkpoints:
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {activeRequest.approvals?.map((app: any) => (
              <div
                key={app.id}
                className={`p-3 rounded-xl border text-xs ${
                  app.status === 'approved'
                    ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900'
                    : app.status === 'rejected'
                    ? 'bg-rose-50/50 border-rose-200 text-rose-900'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold truncate">{app.department_name}</span>
                  {app.status === 'approved' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : app.status === 'rejected' ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  ) : (
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  )}
                </div>
                <span className="text-[10px] uppercase font-semibold block">
                  {app.status}
                </span>
                {app.remarks && (
                  <p className="text-[10px] text-slate-500 mt-1 italic truncate">"{app.remarks}"</p>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
            <Link
              to="/student/request"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
            >
              Track Full Application Details <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Department Clearance Checklist */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-display font-bold text-slate-900 text-base">
              Departmental Clearance Status
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive live ledger across all institutional departments
            </p>
          </div>
          <Link
            to="/student/dues"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
          >
            View Full Dues Details
          </Link>
        </div>

        <div className="divide-y divide-slate-100">
          {depts.map((dept) => {
            const deptPending = Number(dept.pending_dues_amount ?? dept.pending_amount ?? 0);
            const deptCleared = Number(dept.cleared_dues_amount ?? 0);
            const deptHasDues = dept.has_dues ?? deptPending > 0;
            return (
              <div
                key={dept.department_id}
                className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      deptHasDues
                        ? 'bg-rose-50 text-rose-600'
                        : 'bg-emerald-50 text-emerald-600'
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{dept.department_name}</p>
                    <p className="text-[11px] text-slate-400 font-mono">Code: {dept.department_code}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p
                      className={`text-xs font-bold ${
                        deptHasDues ? 'text-rose-600' : 'text-emerald-700'
                      }`}
                    >
                      {deptHasDues
                        ? `₹${deptPending.toFixed(2)} Pending`
                        : 'Clear (₹0.00)'}
                    </p>
                    {deptCleared > 0 && (
                      <p className="text-[10px] text-slate-400">
                        ₹{deptCleared.toFixed(2)} previously cleared
                      </p>
                    )}
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                      deptHasDues
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {dept.status || (deptHasDues ? 'PENDING' : 'CLEAR')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
