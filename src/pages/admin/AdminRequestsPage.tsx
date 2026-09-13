import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  AlertCircle,
  Trash2,
  X
} from 'lucide-react';
import api from '../../services/api';
import { NoDueRequest } from '../../types';

export const AdminRequestsPage: React.FC = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<NoDueRequest[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modals replacing browser window.prompt and window.confirm
  const [issuingCertReq, setIssuingCertReq] = useState<NoDueRequest | null>(null);
  const [approvingReq, setApprovingReq] = useState<NoDueRequest | null>(null);
  const [approveRemarks, setApproveRemarks] = useState('Approved by Institutional Administration / Principal');
  const [rejectingReq, setRejectingReq] = useState<NoDueRequest | null>(null);
  const [rejectRemarks, setRejectRemarks] = useState('Requirement unfulfilled or pending administrative verification');
  const [deletingReq, setDeletingReq] = useState<NoDueRequest | null>(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const [resReqs, resCerts] = await Promise.all([
        api.get('/no-due-requests'),
        api.get('/certificates').catch(() => ({ data: [] }))
      ]);
      const data = Array.isArray(resReqs.data)
        ? resReqs.data
        : (Array.isArray(resReqs.data?.requests) ? resReqs.data.requests : []);
      setRequests(data);
      if (Array.isArray(resCerts.data)) {
        setCertificates(resCerts.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load clearance requests');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const confirmIssueCertificate = async () => {
    if (!issuingCertReq) return;
    try {
      setActionLoading(issuingCertReq.id);
      await api.post(`/certificates/issue/${issuingCertReq.id}`);
      setSuccessMsg(`Certificate successfully generated and issued for ${issuingCertReq.student_name}!`);
      setIssuingCertReq(null);
      await fetchRequests();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to issue certificate');
    } finally {
      setActionLoading(null);
    }
  };

  const confirmApproveAndIssueCertificate = async () => {
    if (!issuingCertReq) return;
    try {
      setActionLoading(issuingCertReq.id);
      if (issuingCertReq.status !== 'approved') {
        await api.patch(`/no-due-requests/${issuingCertReq.id}`, {
          status: 'approved',
          remarks: 'Approved by Institutional Administration / Principal'
        });
      }
      await api.post(`/certificates/issue/${issuingCertReq.id}`);
      setSuccessMsg(`Application approved and Certificate successfully issued for ${issuingCertReq.student_name}!`);
      setIssuingCertReq(null);
      await fetchRequests();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to approve and issue certificate');
    } finally {
      setActionLoading(null);
    }
  };

  const confirmAdminApprove = async () => {
    if (!approvingReq) return;
    try {
      setActionLoading(approvingReq.id);
      await api.patch(`/no-due-requests/${approvingReq.id}`, {
        status: 'approved',
        remarks: approveRemarks || undefined
      });
      setSuccessMsg(`Clearance request #${approvingReq.id} approved!`);
      setApprovingReq(null);
      await fetchRequests();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to approve request');
    } finally {
      setActionLoading(null);
    }
  };

  const confirmAdminReject = async () => {
    if (!rejectingReq || !rejectRemarks.trim()) return;
    try {
      setActionLoading(rejectingReq.id);
      await api.patch(`/no-due-requests/${rejectingReq.id}`, {
        status: 'rejected',
        remarks: rejectRemarks.trim()
      });
      setSuccessMsg(`Clearance request #${rejectingReq.id} rejected.`);
      setRejectingReq(null);
      await fetchRequests();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to reject request');
    } finally {
      setActionLoading(null);
    }
  };

  const confirmDeleteRequest = async () => {
    if (!deletingReq) return;
    try {
      setActionLoading(deletingReq.id);
      await api.delete(`/no-due-requests/${deletingReq.id}`);
      setSuccessMsg(`Clearance request #${deletingReq.id} deleted.`);
      setDeletingReq(null);
      await fetchRequests();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete clearance application');
    } finally {
      setActionLoading(null);
    }
  };

  const safeRequests = Array.isArray(requests) ? requests : [];

  const filteredRequests = safeRequests.filter((r) => {
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const searchLower = String(search || '').toLowerCase().trim();
    const matchesSearch =
      searchLower === '' ||
      Boolean(r.student_name?.toLowerCase().includes(searchLower)) ||
      Boolean(r.student_reg_no?.toLowerCase().includes(searchLower)) ||
      Boolean(r.course_name?.toLowerCase().includes(searchLower)) ||
      Boolean(r.department_name?.toLowerCase().includes(searchLower));
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
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
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
            {st === 'all' ? safeRequests.length : safeRequests.filter((r) => r.status === st).length}
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
            const isCleared = (status?: string) => {
              if (!status) return false;
              const s = status.trim().toLowerCase();
              if (s === '-' || s === 'pending review' || s === 'pending verification' || s === 'pending' || s.startsWith('due:') || s.includes('unpaid')) return false;
              return s === 'no dues' || s === 'no due' || s === 'cleared' || s === 'waived' || s.startsWith('exempted') || s === 'verified';
            };
            const subjects = req.subjects || [];
            const labs = (req.labs || []).filter((l: any) => l.name && l.name !== '-');
            const commonNodes = req.common_nodes || [];
            const allItems = [...subjects, ...labs, ...commonNodes].filter((i: any) => i.name && i.name !== '-');
            const totalItems = allItems.length;
            const clearedItems = allItems.filter((i: any) => isCleared(i.dues_status)).length;
            const pendingItems = allItems.filter((i: any) => !isCleared(i.dues_status));
            const isHODEndorsed = !!req.signatories?.hod?.signed || !!req.hod_approved_at;
            const existingCert = certificates.find((c: any) => c.request_id === req.id);
            const isCertIssued = !!existingCert || req.status === 'completed';
            const isApproved = req.status === 'approved';

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
                      <div className="flex flex-wrap items-center gap-2">
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
                        {isHODEndorsed ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> HOD Endorsed
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-600" /> Awaiting HOD Endorsement
                          </span>
                        )}
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
                      <span className="text-[11px] font-bold block text-slate-800">
                        {isHODEndorsed ? (
                          <span className="text-emerald-700 font-bold inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> HOD Endorsed
                          </span>
                        ) : (
                          <span className="text-amber-700 font-bold inline-flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-600" /> Awaiting HOD
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {totalItems > 0 ? `${clearedItems}/${totalItems} Subjects Cleared` : 'Clearance Workflow'}
                      </span>
                    </div>

                    <button
                      onClick={() => setExpandedId(isExpanded ? null : req.id)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 inline-flex items-center gap-1 cursor-pointer"
                    >
                      {isExpanded ? 'Hide Ledger' : 'View Clearance Ledger'}{' '}
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {/* Approve Button */}
                    {isApproved ? (
                      <span className="px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-lg inline-flex items-center gap-1 shadow-2xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Approved
                      </span>
                    ) : req.status === 'completed' ? (
                      <span className="px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-lg inline-flex items-center gap-1 shadow-2xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Completed
                      </span>
                    ) : req.status !== 'rejected' ? (
                      <button
                        onClick={() => {
                          setApprovingReq(req);
                          setApproveRemarks('Approved by Institutional Administration / Principal');
                        }}
                        disabled={actionLoading === req.id}
                        title="Admin review and approve clearance application"
                        className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-2xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        id={`btn-admin-approve-${req.id}`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Approve
                      </button>
                    ) : null}

                    {/* Issue Certificate Button */}
                    {isCertIssued ? (
                      <button
                        onClick={() => navigate('/admin/certificates')}
                        title="Official certificate has been issued and registered. Click to view."
                        className="px-3.5 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors shadow-2xs inline-flex items-center gap-1.5 cursor-pointer"
                        id={`btn-admin-cert-issued-${req.id}`}
                      >
                        <Award className="w-3.5 h-3.5 text-indigo-600" />
                        Certificate Issued ✓
                      </button>
                    ) : (
                      <button
                        onClick={() => setIssuingCertReq(req)}
                        disabled={actionLoading === req.id}
                        title={isApproved ? 'Issue Official No Due Certificate' : 'Approve & Issue Certificate'}
                        className="px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-2xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        id={`btn-admin-issue-cert-${req.id}`}
                      >
                        <Award className="w-3.5 h-3.5" />
                        Issue Certificate
                      </button>
                    )}

                    {req.status !== 'rejected' && req.status !== 'completed' && (
                      <button
                        onClick={() => {
                          setRejectingReq(req);
                          setRejectRemarks('Requirement unfulfilled or pending administrative verification');
                        }}
                        disabled={actionLoading === req.id}
                        className="px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      >
                        Reject
                      </button>
                    )}

                    <button
                      onClick={() => setDeletingReq(req)}
                      disabled={actionLoading === req.id}
                      className="p-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors inline-flex items-center cursor-pointer"
                      title="Delete Application"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Expanded Clearance Ledger Drawer */}
                {isExpanded && (
                  <div className="p-5 bg-slate-50 border-t border-slate-100">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                      <div>
                        <h5 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                          Allocated Subjects & HOD Endorsement Ledger
                        </h5>
                        <p className="text-[11px] text-slate-500">
                          Clearance verified by allocated course faculty and endorsed by Head of Department
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {isHODEndorsed ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            HOD Endorsement Complete ({req.signatories?.hod?.name || req.hod_name || 'HOD'})
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            Awaiting HOD Endorsement
                          </span>
                        )}
                      </div>
                    </div>

                    {req.signatories?.hod?.remarks && (
                      <div className="mb-4 p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-950 text-xs flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-[11px] text-emerald-900">
                            Head of Department Sign-Off ({req.signatories?.hod?.date || 'Recorded'}):
                          </p>
                          <p className="text-xs text-emerald-800 italic mt-0.5">"{req.signatories.hod.remarks}"</p>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {allItems.map((item: any, idx: number) => {
                        const cleared = isCleared(item.dues_status);
                        return (
                          <div
                            key={idx}
                            className={`p-3 rounded-xl border text-xs ${
                              cleared
                                ? 'bg-white border-emerald-200'
                                : 'bg-white border-amber-200'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <span className="font-bold text-slate-900 truncate">
                                {item.slot ? `${item.slot}: ` : ''}{item.name}
                              </span>
                              {cleared ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                              ) : (
                                <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                              )}
                            </div>
                            <div className="flex items-center justify-between mt-1 text-[11px]">
                              <span className="text-slate-500 truncate max-w-[140px]" title={item.faculty_name || 'Faculty In-Charge'}>
                                {item.faculty_name || 'Faculty In-Charge'}
                              </span>
                              <span
                                className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                                  cleared
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-amber-50 text-amber-700'
                                }`}
                              >
                                {item.dues_status || 'Pending'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Approve Modal */}
      {approvingReq && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Approve Clearance Request</h4>
                  <p className="text-[11px] text-slate-400">Application #{approvingReq.id}</p>
                </div>
              </div>
              <button onClick={() => setApprovingReq(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-4">
              Granting administrative clearance for student{' '}
              <span className="font-bold text-slate-900">{approvingReq.student_name}</span> ({approvingReq.student_reg_no || approvingReq.register_number}).
            </p>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs mb-4">
              <p className="font-semibold flex items-center gap-1.5 text-emerald-800">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                Principal / Institutional Authority
              </p>
              <p className="text-[11px] mt-1 text-emerald-700 leading-relaxed">
                Confirming administrative approval formally certifies clearance for this application. Once approved, you can immediately issue the verified No Due Certificate.
              </p>
            </div>

            <div className="mb-5">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Administrative Approval Remarks
              </label>
              <textarea
                rows={3}
                value={approveRemarks}
                onChange={(e) => setApproveRemarks(e.target.value)}
                className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setApprovingReq(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmAdminApprove}
                disabled={actionLoading === approvingReq.id}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {actionLoading === approvingReq.id ? 'Approving...' : 'Confirm Approval'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectingReq && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Reject Clearance Request</h4>
                  <p className="text-[11px] text-slate-400">Application #{rejectingReq.id}</p>
                </div>
              </div>
              <button onClick={() => setRejectingReq(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-4">
              Reject clearance for student{' '}
              <span className="font-bold text-slate-900">{rejectingReq.student_name}</span> ({rejectingReq.student_reg_no || rejectingReq.register_number}).
            </p>

            <div className="mb-5">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Reason for Administrative Rejection <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={rejectRemarks}
                onChange={(e) => setRejectRemarks(e.target.value)}
                placeholder="Enter justification..."
                className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 text-slate-800"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setRejectingReq(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmAdminReject}
                disabled={actionLoading === rejectingReq.id || !rejectRemarks.trim()}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl disabled:opacity-50 cursor-pointer"
              >
                {actionLoading === rejectingReq.id ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Issue Certificate Modal */}
      {issuingCertReq && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Issue No Due Certificate</h4>
                  <p className="text-[11px] text-slate-400">Student: {issuingCertReq.student_name}</p>
                </div>
              </div>
              <button onClick={() => setIssuingCertReq(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {issuingCertReq.status !== 'approved' ? (
              <div className="space-y-3 mb-6">
                <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-900 text-xs">
                  <div className="font-bold flex items-center gap-1.5 text-indigo-800">
                    <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                    Admin Approval & Certificate Issuance
                  </div>
                  <p className="text-[11px] mt-1.5 text-indigo-700 leading-relaxed">
                    Clearance application for <span className="font-bold">{issuingCertReq.student_name}</span> ({issuingCertReq.student_reg_no || issuingCertReq.register_number}) is currently in <span className="font-bold uppercase">{issuingCertReq.status.replace('_', ' ')}</span> status.
                  </p>
                  <p className="text-[11px] mt-1 text-indigo-700 leading-relaxed">
                    Administrative approval will be recorded under Principal authority and the official certificate will be generated and signed immediately.
                  </p>
                </div>
                <p className="text-xs text-slate-600">
                  Click <strong>Approve & Issue Certificate</strong> to grant institutional clearance approval and instantly generate the official digitally verifiable certificate.
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-600 mb-6 leading-relaxed">
                Clearance application is approved. This will generate an official, cryptographically verifiable institutional certificate for student{' '}
                <span className="font-bold text-slate-900">{issuingCertReq.student_name}</span> ({issuingCertReq.student_reg_no || issuingCertReq.register_number}). The student will immediately be able to view and download their verified certificate.
              </p>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setIssuingCertReq(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              {issuingCertReq.status !== 'approved' ? (
                <button
                  onClick={confirmApproveAndIssueCertificate}
                  disabled={actionLoading === issuingCertReq.id}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Award className="w-3.5 h-3.5" />
                  {actionLoading === issuingCertReq.id ? 'Processing...' : 'Approve & Issue Certificate'}
                </button>
              ) : (
                <button
                  onClick={confirmIssueCertificate}
                  disabled={actionLoading === issuingCertReq.id}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Award className="w-3.5 h-3.5" />
                  {actionLoading === issuingCertReq.id ? 'Issuing...' : 'Issue Certificate'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Request Modal */}
      {deletingReq && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Delete Clearance Application</h4>
                  <p className="text-[11px] text-slate-400">Application #{deletingReq.id}</p>
                </div>
              </div>
              <button onClick={() => setDeletingReq(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
              Are you sure you want to permanently delete clearance application{' '}
              <span className="font-bold text-slate-900">#{deletingReq.id}</span> for{' '}
              <span className="font-bold text-slate-900">{deletingReq.student_name}</span> ({deletingReq.register_number})? All departmental approval ledger entries for this request will also be removed.
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDeletingReq(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteRequest}
                disabled={actionLoading === deletingReq.id}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl disabled:opacity-50"
              >
                {actionLoading === deletingReq.id ? 'Deleting...' : 'Delete Application'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
