import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  Award,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Search,
  Building2,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from 'lucide-react';
import api from '../../services/api';
import { NoDueRequest } from '../../types';

export const AdminRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<NoDueRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await api.get('/no-due-requests');
      setRequests(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load clearance requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleIssueCertificate = async (requestId: number) => {
    if (!window.confirm('Are you sure you want to issue the official No Due Certificate for this student?')) {
      return;
    }

    try {
      setActionLoading(requestId);
      await api.post(`/certificates/issue/${requestId}`);
      alert('Certificate successfully generated and cryptographically minted!');
      await fetchRequests();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to issue certificate');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAdminApprove = async (requestId: number) => {
    const remarks = window.prompt('Administrative approval remarks:', 'Approved by Institutional Administration');
    if (remarks === null) return;

    try {
      setActionLoading(requestId);
      await api.patch(`/no-due-requests/${requestId}`, {
        status: 'approved',
        remarks: remarks || undefined
      });
      await fetchRequests();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to approve request');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAdminReject = async (requestId: number) => {
    const remarks = window.prompt('Enter reason for administrative rejection:');
    if (!remarks || !remarks.trim()) return;

    try {
      setActionLoading(requestId);
      await api.patch(`/no-due-requests/${requestId}`, {
        status: 'rejected',
        remarks: remarks.trim()
      });
      await fetchRequests();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to reject request');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredRequests = requests.filter((r) => {
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchesSearch =
      search === '' ||
      r.student_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.student_reg_no?.toLowerCase().includes(search.toLowerCase()) ||
      r.course_name?.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-xl text-slate-900">
            Institutional Clearance Applications
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor multi-department sign-offs, grant administrative approvals, and issue No Due certificates
          </p>
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="Search student or reg no..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-xs pl-8 pr-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-64"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {['all', 'submitted', 'under_review', 'approved', 'completed', 'rejected'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors shrink-0 ${
              statusFilter === st
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {st.replace('_', ' ')} (
            {st === 'all' ? requests.length : requests.filter((r) => r.status === st).length}
            )
          </button>
        ))}
      </div>

      {/* Request Cards */}
      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400">Loading requests...</div>
      ) : filteredRequests.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
            <FileCheck2 className="w-6 h-6" />
          </div>
          <h3 className="font-display font-bold text-base text-slate-900">No Applications Found</h3>
          <p className="text-xs text-slate-500 mt-1">No clearance applications matching your filters.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((req) => {
            const isExpanded = expandedId === req.id;
            const totalDepts = req.approvals?.length || 0;
            const approvedDepts = req.approvals?.filter((a) => a.status === 'approved').length || 0;
            const hasRejections = req.approvals?.some((a) => a.status === 'rejected');
            const allApproved = totalDepts > 0 && approvedDepts === totalDepts;

            return (
              <div
                key={req.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all"
              >
                {/* Request Header */}
                <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      #{req.id}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-slate-900">{req.student_name}</h4>
                        <span className="font-mono text-xs text-indigo-700 font-semibold">
                          {req.student_reg_no}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            req.status === 'completed' || req.status === 'approved'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : req.status === 'rejected'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {req.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {req.course_name} • Submitted {new Date(req.submitted_at).toLocaleDateString()}
                      </p>
                      {req.remarks && (
                        <p className="text-xs text-slate-600 mt-1 italic">Purpose: "{req.remarks}"</p>
                      )}
                    </div>
                  </div>

                  {/* Actions & Progress Summary */}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <div className="text-left sm:text-right mr-2">
                      <span className="text-[11px] font-bold text-slate-700 block">
                        {approvedDepts}/{totalDepts} Cleared
                      </span>
                      <span className="text-[10px] text-slate-400">Department approvals</span>
                    </div>

                    <button
                      onClick={() => setExpandedId(isExpanded ? null : req.id)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 inline-flex items-center gap-1"
                    >
                      {isExpanded ? 'Hide Details' : 'View Approvals'}{' '}
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {req.status !== 'completed' && req.status !== 'rejected' && (
                      <button
                        onClick={() => handleAdminApprove(req.id)}
                        disabled={actionLoading === req.id}
                        className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors disabled:opacity-50"
                      >
                        Approve
                      </button>
                    )}

                    {(req.status === 'approved' || allApproved) && req.status !== 'completed' && (
                      <button
                        onClick={() => handleIssueCertificate(req.id)}
                        disabled={actionLoading === req.id}
                        className="px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-2xs inline-flex items-center gap-1 disabled:opacity-50"
                      >
                        <Award className="w-3.5 h-3.5" /> Issue Certificate
                      </button>
                    )}

                    {req.status !== 'rejected' && req.status !== 'completed' && (
                      <button
                        onClick={() => handleAdminReject(req.id)}
                        disabled={actionLoading === req.id}
                        className="px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        Reject
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Department Sign-Offs Drawer */}
                {isExpanded && (
                  <div className="p-5 bg-slate-50 border-t border-slate-100">
                    <h5 className="font-bold text-xs text-slate-700 uppercase tracking-wider mb-3">
                      Departmental Clearance Status & Verification Ledger
                    </h5>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {req.approvals?.map((app) => (
                        <div
                          key={app.id}
                          className={`p-3 rounded-xl border text-xs ${
                            app.status === 'approved'
                              ? 'bg-white border-emerald-200'
                              : app.status === 'rejected'
                              ? 'bg-white border-rose-200'
                              : 'bg-white border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-slate-900 truncate">{app.department_name}</span>
                            {app.status === 'approved' ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            ) : app.status === 'rejected' ? (
                              <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            ) : (
                              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            )}
                          </div>
                          <span
                            className={`text-[10px] font-bold uppercase ${
                              app.status === 'approved'
                                ? 'text-emerald-700'
                                : app.status === 'rejected'
                                ? 'text-rose-700'
                                : 'text-slate-500'
                            }`}
                          >
                            {app.status}
                          </span>
                          {app.remarks && (
                            <p className="text-[10px] text-slate-500 italic mt-1 truncate">"{app.remarks}"</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
