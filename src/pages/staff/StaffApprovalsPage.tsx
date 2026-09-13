import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Building2,
  Search,
  Filter,
  Check,
  AlertCircle,
  BookOpen,
  FlaskConical,
  UserCheck,
  FileCheck2,
  ShieldCheck
} from 'lucide-react';
import api from '../../services/api';
import { ApprovalReviewModal } from '../../components/modals/ApprovalReviewModal';

export const StaffApprovalsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'subject_queue' | 'dept_approvals'>('subject_queue');
  const [subjectTasks, setSubjectTasks] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'cleared' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApproval, setSelectedApproval] = useState<any | null>(null);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [subjRes, appRes] = await Promise.all([
        api.get('/staff/allocated-clearance-requests').catch(() => ({ data: [] })),
        api.get('/no-due-approvals').catch(() => ({ data: [] }))
      ]);
      setSubjectTasks(Array.isArray(subjRes.data) ? subjRes.data : []);
      setApprovals(Array.isArray(appRes.data) ? appRes.data : []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load clearance inbox');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleAcceptSubject = async (requestId: number, slot: string, studentName: string) => {
    try {
      setActionLoading(`${requestId}-${slot}`);
      const res = await api.post(`/staff/requests/${requestId}/clear-subject`, { slot });
      setFeedback(res.data.message || `Subject clearance for ${studentName} (${slot}) accepted!`);
      await fetchAllData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to accept subject clearance.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkSubjectDue = async (requestId: number, slot: string, studentName: string) => {
    const amountStr = window.prompt(`Enter pending fee/breakage amount for ${studentName} - ${slot} (in ₹):`, '150');
    if (amountStr === null) return;
    const amount = Number(amountStr) || 0;
    const desc = window.prompt('Enter reason for pending due (e.g. Lab breakage, overdue manual, assignment delay):', 'Laboratory equipment fine');

    try {
      setActionLoading(`${requestId}-${slot}`);
      await api.post(`/staff/requests/${requestId}/mark-subject-due`, {
        slot,
        amount,
        description: desc || `Due: ₹${amount}`
      });
      setFeedback(`Due registered for ${slot}. Application will remain pending until student clears due.`);
      await fetchAllData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to mark subject due.');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredTasks = subjectTasks.filter((t) => {
    const isPending = !t.is_cleared;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'pending' && isPending) ||
      (statusFilter === 'cleared' && t.is_cleared);

    const matchesSearch =
      searchQuery === '' ||
      t.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.student_reg_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.slot?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  const safeApprovals = Array.isArray(approvals) ? approvals : [];
  const filteredApprovals = safeApprovals.filter((a) => {
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'pending' && a.status === 'pending') ||
      (statusFilter === 'cleared' && a.status === 'approved');

    const matchesSearch =
      searchQuery === '' ||
      a.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.student_reg_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.course_name?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  const pendingSubjectCount = subjectTasks.filter(t => !t.is_cleared).length;
  const pendingDeptCount = safeApprovals.filter(a => a.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display font-bold text-xl text-slate-900">
              Staff Clearance Management
            </h2>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Faculty Action Portal
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Review student applications for subjects & labs allocated to you by HOD, and grant official department sign-offs
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Search student, reg no, or subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs pl-8 pr-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-64"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>
        </div>
      </div>

      {feedback && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedback}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600 text-xs font-bold">✕</button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Mode Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('subject_queue')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-2 cursor-pointer ${
            activeTab === 'subject_queue'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Allocated Subject Clearances</span>
          {pendingSubjectCount > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeTab === 'subject_queue' ? 'bg-indigo-700 text-white' : 'bg-amber-100 text-amber-900 border border-amber-300'
            }`}>
              {pendingSubjectCount} Pending
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('dept_approvals')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-2 cursor-pointer ${
            activeTab === 'dept_approvals'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Department Clearance Approvals</span>
          {pendingDeptCount > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeTab === 'dept_approvals' ? 'bg-indigo-700 text-white' : 'bg-amber-100 text-amber-900 border border-amber-300'
            }`}>
              {pendingDeptCount} Pending
            </span>
          )}
        </button>
      </div>

      {/* Status Sub-Filters */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setStatusFilter('pending')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            statusFilter === 'pending'
              ? 'bg-amber-600 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Awaiting Action
        </button>
        <button
          onClick={() => setStatusFilter('cleared')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            statusFilter === 'cleared'
              ? 'bg-emerald-600 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Accepted & Cleared
        </button>
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            statusFilter === 'all'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All Applications
        </button>
      </div>

      {/* VIEW 1: Allocated Subjects & Labs Queue */}
      {activeTab === 'subject_queue' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {loading ? (
            <div className="py-20 text-center text-xs text-slate-400">Loading allocated subject tasks...</div>
          ) : filteredTasks.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-display font-bold text-base text-slate-900">
                Subject Clearance Inbox Clear
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                No student clearance requests are pending your faculty verification at this moment.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">Student</th>
                    <th className="py-3.5 px-4">Allocated Subject / Lab</th>
                    <th className="py-3.5 px-4">Program & Year</th>
                    <th className="py-3.5 px-4">Clearance Status</th>
                    <th className="py-3.5 px-4">Sign Date</th>
                    <th className="py-3.5 px-4 text-right">Faculty Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTasks.map((task, idx) => {
                    const taskKey = `${task.request_id}-${task.slot}`;
                    const isActing = actionLoading === taskKey;

                    return (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-900">{task.student_name}</p>
                          <p className="font-mono text-[11px] text-indigo-700 font-semibold">
                            {task.student_reg_no}
                          </p>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-800">
                              {task.slot}
                            </span>
                            <span className="font-semibold text-slate-900">{task.name}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            Code: {task.code || '—'} • Faculty: {task.faculty_name}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-700">
                          <p className="font-medium">{task.department_code} • Year {task.year}</p>
                          <p className="text-[11px] text-slate-400">Sem {task.semester} • Sec {task.section || 'A'}</p>
                        </td>

                        <td className="py-3.5 px-4">
                          {task.is_cleared ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[11px]">
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              Accepted / No Dues
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-semibold text-[11px]">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              {task.dues_status || 'Pending Verification'}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                          {task.signature_date || '—'}
                        </td>

                        <td className="py-3.5 px-4 text-right space-x-2">
                          {!task.is_cleared ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleAcceptSubject(task.request_id, task.slot, task.student_name)}
                                disabled={isActing}
                                className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-2xs inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                                {isActing ? 'Processing...' : 'Accept & Grant No Dues'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMarkSubjectDue(task.request_id, task.slot, task.student_name)}
                                disabled={isActing}
                                className="px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              >
                                Mark Due
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleMarkSubjectDue(task.request_id, task.slot, task.student_name)}
                              disabled={isActing}
                              className="px-2.5 py-1 text-[11px] font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                            >
                              Revoke / Add Due
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: Department Clearance Approvals */}
      {activeTab === 'dept_approvals' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {loading ? (
            <div className="py-20 text-center text-xs text-slate-400">Loading department requests...</div>
          ) : filteredApprovals.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-display font-bold text-base text-slate-900">
                Department Inbox Clear
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                No clearance requests matching this criteria at this time.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">Student Details</th>
                    <th className="py-3.5 px-4">Academic Program</th>
                    <th className="py-3.5 px-4">Department Dues Check</th>
                    <th className="py-3.5 px-4">Submission Date</th>
                    <th className="py-3.5 px-4">Decision Status</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredApprovals.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div>
                          <p className="font-bold text-slate-900">{app.student_name}</p>
                          <p className="font-mono text-[11px] text-indigo-700 font-semibold">
                            {app.student_reg_no}
                          </p>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-700">
                        <p className="font-medium">{app.course_name}</p>
                        <p className="text-[11px] text-slate-400">Batch {app.academic_year}</p>
                      </td>

                      <td className="py-3.5 px-4">
                        {app.has_pending_dues ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-semibold text-[11px]">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                            ₹{Number(app.pending_dues_amount || 0).toFixed(2)} Outstanding
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[11px]">
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            Zero Dues Cleared
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500">
                        {app.request_submitted_at
                          ? new Date(app.request_submitted_at).toLocaleDateString()
                          : '—'}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                            app.status === 'approved'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : app.status === 'rejected'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {app.status}
                        </span>
                        {app.remarks && (
                          <p className="text-[10px] text-slate-400 italic mt-0.5 max-w-xs truncate">
                            "{app.remarks}"
                          </p>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedApproval(app)}
                          className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-2xs cursor-pointer"
                        >
                          {app.status === 'pending' ? 'Review & Sign Off' : 'Update Decision'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Review Modal */}
      {selectedApproval && (
        <ApprovalReviewModal
          approval={selectedApproval}
          isOpen={!!selectedApproval}
          onClose={() => setSelectedApproval(null)}
          onSuccess={fetchAllData}
        />
      )}
    </div>
  );
};
