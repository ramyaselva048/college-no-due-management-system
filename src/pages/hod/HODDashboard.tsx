import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  BookOpen,
  CheckCircle2,
  Clock,
  Users,
  UserCheck,
  Award,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  FileCheck2,
  PlusCircle,
  Sparkles,
  Layers,
  ChevronRight,
  Eye
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { HODClearanceModal } from '../../components/hod/HODClearanceModal';

interface HODProfileData {
  hod: {
    id: number;
    email: string;
    full_name: string;
    employee_id: string;
    designation: string;
    phone: string;
  };
  department: {
    id: number;
    name: string;
    code: string;
    description?: string;
  };
  metrics: {
    total_students: number;
    total_faculty: number;
    total_clearance_nodes: number;
    active_requests: number;
    pending_hod_endorsements: number;
  };
}

export const HODDashboard: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<HODProfileData | null>(null);
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const [profileRes, reqRes] = await Promise.all([
        api.get('/hod/profile'),
        api.get('/hod/requests?limit=6')
      ]);
      setData(profileRes.data);
      setRecentRequests(reqRes.data.slice(0, 5));
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load HOD portal data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="w-10 h-10 border-3 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-xs font-semibold text-slate-500">Loading Head of Department Portal...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <span>{error || 'Unable to load HOD Department information'}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HOD Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-display font-extrabold text-2xl shadow-sm shrink-0">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display font-bold text-xl text-slate-900">
                {data.department.name}
              </h1>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                HOD PORTAL • {data.department.code}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Head of Department:{' '}
              <span className="font-semibold text-slate-800">{data.hod.full_name}</span>{' '}
              <span className="text-slate-400">({data.hod.employee_id})</span> •{' '}
              <span className="text-slate-600">{data.hod.designation}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/hod/curriculum"
            className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors shadow-xs inline-flex items-center gap-1.5"
          >
            <BookOpen className="w-4 h-4" /> Allocate Clearance Nodes
          </Link>
          <Link
            to="/hod/requests"
            className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors inline-flex items-center gap-1.5"
          >
            <FileCheck2 className="w-4 h-4" /> Review Requests ({data.metrics.active_requests})
          </Link>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Department Students</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-display text-slate-900">
              {data.metrics.total_students}
            </span>
            <span className="text-xs text-slate-400 ml-1.5 font-medium">Enrolled</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Across Years 1 to 4</span>
            <Link to="/hod/students" className="text-blue-600 hover:underline font-semibold">
              View &rarr;
            </Link>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Clearance Nodes</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-display text-slate-900">
              {data.metrics.total_clearance_nodes}
            </span>
            <span className="text-xs text-slate-400 ml-1.5 font-medium">Configured</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Year-wise & Sem-wise</span>
            <Link to="/hod/curriculum" className="text-amber-600 hover:underline font-semibold">
              Manage &rarr;
            </Link>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Department Staff</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-display text-slate-900">
              {data.metrics.total_faculty}
            </span>
            <span className="text-xs text-slate-400 ml-1.5 font-medium">Faculty Members</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Allocated for Dues</span>
            <Link to="/hod/staff-dues" className="text-emerald-600 hover:underline font-semibold">
              Assign &rarr;
            </Link>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Pending Endorsements</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-display text-slate-900">
              {data.metrics.pending_hod_endorsements}
            </span>
            <span className="text-xs text-slate-400 ml-1.5 font-medium">Need Sign-off</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Awaiting HOD Signature</span>
            <Link to="/hod/requests" className="text-rose-600 hover:underline font-semibold">
              Sign Off &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Role Notice: How HOD Allocation Controls Clearance */}
      <div className="bg-linear-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl p-5 shadow-2xs">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-500 text-white rounded-xl shadow-xs shrink-0 mt-0.5">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-amber-950">
              HOD Clearance Control Architecture
            </h3>
            <p className="text-xs text-amber-800/90 mt-1 leading-relaxed">
              As the Head of Department, only clearance nodes (Theory Subjects & Practical Labs) allocated by you for each semester will be required for students of <strong>{data.department.code}</strong>. The faculty members you assign to each subject are authorized to review and clear subject dues. Once all subject in-charges clear their nodes, the form arrives here for your official <strong>HOD Endorsement</strong>.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                to="/hod/curriculum"
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-2xs inline-flex items-center gap-1"
              >
                Configure Year & Semester Clearance Nodes &rarr;
              </Link>
              <Link
                to="/hod/staff-dues"
                className="px-3 py-1.5 bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 text-xs font-semibold rounded-lg shadow-2xs inline-flex items-center gap-1"
              >
                Manage Staff Assignments
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Clearance Forms in Department */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-display font-bold text-sm text-slate-900">
              Department Clearance Submissions ({data.department.code})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live status of student No Due clearance forms and subject clearances
            </p>
          </div>
          <Link
            to="/hod/requests"
            className="text-xs font-bold text-amber-600 hover:text-amber-700 inline-flex items-center gap-1"
          >
            View All Submissions <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentRequests.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No active clearance submissions from students in {data.department.code} yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-100 font-semibold text-slate-700 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3">Student</th>
                  <th className="px-5 py-3">Year / Sem</th>
                  <th className="px-5 py-3">Exam Type</th>
                  <th className="px-5 py-3">Subject Dues</th>
                  <th className="px-5 py-3">Lab Dues</th>
                  <th className="px-5 py-3">HOD Endorsement</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900">{req.student_name}</div>
                      <div className="text-[11px] text-slate-400">{req.student_reg_no}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-semibold text-slate-800">Year {req.year}</span>
                      <div className="text-[10px] text-slate-400">Sem {req.semester} • Sec {req.section}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {req.exam_type}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {req.all_subjects_cleared ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                          <CheckCircle2 className="w-3.5 h-3.5" /> All Cleared
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600">
                          <Clock className="w-3.5 h-3.5" /> Dues Pending
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {req.all_labs_cleared ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                          <CheckCircle2 className="w-3.5 h-3.5" /> All Cleared
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600">
                          <Clock className="w-3.5 h-3.5" /> Lab Dues
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {req.hod_endorsed ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Endorsed
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          Pending HOD Sign
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => setSelectedRequest(req)}
                        className="px-2.5 py-1 text-[11px] font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-300 transition-colors inline-flex items-center gap-1 cursor-pointer"
                        id={`btn-review-${req.id}`}
                      >
                        <Eye className="w-3 h-3 text-amber-700" /> Review Form
                      </button>
                      <Link
                        to="/hod/requests"
                        className="px-2 py-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition-colors inline-flex items-center gap-0.5"
                      >
                        All <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Clearance Form & Endorsement Modal */}
      <HODClearanceModal
        request={selectedRequest}
        isOpen={!!selectedRequest}
        onClose={() => setSelectedRequest(null)}
        onUpdated={fetchDashboard}
      />
    </div>
  );
};
