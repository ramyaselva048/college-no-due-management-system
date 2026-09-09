import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Users,
  Building2,
  FileCheck2,
  Award,
  Receipt,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  History,
  BookOpen,
  RotateCcw,
  RefreshCw,
  ShieldAlert,
  X,
  Check
} from 'lucide-react';
import api from '../../services/api';
import { AdminDashboardData } from '../../types';

export const AdminDashboard: React.FC = () => {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetMode, setResetMode] = useState<'clear_cycle' | 'clear_dues' | 'full_reset'>('clear_cycle');
  const [resetting, setResetting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const res = await api.get('/admin/dashboard');
      setData(res.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load administrative analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleExecuteReset = async () => {
    try {
      setResetting(true);
      setError(null);
      const res = await api.post('/admin/reset', { mode: resetMode });
      setSuccessMsg(res.data.message || 'Portal reset completed successfully.');
      setShowResetModal(false);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to complete reset operation.');
    } finally {
      setResetting(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return <div className="py-20 text-center text-xs text-slate-400">Loading institutional analytics...</div>;
  }

  if (error || !data) {
    return (
      <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span>{error || 'Unable to load administration dashboard'}</span>
      </div>
    );
  }

  const { stats, department_breakdown, recent_requests, recent_audits } = data;

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 uppercase tracking-wider">
              Institutional Admin Console
            </span>
          </div>
          <h2 className="font-display font-bold text-xl text-slate-900 mt-1">
            Apex Institute Academic Oversight
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time management of college clearances, financial dues, departmental sign-offs, and certificates
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={fetchData}
            disabled={refreshing}
            title="Refresh dashboard metrics"
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </button>

          <Link
            to="/admin/requests"
            className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs inline-flex items-center gap-1.5"
          >
            Clearance Queue ({stats.pending_requests_count}) <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            to="/admin/reports"
            className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors inline-flex items-center gap-1.5"
          >
            <TrendingUp className="w-3.5 h-3.5" /> Analytics & Reports
          </Link>

          <button
            onClick={() => setShowResetModal(true)}
            id="dashboard-portal-reset-button"
            className="px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-xs font-bold text-rose-700 transition-colors inline-flex items-center gap-1.5 shadow-2xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-rose-600" /> Reset Portal
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Pending Requests</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <p className="font-display font-extrabold text-2xl text-slate-900 mt-2">
            {stats.pending_requests_count}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {stats.approved_requests_count} approved • {stats.rejected_requests_count} rejected
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Outstanding Dues</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <p className="font-display font-extrabold text-2xl text-rose-600 mt-2">
            ₹{Number(stats.pending_dues_amount || 0).toFixed(2)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">{stats.pending_dues_count} pending fee records</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Collected / Cleared</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="font-display font-extrabold text-2xl text-emerald-700 mt-2">
            ₹{Number(stats.cleared_dues_amount || 0).toFixed(2)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">{stats.cleared_dues_count} settled dues</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Valid Certificates</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <p className="font-display font-extrabold text-2xl text-indigo-700 mt-2">
            {stats.valid_certificates_count}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Digital certificates minted</p>
        </div>
      </div>

      {/* Institutional Demographics Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link
          to="/admin/students"
          className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-indigo-300 transition-all flex items-center gap-3"
        >
          <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-semibold block">Enrolled Students</span>
            <span className="font-display font-bold text-base text-slate-900">{stats.total_students}</span>
          </div>
        </Link>

        <Link
          to="/admin/staff"
          className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-indigo-300 transition-all flex items-center gap-3"
        >
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-semibold block">Clearance Staff</span>
            <span className="font-display font-bold text-base text-slate-900">{stats.total_staff}</span>
          </div>
        </Link>

        <Link
          to="/admin/departments"
          className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-indigo-300 transition-all flex items-center gap-3"
        >
          <div className="p-2.5 rounded-lg bg-purple-50 text-purple-600">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-semibold block">Departments</span>
            <span className="font-display font-bold text-base text-slate-900">{stats.total_departments}</span>
          </div>
        </Link>

        <Link
          to="/admin/courses"
          className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-indigo-300 transition-all flex items-center gap-3"
        >
          <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-semibold block">Degree Programs</span>
            <span className="font-display font-bold text-base text-slate-900">{stats.total_courses}</span>
          </div>
        </Link>
      </div>

      {/* Department Liabilities Breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display font-bold text-base text-slate-900">
              Departmental Outstanding Liabilities Breakdown
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Active pending dues categorized across institutional departments
            </p>
          </div>
          <Link
            to="/admin/reports"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
          >
            Detailed Analytics
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {department_breakdown.map((dept) => (
            <div
              key={dept.department_id}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-900 truncate">{dept.department_name}</span>
                  <span className="text-[10px] font-mono text-slate-400 uppercase">{dept.department_code}</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {dept.pending_count} students with unpaid dues
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-medium">Uncollected:</span>
                <span className={`font-display font-bold text-sm ${dept.pending_amount > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                  ₹{Number(dept.pending_amount || 0).toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Split section: Recent Requests & Recent Audits */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Clearance Requests */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-display font-bold text-sm text-slate-900 flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-indigo-600" /> Recent Clearance Requests
            </h3>
            <Link to="/admin/requests" className="text-xs font-semibold text-indigo-600 hover:underline">
              View All
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {recent_requests.length === 0 ? (
              <p className="p-6 text-center text-xs text-slate-400">No clearance requests submitted</p>
            ) : (
              recent_requests.slice(0, 5).map((r: any) => (
                <div key={r.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50">
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      {r.student?.full_name || `Student #${r.student_id}`}
                    </p>
                    <p className="text-[11px] font-mono text-slate-500">
                      Reg: {r.student?.register_number || 'N/A'} • Submitted {new Date(r.submitted_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                      r.status === 'completed' || r.status === 'approved'
                        ? 'bg-emerald-50 text-emerald-700'
                        : r.status === 'rejected'
                        ? 'bg-rose-50 text-rose-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {r.status.replace('_', ' ')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Security & Activity Audit Trail */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-display font-bold text-sm text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-600" /> Security & Financial Audit Trail
            </h3>
            <Link to="/admin/audit-logs" className="text-xs font-semibold text-indigo-600 hover:underline">
              Full Logs
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {recent_audits.length === 0 ? (
              <p className="p-6 text-center text-xs text-slate-400">No recent audit activities</p>
            ) : (
              recent_audits.slice(0, 5).map((log: any) => (
                <div key={log.id} className="p-3.5 flex items-start gap-3 hover:bg-slate-50/50">
                  <div className="w-6 h-6 rounded bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    {log.action?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0 text-xs">
                    <p className="font-bold text-slate-900 truncate">
                      {log.action} <span className="font-normal text-slate-500">on {log.entity_type}</span>
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      By: {log.user_email || 'System'} • {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Admin Portal System Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-rose-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-sm text-slate-900">
                    Admin Portal System Reset
                  </h3>
                  <p className="text-xs text-slate-500">
                    Reset clearance cycles or restore clean baseline institutional records
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowResetModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3.5">
              <p className="text-xs text-slate-600">
                Choose the scope of reset operation for the college portal:
              </p>

              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  resetMode === 'clear_cycle'
                    ? 'border-indigo-600 bg-indigo-50/40 text-indigo-950'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="dashboard_reset_mode"
                  checked={resetMode === 'clear_cycle'}
                  onChange={() => setResetMode('clear_cycle')}
                  className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="text-xs font-bold block">
                    Reset Clearance Cycle (New Academic Semester)
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Clears student clearance applications, department approvals, and issued certificates. Keeps all student accounts, staff, departments, and dues intact.
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  resetMode === 'clear_dues'
                    ? 'border-indigo-600 bg-indigo-50/40 text-indigo-950'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="dashboard_reset_mode"
                  checked={resetMode === 'clear_dues'}
                  onChange={() => setResetMode('clear_dues')}
                  className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="text-xs font-bold block">
                    Clear Dues & Payment Records
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Clears all student fee records and payment logs, resetting pending liabilities to zero.
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  resetMode === 'full_reset'
                    ? 'border-rose-600 bg-rose-50/40 text-rose-950'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="dashboard_reset_mode"
                  checked={resetMode === 'full_reset'}
                  onChange={() => setResetMode('full_reset')}
                  className="mt-0.5 text-rose-600 focus:ring-rose-500"
                />
                <div>
                  <span className="text-xs font-bold block text-rose-700">
                    Institutional Baseline Reset (Full Reset)
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Restores clean institutional default database: baseline departments, courses, official staff clearance officers, and enrolled student accounts.
                  </p>
                </div>
              </label>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-[11px] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <span>
                  This operation is logged in the audit trail. Active administrator session will remain logged in.
                </span>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2.5 bg-slate-50">
              <button
                onClick={() => setShowResetModal(false)}
                disabled={resetting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteReset}
                disabled={resetting}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-colors flex items-center gap-1.5 shadow-xs ${
                  resetMode === 'full_reset'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {resetting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{resetting ? 'Resetting...' : 'Confirm Reset'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
