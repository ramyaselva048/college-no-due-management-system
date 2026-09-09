import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  CheckCircle2,
  Receipt,
  Users,
  Clock,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  PlusCircle
} from 'lucide-react';
import api from '../../services/api';
import { StaffDashboardData } from '../../types';
import { useAuth } from '../../context/AuthContext';

export const StaffDashboard: React.FC = () => {
  const { staffProfile } = useAuth();
  const [data, setData] = useState<StaffDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/staff/dashboard');
      setData(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load staff department dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return <div className="py-20 text-center text-xs text-slate-400">Loading department portal...</div>;
  }

  if (error || !data) {
    return (
      <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span>{error || 'Unable to load department information'}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Department Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-display font-extrabold text-xl shadow-xs">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-bold text-lg text-slate-900">
                {data.department_name}
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Dept Code: {data.department_code}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Clearance Officer: <span className="font-semibold text-slate-700">{staffProfile?.full_name}</span> ({staffProfile?.employee_id})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/staff/approvals"
            className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-xs inline-flex items-center gap-1.5"
          >
            Clearance Inbox ({data.pending_approvals_count}) <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            to="/staff/students"
            className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors inline-flex items-center gap-1.5"
          >
            <Users className="w-3.5 h-3.5" /> Students Directory
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Pending Approvals</span>
            <div className={`p-2 rounded-xl ${data.pending_approvals_count > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="font-display font-extrabold text-2xl text-slate-900 mt-2">
            {data.pending_approvals_count}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Awaiting department sign-off</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Department Pending Dues</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <p className="font-display font-extrabold text-2xl text-rose-600 mt-2">
            ₹{Number(data.pending_dues_amount || 0).toFixed(2)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">{data.pending_dues_count} unsettled due records</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Approved Clearances</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="font-display font-extrabold text-2xl text-slate-900 mt-2">
            {data.approved_approvals_count}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Students cleared successfully</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Active Students</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="font-display font-extrabold text-2xl text-slate-900 mt-2">
            {data.total_students}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Registered in department/programs</p>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm mb-1">
              <CheckCircle2 className="w-4 h-4" />
              Clearance Application Inbox
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Verify if graduating students have returned all library books, cleared lab breakages, or satisfied departmental prerequisites.
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">
              {data.pending_approvals_count} pending reviews
            </span>
            <Link
              to="/staff/approvals"
              className="text-xs font-bold text-emerald-600 hover:text-emerald-800 inline-flex items-center gap-1"
            >
              Open Inbox <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm mb-1">
              <Receipt className="w-4 h-4" />
              Department Dues & Fines Ledger
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Record new fines or fees against specific students, waive incorrect records with audit notes, or inspect settlement histories.
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">
              ₹{Number(data.pending_dues_amount || 0).toFixed(2)} active dues
            </span>
            <Link
              to="/staff/dues"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
            >
              Manage Dues <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
