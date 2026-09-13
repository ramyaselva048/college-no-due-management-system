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
  Building2
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
                                onClick={() => handleMarkSubjectDue(task.request_id, task.slot, task.student_name)}
                                disabled={isActing}
                                className="px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                                title="Mark pending dues or breakage fee"
                              >
                                Mark Due
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleMarkSubjectDue(task.request_id, task.slot, task.student_name)}
                              disabled={isActing}
                              className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Update clearance status or impose pending fee"
                            >
                              Revoke / Add Due
                            </button>
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
    </div>
  );
};
