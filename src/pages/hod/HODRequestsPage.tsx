import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileCheck2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  Filter,
  Eye,
  Award,
  BookOpen,
  UserCheck,
  ShieldCheck,
  Building2,
  X,
  Check,
  AlertTriangle,
  FileText,
  ArrowLeft
} from 'lucide-react';
import api from '../../services/api';
import { HODClearanceModal } from '../../components/hod/HODClearanceModal';

export const HODRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedExamType, setSelectedExamType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Modal inspection & clearance state
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await api.get('/hod/requests');
      setRequests(res.data);
    } catch (err: any) {
      console.error('Failed to load requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const filteredRequests = requests.filter((r) => {
    if (selectedYear !== 'all' && String(r.year) !== selectedYear) return false;
    if (selectedExamType !== 'all' && r.exam_type !== selectedExamType) return false;
    if (selectedStatus !== 'all' && r.status !== selectedStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = r.student_name?.toLowerCase().includes(q);
      const matchReg = r.student_reg_no?.toLowerCase().includes(q);
      if (!matchName && !matchReg) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display font-bold text-xl text-slate-900">
              Department Clearance Submissions
            </h1>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
              HOD Verification Portal
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Review student No Due forms, verify allocated subject clearance nodes, inspect lab dues, and digitally endorse forms for final administrative approval.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/hod/dashboard"
            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors shadow-2xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
          <button
            type="button"
            onClick={fetchRequests}
            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            Refresh Submissions
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search student by name or register no..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-xl bg-slate-50/50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="text-xs p-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-700 font-semibold focus:outline-none"
          >
            <option value="all">All Academic Years</option>
            <option value="1">Year 1</option>
            <option value="2">Year 2</option>
            <option value="3">Year 3</option>
            <option value="4">Year 4</option>
          </select>

          <select
            value={selectedExamType}
            onChange={(e) => setSelectedExamType(e.target.value)}
            className="text-xs p-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-700 font-semibold focus:outline-none"
          >
            <option value="all">All Clearance Types</option>
            <option value="Model Examination">Model Examination</option>
            <option value="End Semester Practical">End Semester Practical</option>
            <option value="End Semester Theory">End Semester Theory</option>
            <option value="Transfer / Course Completion">Transfer / Course Completion</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs p-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-700 font-semibold focus:outline-none"
          >
            <option value="all">All Clearance Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="approved">Approved</option>
          </select>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">Loading department submissions...</div>
        ) : filteredRequests.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">
            No clearance requests matching the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-100 font-semibold text-slate-700 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Student Information</th>
                  <th className="px-5 py-3.5">Year / Sem</th>
                  <th className="px-5 py-3.5">Clearance Purpose</th>
                  <th className="px-5 py-3.5">Allocated Subjects</th>
                  <th className="px-5 py-3.5">Allocated Labs</th>
                  <th className="px-5 py-3.5">HOD Endorsement</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900">{req.student_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{req.student_reg_no}</div>
                      <div className="text-[10px] text-slate-500">Attendance: {req.attendance_percentage}%</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-semibold text-slate-800">Year {req.year}</span>
                      <div className="text-[10px] text-slate-400">Sem {req.semester} • Section {req.section}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {req.exam_type}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {req.all_subjects_cleared ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                          <CheckCircle2 className="w-3.5 h-3.5" /> All 6 Cleared
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600">
                          <Clock className="w-3.5 h-3.5" /> Staff Dues Pending
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {req.all_labs_cleared ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                          <CheckCircle2 className="w-3.5 h-3.5" /> All Labs Cleared
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600">
                          <Clock className="w-3.5 h-3.5" /> Lab Dues
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {req.hod_endorsed ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Endorsed
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> Awaiting HOD Sign
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedRequest(req)}
                        className="px-3 py-1.5 text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 rounded-xl border border-amber-300 transition-colors inline-flex items-center gap-1 shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5 text-amber-700" /> Review & Clear
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail & Endorsement Modal */}
      <HODClearanceModal
        request={selectedRequest}
        isOpen={!!selectedRequest}
        onClose={() => setSelectedRequest(null)}
        onUpdated={fetchRequests}
      />
    </div>
  );
};
