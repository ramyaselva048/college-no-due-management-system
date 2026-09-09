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
  BookOpen
} from 'lucide-react';
import api from '../../services/api';
import { AdminDashboardData } from '../../types';

export const AdminDashboard: React.FC = () => {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/dashboard');
      setData(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load administrative analytics');
    } finally {
      setLoading(false);
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

        <div className="flex items-center gap-2.5">
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
    </div>
  );
};
