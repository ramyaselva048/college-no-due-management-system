import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Clock,
  Search,
  Check,
  AlertCircle,
  BookOpen,
  FlaskConical,
  FileCheck2,
  Building2,
  X
} from 'lucide-react';
import api from '../../services/api';

export const StaffApprovalsPage: React.FC = () => {
  const [subjectTasks, setSubjectTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'cleared' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      const subjRes = await api.get('/staff/allocated-clearance-requests').catch(() => ({ data: [] }));
      setSubjectTasks(Array.isArray(subjRes.data) ? subjRes.data : []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load clearance inbox');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const [staffDueModalTarget, setStaffDueModalTarget] = useState<{
    requestId: number;
    slot: string;
    studentName: string;
    subjectName?: string;
  } | null>(null);
  const [staffDueAmount, setStaffDueAmount] = useState<number>(150);
  const [staffDueReason, setStaffDueReason] = useState<string>('Laboratory equipment fine / pending record');

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

  const openStaffDueModal = (requestId: number, slot: string, studentName: string, subjectName?: string) => {
    setStaffDueModalTarget({ requestId, slot, studentName, subjectName });
    setStaffDueAmount(150);
    setStaffDueReason('Laboratory equipment fine / pending record');
  };

  const handleConfirmStaffDue = async () => {
    if (!staffDueModalTarget) return;
    const { requestId, slot, studentName } = staffDueModalTarget;
    try {
      setActionLoading(`${requestId}-${slot}`);
      await api.post(`/staff/requests/${requestId}/mark-subject-due`, {
        slot,
        amount: Number(staffDueAmount) || 0,
        description: staffDueReason.trim() || `Due: ₹${staffDueAmount}`
      });
      setFeedback(`Due registered for ${studentName} (${slot}). Application will remain pending until cleared.`);
      setStaffDueModalTarget(null);
      await fetchAllData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to mark subject due.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetStaffSubject = async (requestId: number, slot: string, studentName: string) => {
    try {
      setActionLoading(`${requestId}-${slot}`);
      await api.post(`/staff/requests/${requestId}/reset-subject`, {
        slot,
        action: 'reset'
      });
      setFeedback(`Clearance status reset to Pending Review for ${studentName} (${slot}).`);
      setStaffDueModalTarget(null);
      await fetchAllData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to reset subject clearance.');
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
      t.slot?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.department_name?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  const pendingSubjectCount = subjectTasks.filter((t) => !t.is_cleared).length;
  const clearedSubjectCount = subjectTasks.filter((t) => t.is_cleared).length;

  return (
    <div className="space-y-6 animate-fade-in" id="staff-approvals-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display font-bold text-xl text-slate-900">
              Allocated Subject Clearances
            </h2>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Faculty Action Portal
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Review and clear student clearance requests for subjects and laboratories allocated to you
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
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer">✕</button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              statusFilter === 'pending'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Awaiting Action ({pendingSubjectCount})
          </button>
          <button
            onClick={() => setStatusFilter('cleared')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              statusFilter === 'cleared'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Cleared ({clearedSubjectCount})
          </button>
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All Requests ({subjectTasks.length})
          </button>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing {filteredTasks.length} student subject task{filteredTasks.length === 1 ? '' : 's'}
        </div>
      </div>

      {/* Main List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-500 font-medium">Loading your allocated subjects and student requests...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-base text-slate-900">
              No Clearance Tasks Found
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? 'No students matching your search criteria.'
                : statusFilter === 'pending'
                ? 'All clear! No student clearance requests pending for your allocated courses.'
                : 'No student clearance records in this view.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Student Details</th>
                  <th className="py-3.5 px-4">Course & Class</th>
                  <th className="py-3.5 px-4">Allocated Subject / Lab</th>
                  <th className="py-3.5 px-4">Clearance Status</th>
                  <th className="py-3.5 px-4">Submission Date</th>
                  <th className="py-3.5 px-4 text-right">Faculty Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTasks.map((task) => {
                  const key = `${task.request_id}-${task.slot}`;
                  const isActing = actionLoading === key;

                  return (
                    <tr key={key} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div>
                          <p className="font-bold text-slate-900">{task.student_name}</p>
                          <p className="font-mono text-[11px] text-indigo-700 font-semibold">
                            {task.student_reg_no}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Req #{task.request_id} • {task.exam_type}
                          </p>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-700">
                        <p className="font-medium text-slate-900">{task.course_name || task.department_name}</p>
                        <p className="text-[11px] text-slate-500">
                          Year {task.year}, Sem {task.semester} {task.section ? `• Sec ${task.section}` : ''}
                        </p>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-start gap-2">
                          <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                            task.node_type === 'lab'
                              ? 'bg-purple-50 text-purple-700'
                              : task.node_type === 'common'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-blue-50 text-blue-700'
                          }`}>
                            {task.node_type === 'lab' ? (
                              <FlaskConical className="w-3.5 h-3.5" />
                            ) : task.node_type === 'common' ? (
                              <Building2 className="w-3.5 h-3.5" />
                            ) : (
                              <BookOpen className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 leading-tight">
                              <span className="text-indigo-600 font-mono text-[11px] mr-1">[{task.slot}]</span>
                              {task.name}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              Allocated In-Charge: <span className="font-medium text-slate-600">{task.faculty_name}</span>
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {task.is_cleared ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{task.dues_status || 'Cleared'}</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold text-[11px]">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>{task.dues_status || 'Pending Verification'}</span>
                          </div>
                        )}
                        {task.signature_date && task.signature_date !== '-' && (
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Signed on {task.signature_date}
                          </p>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500">
                        {task.submitted_at ? new Date(task.submitted_at).toLocaleDateString() : '—'}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!task.is_cleared ? (
                            <>
                              <button
                                onClick={() => handleAcceptSubject(task.request_id, task.slot, task.student_name)}
                                disabled={isActing}
                                className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-2xs inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                title="Approve clearance for this subject"
                              >
                                <Check className="w-3.5 h-3.5" />
                                {isActing ? 'Saving...' : 'Accept Clearance'}
                              </button>
                              <button
                                onClick={() => openStaffDueModal(task.request_id, task.slot, task.student_name, task.name)}
                                disabled={isActing}
                                className="px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                                title="Mark pending dues or breakage fee"
                              >
                                Mark Due
                              </button>
                            </>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => openStaffDueModal(task.request_id, task.slot, task.student_name, task.name)}
                                disabled={isActing}
                                className="px-2.5 py-1.5 text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                                title="Impose pending fee or breakage fine"
                              >
                                Mark Due
                              </button>
                              <button
                                onClick={() => handleResetStaffSubject(task.request_id, task.slot, task.student_name)}
                                disabled={isActing}
                                className="px-2 py-1.5 text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                                title="Reset status back to Pending Review"
                              >
                                Reset
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Interactive Staff Due & Reset Modal Dialog */}
      {staffDueModalTarget && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setStaffDueModalTarget(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                  Staff Action
                </span>
                <h3 className="font-display font-bold text-base text-slate-900 mt-1">
                  Mark Due or Reset Subject Clearance
                </h3>
                <p className="text-xs text-slate-500">
                  Student: <strong className="text-slate-800">{staffDueModalTarget.studentName}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStaffDueModalTarget(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
              <div className="font-bold text-slate-900">
                [{staffDueModalTarget.slot}] {staffDueModalTarget.subjectName}
              </div>
            </div>

            {/* Due Amount input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Outstanding Due / Penalty Amount (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={staffDueAmount}
                  onChange={(e) => setStaffDueAmount(Math.max(0, Number(e.target.value)))}
                  className="w-full pl-8 pr-3 py-2 text-sm font-semibold border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <span className="text-[10px] text-slate-400 font-medium">Presets:</span>
                {[0, 50, 100, 150, 250, 500].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setStaffDueAmount(amt)}
                    className={`px-2 py-0.5 text-[11px] font-semibold rounded-md border transition-colors cursor-pointer ${
                      staffDueAmount === amt
                        ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                    }`}
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Reason / Remarks */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Reason / Breakdown Remarks
              </label>
              <input
                type="text"
                value={staffDueReason}
                onChange={(e) => setStaffDueReason(e.target.value)}
                placeholder="e.g. Lab equipment breakage, manual submission pending"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => handleResetStaffSubject(staffDueModalTarget.requestId, staffDueModalTarget.slot, staffDueModalTarget.studentName)}
                className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                Reset to Pending (₹0)
              </button>

              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setStaffDueModalTarget(null)}
                  className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmStaffDue}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-2xs inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  {staffDueAmount > 0 ? `Confirm Due (₹${staffDueAmount})` : 'Mark Pending Due'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
