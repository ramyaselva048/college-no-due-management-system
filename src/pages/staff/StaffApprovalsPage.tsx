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
  AlertCircle
} from 'lucide-react';
import api from '../../services/api';
import { ApprovalReviewModal } from '../../components/modals/ApprovalReviewModal';

export const StaffApprovalsPage: React.FC = () => {
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApproval, setSelectedApproval] = useState<any | null>(null);

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      const res = await api.get('/no-due-approvals');
      setApprovals(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load department clearance inbox');
      setApprovals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const safeApprovals = Array.isArray(approvals) ? approvals : [];

  const filteredApprovals = safeApprovals.filter((a) => {
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    const matchesSearch =
      searchQuery === '' ||
      a.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.student_reg_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.course_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-xl text-slate-900">
            Department Clearance Inbox
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Review student applications and grant official department clearance sign-offs
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by student name or reg no..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs pl-8 pr-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-64"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setStatusFilter('pending')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            statusFilter === 'pending'
              ? 'bg-amber-600 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Pending Review ({safeApprovals.filter((a) => a.status === 'pending').length})
        </button>
        <button
          onClick={() => setStatusFilter('approved')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            statusFilter === 'approved'
              ? 'bg-emerald-600 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Approved ({safeApprovals.filter((a) => a.status === 'approved').length})
        </button>
        <button
          onClick={() => setStatusFilter('rejected')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            statusFilter === 'rejected'
              ? 'bg-rose-600 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Rejected ({safeApprovals.filter((a) => a.status === 'rejected').length})
        </button>
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            statusFilter === 'all'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All Requests ({safeApprovals.length})
        </button>
      </div>

      {/* Approvals Table */}
      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400">Loading department requests...</div>
      ) : filteredApprovals.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="font-display font-bold text-base text-slate-900">
            Inbox Clear
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            No clearance requests matching this criteria at this time.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
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
                        className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-2xs"
                      >
                        {app.status === 'pending' ? 'Review & Sign Off' : 'Update Decision'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {selectedApproval && (
        <ApprovalReviewModal
          approval={selectedApproval}
          isOpen={!!selectedApproval}
          onClose={() => setSelectedApproval(null)}
          onSuccess={fetchApprovals}
        />
      )}
    </div>
  );
};
