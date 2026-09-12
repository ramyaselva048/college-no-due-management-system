import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  Search,
  ExternalLink,
  Trash2,
  AlertCircle,
  AlertTriangle,
  X,
  CheckCircle2,
  XCircle,
  Download,
  Eye,
  QrCode,
  Printer,
  Calendar,
  Building2,
  User,
  Copy,
  Check,
  History,
  ShieldCheck,
  FileText,
  RefreshCw,
  Plus,
  LayoutGrid,
  List,
  ArrowUpDown,
  GraduationCap
} from 'lucide-react';
import api from '../../services/api';
import { Certificate, Department } from '../../types';
import { SasurieDueFormView } from '../../components/SasurieDueFormView';

interface CertificateAuditLog {
  id: number;
  action: string;
  user_id: number;
  user_email: string;
  entity_id: number;
  details: any;
  ip_address: string;
  created_at: string;
}

export const AdminCertificatesPage: React.FC = () => {
  // Main Data States
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [auditLogs, setAuditLogs] = useState<CertificateAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [auditsLoading, setAuditsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Active View Tab: 'ledger' | 'audits'
  const [activeTab, setActiveTab] = useState<'ledger' | 'audits'>('ledger');
  // Layout mode: 'table' | 'cards'
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Search & Filter Controls
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ISSUED' | 'REVOKED'>('ALL');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('ALL');
  const [selectedIssueDate, setSelectedIssueDate] = useState<string>('');

  // Interactive Modals State
  const [viewingCert, setViewingCert] = useState<Certificate | null>(null);
  const [certModalFormat, setCertModalFormat] = useState<'sasurie_form' | 'certificate'>('sasurie_form');
  const [qrCert, setQrCert] = useState<Certificate | null>(null);
  const [revokingCert, setRevokingCert] = useState<Certificate | null>(null);
  const [revokeReason, setRevokeReason] = useState('Administrative review and discrepancy verification');
  const [deletingCert, setDeletingCert] = useState<Certificate | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  // Quick Issue Modal state (for pending requests that are approved)
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [eligibleRequests, setEligibleRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [issuingRequestId, setIssuingRequestId] = useState<number | null>(null);

  // Fetch Certificates
  const fetchCerts = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/certificates/all');
      const list = Array.isArray(res.data)
        ? res.data
        : (Array.isArray(res.data?.certificates) ? res.data.certificates : []);
      setCertificates(list);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load certificate ledger');
      setCertificates([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Departments for Filter
  const fetchDepartments = async () => {
    try {
      const res = await api.get('/admin/departments');
      if (Array.isArray(res.data)) {
        setDepartments(res.data);
      }
    } catch {
      // Non-critical fallback
    }
  };

  // Fetch Audit History
  const fetchAuditLogs = async () => {
    try {
      setAuditsLoading(true);
      const res = await api.get('/certificates/audits');
      if (Array.isArray(res.data)) {
        setAuditLogs(res.data);
      }
    } catch {
      // ignore
    } finally {
      setAuditsLoading(false);
    }
  };

  useEffect(() => {
    fetchCerts();
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (activeTab === 'audits') {
      fetchAuditLogs();
    }
  }, [activeTab]);

  // Modal accessibility: Escape key and scroll lock
  useEffect(() => {
    const isAnyModalOpen = Boolean(qrCert || viewingCert || revokingCert || deletingCert || showIssueModal);
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (qrCert) setQrCert(null);
        if (viewingCert) setViewingCert(null);
        if (revokingCert) setRevokingCert(null);
        if (deletingCert) setDeletingCert(null);
        if (showIssueModal) setShowIssueModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [qrCert, viewingCert, revokingCert, deletingCert, showIssueModal]);

  // Handle Copy to Clipboard
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // View Certificate Details & Trigger Audit View
  const handleViewCertificate = async (cert: Certificate) => {
    setViewingCert(cert);
    try {
      await api.post(`/certificates/${cert.id}/audit-view`);
    } catch {
      // non-blocking
    }
  };

  // Download PDF Action
  const handleDownloadPdf = async (cert: Certificate) => {
    try {
      setDownloadingId(cert.id);
      const res = await api.get(`/certificates/${cert.id}/download`, {
        responseType: 'blob'
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `NoDueCertificate_${cert.register_number || cert.certificate_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccessMsg(`Official PDF for ${cert.student_name || 'student'} downloaded successfully.`);
      setTimeout(() => setSuccessMsg(null), 3500);

      // Refresh audit logs if viewing audits
      if (activeTab === 'audits') {
        fetchAuditLogs();
      }
    } catch (err: any) {
      setError('Unable to generate or download certificate PDF. Please retry.');
    } finally {
      setDownloadingId(null);
    }
  };

  // Revoke Certificate Action
  const confirmRevoke = async () => {
    if (!revokingCert) return;
    try {
      setActionLoading(true);
      await api.patch(`/certificates/${revokingCert.id}/revoke`, { reason: revokeReason.trim() });
      setSuccessMsg(`Certificate #${revokingCert.certificate_number} has been officially revoked.`);
      setRevokingCert(null);
      await fetchCerts();
      if (activeTab === 'audits') fetchAuditLogs();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to revoke certificate');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Certificate Action
  const confirmDelete = async () => {
    if (!deletingCert) return;
    try {
      setActionLoading(true);
      await api.delete(`/certificates/${deletingCert.id}`);
      setSuccessMsg(`Certificate record #${deletingCert.certificate_number} permanently removed.`);
      setDeletingCert(null);
      await fetchCerts();
      if (activeTab === 'audits') fetchAuditLogs();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete certificate');
    } finally {
      setActionLoading(false);
    }
  };

  // Load eligible clearance requests for manual issuance
  const loadEligibleRequests = async () => {
    setShowIssueModal(true);
    setLoadingRequests(true);
    try {
      const res = await api.get('/no-due-requests/all');
      const allRequests = Array.isArray(res.data) ? res.data : [];
      // Eligible: not completed, and all approvals approved
      const issuedReqIds = new Set(certificates.map(c => c.request_id));
      const eligible = allRequests.filter(r => {
        if (issuedReqIds.has(r.id)) return false;
        if (r.status === 'completed') return false;
        const approvals = r.approvals || [];
        return approvals.length > 0 && approvals.every((a: any) => a.status === 'approved');
      });
      setEligibleRequests(eligible);
    } catch {
      setEligibleRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  };

  // Direct Issue Certificate from Ledger
  const handleDirectIssue = async (reqId: number) => {
    try {
      setIssuingRequestId(reqId);
      await api.post(`/certificates/request/${reqId}/issue`);
      setSuccessMsg('Certificate issued and registered in ledger successfully!');
      setShowIssueModal(false);
      await fetchCerts();
      if (activeTab === 'audits') fetchAuditLogs();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Could not issue certificate for this request.');
    } finally {
      setIssuingRequestId(null);
    }
  };

  // Summary Metrics Computation
  const metrics = useMemo(() => {
    const total = certificates.length;
    const issued = certificates.filter(c => c.is_valid).length;
    const revoked = certificates.filter(c => !c.is_valid).length;
    return { total, issued, revoked };
  }, [certificates]);

  // Filtering Logic
  const filteredCerts = useMemo(() => {
    return certificates.filter((cert) => {
      // Search: Certificate ID, Student Name, Register Number, Verification Code
      const query = search.trim().toLowerCase();
      if (query) {
        const matchesSearch =
          cert.certificate_number?.toLowerCase().includes(query) ||
          cert.student_name?.toLowerCase().includes(query) ||
          cert.register_number?.toLowerCase().includes(query) ||
          cert.verification_code?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Status Filter
      if (statusFilter === 'ISSUED' && !cert.is_valid) return false;
      if (statusFilter === 'REVOKED' && cert.is_valid) return false;

      // Department Filter
      if (selectedDeptId !== 'ALL') {
        const deptIdNum = Number(selectedDeptId);
        if (cert.department_id !== deptIdNum && cert.department_name?.toLowerCase() !== departments.find(d => d.id === deptIdNum)?.name.toLowerCase()) {
          return false;
        }
      }

      // Issue Date Filter (matches YYYY-MM-DD)
      if (selectedIssueDate) {
        if (!cert.issued_at.startsWith(selectedIssueDate)) {
          return false;
        }
      }

      return true;
    });
  }, [certificates, search, statusFilter, selectedDeptId, selectedIssueDate, departments]);

  const hasActiveFilters = search !== '' || statusFilter !== 'ALL' || selectedDeptId !== 'ALL' || selectedIssueDate !== '';

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setSelectedDeptId('ALL');
    setSelectedIssueDate('');
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display font-bold text-2xl text-slate-900 tracking-tight">
              Certificates Ledger
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
              Institutional Registry
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Tamper-evident cryptographic ledger of all issued and revoked No Due Certificates
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Toggle between Ledger and Audit History */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
            <button
              id="tab-certificates-ledger"
              onClick={() => setActiveTab('ledger')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                activeTab === 'ledger'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Award className="w-3.5 h-3.5 text-indigo-600" />
              Certificates
            </button>
            <button
              id="tab-certificates-audit"
              onClick={() => setActiveTab('audits')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                activeTab === 'audits'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5 text-amber-600" />
              Audit History
            </button>
          </div>

          {/* Quick Refresh */}
          <button
            onClick={() => {
              fetchCerts();
              if (activeTab === 'audits') fetchAuditLogs();
            }}
            title="Refresh Ledger Data"
            className="p-2 text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors shadow-2xs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>

          {/* Issue Certificate Action Button */}
          <button
            id="btn-issue-certificate"
            onClick={loadEligibleRequests}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            Issue Certificate
          </button>
        </div>
      </div>

      {/* Notification Banners */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-center justify-between shadow-2xs animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span className="font-medium">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs flex items-center justify-between shadow-2xs animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span className="font-medium">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Summary Cards (Requirement 8) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Total Certificates */}
        <button
          onClick={() => setStatusFilter('ALL')}
          className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden group ${
            statusFilter === 'ALL'
              ? 'bg-white border-indigo-300 ring-2 ring-indigo-500/20 shadow-md'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Certificates
            </span>
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Award className="w-5 h-5 text-indigo-600" />
            </div>
          </div>
          <p className="font-display font-extrabold text-3xl text-slate-900 mt-2">
            {metrics.total}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            All registered clearance records
          </div>
        </button>

        {/* Card 2: Issued & Active */}
        <button
          onClick={() => setStatusFilter('ISSUED')}
          className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden group ${
            statusFilter === 'ISSUED'
              ? 'bg-white border-emerald-300 ring-2 ring-emerald-500/20 shadow-md'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
              Issued & Authentic
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <p className="font-display font-extrabold text-3xl text-emerald-600 mt-2">
            {metrics.issued}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Active, valid & downloadable credentials
          </div>
        </button>

        {/* Card 3: Revoked */}
        <button
          onClick={() => setStatusFilter('REVOKED')}
          className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden group ${
            statusFilter === 'REVOKED'
              ? 'bg-white border-rose-300 ring-2 ring-rose-500/20 shadow-md'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">
              Revoked Credentials
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <XCircle className="w-5 h-5" />
            </div>
          </div>
          <p className="font-display font-extrabold text-3xl text-rose-600 mt-2">
            {metrics.revoked}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-rose-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            Invalidated by administrative review
          </div>
        </button>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'ledger' ? (
        <div className="space-y-4">
          {/* Search and Filters Bar (Requirements 6 & 7) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  id="search-certificates-input"
                  type="text"
                  placeholder="Search by Certificate ID, Student Name, Register Number, or Code..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full text-xs pl-10 pr-9 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* View Layout Toggle */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-end lg:self-auto border border-slate-200">
                <button
                  onClick={() => setViewMode('table')}
                  title="Table View"
                  className={`p-1.5 rounded-lg text-xs transition-colors ${
                    viewMode === 'table' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  title="Cards View"
                  className={`p-1.5 rounded-lg text-xs transition-colors ${
                    viewMode === 'cards' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filter Pills / Selectors */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
              {/* Status Filter */}
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl">
                {(['ALL', 'ISSUED', 'REVOKED'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      statusFilter === status
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {status === 'ALL' ? 'All Status' : status === 'ISSUED' ? 'Issued' : 'Revoked'}
                  </button>
                ))}
              </div>

              {/* Department Filter (Type Option) */}
              <div className="relative">
                <input
                  id="filter-department-input"
                  type="text"
                  list="filter-departments-datalist"
                  placeholder="Type department..."
                  value={selectedDeptId === 'ALL' ? '' : (departments.find((d) => String(d.id) === selectedDeptId)?.name || selectedDeptId)}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val || val.toLowerCase() === 'all' || val.toLowerCase() === 'all departments') {
                      setSelectedDeptId('ALL');
                    } else {
                      const matched = departments.find(
                        (d) =>
                          d.name.toLowerCase().includes(val.toLowerCase()) ||
                          (d.code && d.code.toLowerCase().includes(val.toLowerCase())) ||
                          String(d.id) === val
                      );
                      setSelectedDeptId(matched ? String(matched.id) : val);
                    }
                  }}
                  className="text-xs px-3 py-1.5 border border-slate-200 rounded-xl bg-white text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 w-40"
                />
                <datalist id="filter-departments-datalist">
                  <option value="All Departments" />
                  {departments.map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.code}
                    </option>
                  ))}
                </datalist>
              </div>

              {/* Issue Date Filter */}
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  id="filter-issue-date"
                  type="date"
                  value={selectedIssueDate}
                  onChange={(e) => setSelectedIssueDate(e.target.value)}
                  className="text-xs bg-transparent text-slate-700 focus:outline-none"
                  placeholder="Issue Date"
                />
                {selectedIssueDate && (
                  <button
                    onClick={() => setSelectedIssueDate('')}
                    className="text-slate-400 hover:text-slate-600 ml-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Reset Filter Button */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-auto"
                >
                  Reset Filters
                </button>
              )}
            </div>
          </div>

          {/* Certificates Records Content */}
          {loading ? (
            <div className="bg-white rounded-2xl p-16 text-center border border-slate-200 shadow-2xs">
              <RefreshCw className="w-7 h-7 text-indigo-600 animate-spin mx-auto mb-3" />
              <p className="text-xs font-semibold text-slate-600">Loading verified certificate records...</p>
              <p className="text-[11px] text-slate-400 mt-1">Connecting to institutional ledger</p>
            </div>
          ) : filteredCerts.length === 0 ? (
            <div className="bg-white rounded-2xl p-16 text-center border border-slate-200 shadow-2xs">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                <Award className="w-7 h-7" />
              </div>
              <h3 className="font-display font-bold text-base text-slate-900">
                No Certificates Found
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {hasActiveFilters
                  ? 'No certificate records matched the search query or filter criteria. Try adjusting your search or resetting filters.'
                  : 'No student certificates have been issued yet. Issue certificates when all departmental clearance signs are approved.'}
              </p>
              {hasActiveFilters ? (
                <button
                  onClick={clearFilters}
                  className="mt-4 px-4 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50 border border-indigo-200 rounded-xl transition-colors"
                >
                  Clear All Filters
                </button>
              ) : (
                <button
                  onClick={loadEligibleRequests}
                  className="mt-4 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Issue First Certificate
                </button>
              )}
            </div>
          ) : viewMode === 'table' ? (
            /* Table View (Requirement 1 & 2) */
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3.5 px-4">Certificate ID</th>
                      <th className="py-3.5 px-4">Student Details</th>
                      <th className="py-3.5 px-4">Department & Course</th>
                      <th className="py-3.5 px-4">Issue Date</th>
                      <th className="py-3.5 px-4">Issued By</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCerts.map((cert) => (
                      <tr
                        key={cert.id}
                        className="hover:bg-slate-50/70 transition-colors group"
                      >
                        {/* Certificate ID */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-slate-900">
                              {cert.certificate_number}
                            </span>
                            <button
                              onClick={() => handleCopy(cert.certificate_number, `cert-${cert.id}`)}
                              title="Copy Certificate ID"
                              className="text-slate-400 hover:text-indigo-600 p-0.5 rounded transition-colors"
                            >
                              {copiedCode === `cert-${cert.id}` ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 mt-0.5 flex items-center gap-1">
                            <span>VFY:</span>
                            <span className="text-indigo-600 font-semibold">{cert.verification_code}</span>
                          </div>
                        </td>

                        {/* Student Details */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-slate-100 text-indigo-700 font-bold flex items-center justify-center text-xs shrink-0 border border-slate-200">
                              {cert.student_name ? cert.student_name.charAt(0).toUpperCase() : 'S'}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 leading-snug">
                                {cert.student_name || 'Enrolled Student'}
                              </p>
                              <span className="font-mono text-[11px] font-semibold text-indigo-700 bg-indigo-50/60 px-1.5 py-0.2 rounded border border-indigo-100">
                                {cert.register_number}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Department / Course */}
                        <td className="py-3.5 px-4 max-w-[220px]">
                          <p className="font-semibold text-slate-800 truncate" title={cert.department_name}>
                            {cert.department_name || 'Academic Dept'}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate" title={cert.course_name}>
                            {cert.course_name}
                          </p>
                        </td>

                        {/* Issue Date */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                          <div className="flex items-center gap-1.5 font-medium">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            {new Date(cert.issued_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                        </td>

                        {/* Issued By */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                            <User className="w-3 h-3 text-slate-500" />
                            {cert.issued_by_name || 'Administrator'}
                          </span>
                        </td>

                        {/* Certificate Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {cert.is_valid ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Issued
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-rose-50 text-rose-700 border border-rose-200">
                              <XCircle className="w-3 h-3" /> Revoked
                            </span>
                          )}
                        </td>

                        {/* Actions (Requirement 2) */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Action: View Certificate */}
                            <button
                              id={`btn-view-cert-${cert.id}`}
                              onClick={() => handleViewCertificate(cert)}
                              className="px-2.5 py-1.5 text-[11px] font-bold text-slate-700 bg-white hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 shadow-2xs inline-flex items-center gap-1"
                              title="View Official Certificate"
                            >
                              <Eye className="w-3.5 h-3.5 text-indigo-600" />
                              View
                            </button>

                            {/* Action: Download PDF */}
                            <button
                              id={`btn-download-cert-${cert.id}`}
                              onClick={() => handleDownloadPdf(cert)}
                              disabled={downloadingId === cert.id}
                              className="px-2.5 py-1.5 text-[11px] font-bold text-slate-700 bg-white hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 shadow-2xs inline-flex items-center gap-1 disabled:opacity-50"
                              title="Download Official PDF"
                            >
                              <Download className={`w-3.5 h-3.5 text-slate-600 ${downloadingId === cert.id ? 'animate-bounce' : ''}`} />
                              PDF
                            </button>

                            {/* Action: Verify QR */}
                            <button
                              id={`btn-qr-cert-${cert.id}`}
                              onClick={() => setQrCert(cert)}
                              className="px-2.5 py-1.5 text-[11px] font-bold text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200 shadow-2xs inline-flex items-center gap-1"
                              title="Verify Certificate QR"
                            >
                              <QrCode className="w-3.5 h-3.5 text-indigo-600" />
                              Verify QR
                            </button>

                            {/* Action: Revoke Certificate (Admin only) */}
                            {cert.is_valid && (
                              <button
                                id={`btn-revoke-cert-${cert.id}`}
                                onClick={() => {
                                  setRevokingCert(cert);
                                  setRevokeReason('Administrative review and discrepancy verification');
                                }}
                                className="px-2.5 py-1.5 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors border border-amber-200 shadow-2xs inline-flex items-center gap-1"
                                title="Revoke Certificate (Admin Only)"
                              >
                                Revoke
                              </button>
                            )}

                            {/* Action: Delete Record */}
                            <button
                              id={`btn-delete-cert-${cert.id}`}
                              onClick={() => setDeletingCert(cert)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors"
                              title="Delete Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Cards View (Requirement 1 Card Alternative) */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCerts.map((cert) => (
                <div
                  key={cert.id}
                  className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div>
                    {/* Card Top */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                          Certificate ID
                        </span>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="font-mono font-bold text-slate-900 text-sm">
                            {cert.certificate_number}
                          </span>
                          <button
                            onClick={() => handleCopy(cert.certificate_number, `card-${cert.id}`)}
                            className="text-slate-400 hover:text-indigo-600 p-0.5"
                          >
                            {copiedCode === `card-${cert.id}` ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>

                      {cert.is_valid ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Issued
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-rose-50 text-rose-700 border border-rose-200">
                          <XCircle className="w-3 h-3" /> Revoked
                        </span>
                      )}
                    </div>

                    {/* Student Info */}
                    <div className="mt-3.5 space-y-2 text-xs">
                      <div>
                        <span className="text-[11px] text-slate-400 block">Student Name</span>
                        <span className="font-bold text-slate-900 text-sm">{cert.student_name}</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 block">Register Number</span>
                        <span className="font-mono font-semibold text-indigo-700">
                          {cert.register_number}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 block">Department & Course</span>
                        <span className="font-medium text-slate-800 block truncate">
                          {cert.department_name}
                        </span>
                        <span className="text-[11px] text-slate-500 block truncate">
                          {cert.course_name}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Issue Date</span>
                          <span className="font-medium text-slate-700">
                            {new Date(cert.issued_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Issued By</span>
                          <span className="font-medium text-slate-700 truncate block">
                            {cert.issued_by_name || 'Administrator'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-1.5">
                    <button
                      onClick={() => handleViewCertificate(cert)}
                      className="flex-1 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors flex items-center justify-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5 text-indigo-600" /> View
                    </button>
                    <button
                      onClick={() => handleDownloadPdf(cert)}
                      disabled={downloadingId === cert.id}
                      className="py-1.5 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors flex items-center gap-1"
                      title="Download PDF"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-600" />
                    </button>
                    <button
                      onClick={() => setQrCert(cert)}
                      className="py-1.5 px-3 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors flex items-center gap-1"
                      title="Verify QR"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                    </button>
                    {cert.is_valid && (
                      <button
                        onClick={() => {
                          setRevokingCert(cert);
                          setRevokeReason('Administrative review and discrepancy verification');
                        }}
                        className="py-1.5 px-2.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-colors"
                        title="Revoke Certificate"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Audit History Tab (Requirement 11) */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-display font-bold text-base text-slate-900">
                Cryptographic Certificate Audit Trail
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Verifiable event log tracking Certificate Issuance, Viewing, Downloads, and Revocations
              </p>
            </div>
            <button
              onClick={fetchAuditLogs}
              className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl inline-flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${auditsLoading ? 'animate-spin' : ''}`} /> Refresh Trail
            </button>
          </div>

          {auditsLoading ? (
            <div className="py-16 text-center text-xs text-slate-400">Loading audit history...</div>
          ) : auditLogs.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-500">
              No audit logs recorded for certificates yet. Actions such as issuing, viewing, downloading, or revoking will automatically be tracked here.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4">Event Timestamp</th>
                    <th className="py-3.5 px-4">Action</th>
                    <th className="py-3.5 px-4">Initiator / User</th>
                    <th className="py-3.5 px-4">Certificate Details</th>
                    <th className="py-3.5 px-4">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLogs.map((log) => {
                    let actionBadge = (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                        {log.action}
                      </span>
                    );

                    if (log.action === 'CERTIFICATE_ISSUED') {
                      actionBadge = (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Certificate Issued
                        </span>
                      );
                    } else if (log.action === 'CERTIFICATE_VIEWED') {
                      actionBadge = (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center gap-1">
                          <Eye className="w-3 h-3" /> Certificate Viewed
                        </span>
                      );
                    } else if (log.action === 'CERTIFICATE_DOWNLOADED') {
                      actionBadge = (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 inline-flex items-center gap-1">
                          <Download className="w-3 h-3" /> PDF Downloaded
                        </span>
                      );
                    } else if (log.action === 'CERTIFICATE_REVOKED') {
                      actionBadge = (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center gap-1">
                          <XCircle className="w-3 h-3" /> Certificate Revoked
                        </span>
                      );
                    }

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">{actionBadge}</td>
                        <td className="py-3.5 px-4 font-medium text-slate-800 whitespace-nowrap">
                          {log.user_email}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {log.details?.cert_number || log.details?.certificate_number ? (
                            <span className="font-mono font-bold text-slate-900 mr-2">
                              {log.details?.cert_number || log.details?.certificate_number}
                            </span>
                          ) : null}
                          {log.details?.student_name && (
                            <span className="text-slate-700">({log.details.student_name})</span>
                          )}
                          {log.details?.reason && (
                            <p className="text-[11px] text-rose-600 mt-0.5">
                              Reason: {log.details.reason}
                            </p>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                          {log.ip_address || '127.0.0.1'}
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

      {/* ========================================================================= */}
      {/* MODAL 1: VIEW CERTIFICATE (Institutional Official Document View)         */}
      {/* ========================================================================= */}
      {viewingCert && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setViewingCert(null);
          }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 my-auto max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Controls Bar (Pinned Header) */}
            <div className="flex items-center justify-between p-5 sm:p-6 pb-3.5 border-b border-slate-100 shrink-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                  Institutional Document Preview
                </span>
                {viewingCert.is_valid ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Authentic & Valid
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                    Revoked
                  </span>
                )}

                {/* View Format Switcher */}
                <div className="p-0.5 bg-slate-200/80 rounded-lg flex items-center text-xs ml-2">
                  <button
                    type="button"
                    onClick={() => setCertModalFormat('sasurie_form')}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      certModalFormat === 'sasurie_form'
                        ? 'bg-white text-indigo-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Clearance Form
                  </button>
                  <button
                    type="button"
                    onClick={() => setCertModalFormat('certificate')}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      certModalFormat === 'certificate'
                        ? 'bg-white text-indigo-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Digital Cert
                  </button>
                </div>
              </div>

              <button
                onClick={() => setViewingCert(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Certificate Body Container */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1">
              {certModalFormat === 'sasurie_form' ? (
                <SasurieDueFormView request={(viewingCert as any)?.request} />
              ) : (
                <div className="border-2 border-indigo-950/15 rounded-2xl p-5 sm:p-7 text-center space-y-5 relative overflow-hidden bg-slate-50/30">
                  {/* College Header */}
                  <div className="border-b-2 border-slate-900/10 pb-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-900 text-white flex items-center justify-center mx-auto mb-2 shadow-sm">
                      <GraduationCap className="w-7 h-7" />
                    </div>
                    <h3 className="font-display font-black text-xl text-indigo-950 uppercase tracking-tight">
                      College of Engineering
                    </h3>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                      Autonomous Institution • Approved by AICTE & Affiliated to Anna University • NAAC 'A+'
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Office of Academic Clearances & Institutional Registrar
                    </p>
                  </div>

                {/* Certificate Title */}
                <div>
                  <span className="inline-block px-3 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-900 font-display font-bold text-[11px] uppercase tracking-widest">
                    Official Institutional Clearance
                  </span>
                  <h4 className="font-display font-black text-lg text-slate-900 uppercase tracking-tight mt-2">
                    No Due Certificate
                  </h4>
                  <div className="flex flex-wrap items-center justify-center gap-3 text-xs mt-2 font-mono">
                    <span className="text-slate-500">ID: <strong className="text-slate-900">{viewingCert.certificate_number}</strong></span>
                    <span className="text-slate-500">CODE: <strong className="text-indigo-700">{viewingCert.verification_code}</strong></span>
                  </div>
                </div>

                {/* Clearance Statement */}
                <div className="bg-white/80 p-4 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed text-left">
                  This is to formally certify that{' '}
                  <strong className="text-slate-950">{viewingCert.student_name}</strong>, bearing institutional registration number{' '}
                  <strong className="text-slate-950 font-mono">{viewingCert.register_number}</strong> of the Department of{' '}
                  <strong>{viewingCert.department_name}</strong> ({viewingCert.course_name}), has cleared all institutional dues across all academic, laboratory, residential, transport, and library departments. There are no outstanding fees or liabilities pending against the student.
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left text-xs bg-slate-100/70 p-3.5 rounded-xl">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Issue Date</span>
                    <span className="font-semibold text-slate-900">
                      {new Date(viewingCert.issued_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Issued By</span>
                    <span className="font-semibold text-slate-900">
                      {viewingCert.issued_by_name || 'Administrator'}
                    </span>
                  </div>
                </div>

                {/* QR Code and Signatures */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-5 border-t border-slate-200">
                  <div className="flex items-center gap-3 text-left">
                    <div className="p-1.5 bg-white rounded-lg border border-slate-200 shadow-2xs shrink-0">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=70x70&data=${encodeURIComponent(
                          `${window.location.origin}/verify/${viewingCert.verification_code}`
                        )}`}
                        alt="Certificate QR"
                        className="w-16 h-16 object-contain"
                      />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-900 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Tamper-Proof QR
                      </p>
                      <p className="text-[10px] text-slate-400 max-w-[140px] leading-tight mt-0.5">
                        Publicly verifiable credential
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-center text-xs">
                    <div>
                      <div className="font-display italic text-indigo-900 font-semibold text-sm">
                        Dean of Academics
                      </div>
                      <div className="w-24 border-t border-slate-400 mt-1"></div>
                      <p className="text-[9px] text-slate-500 font-semibold mt-0.5">Dean (Academics)</p>
                    </div>
                    <div>
                      <div className="font-display italic text-indigo-900 font-semibold text-sm">
                        Office of Registrar
                      </div>
                      <div className="w-24 border-t border-slate-400 mt-1"></div>
                      <p className="text-[9px] text-slate-500 font-semibold mt-0.5">Registrar</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            </div>

            {/* Modal Actions Footer (Pinned Footer) */}
            <div className="p-4 sm:p-5 pt-3 border-t border-slate-100 bg-slate-50/80 shrink-0 flex flex-wrap items-center justify-between gap-2.5 z-10">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const printCert = viewingCert;
                    setViewingCert(null);
                    setQrCert(printCert);
                  }}
                  className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <QrCode className="w-3.5 h-3.5" /> Fullscreen QR
                </button>
                <Link
                  to={`/verify/${viewingCert.verification_code}`}
                  target="_blank"
                  className="px-3.5 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50 border border-indigo-200 rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open Public Verifier
                </Link>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadPdf(viewingCert)}
                  disabled={downloadingId === viewingCert.id}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Download PDF
                </button>
                <button
                  onClick={() => setViewingCert(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: VERIFY QR MODAL (Requirements 4 & 5)                            */}
      {/* ========================================================================= */}
      {qrCert && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setQrCert(null);
          }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 my-auto max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
          >
            {/* Pinned Header */}
            <div className="flex items-center justify-between p-5 pb-3.5 border-b border-slate-100 shrink-0 bg-white z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Certificate QR Verification</h4>
                  <p className="text-[11px] text-slate-400">Scan using any mobile device camera</p>
                </div>
              </div>
              <button
                onClick={() => setQrCert(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
              {/* High-Res QR Code */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-center flex flex-col items-center justify-center">
                <div className="p-2.5 bg-white rounded-2xl shadow-sm border border-slate-200">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=170x170&data=${encodeURIComponent(
                      `${window.location.origin}/verify/${qrCert.verification_code}`
                    )}`}
                    alt="QR Code Verification"
                    className="w-36 h-36 sm:w-44 sm:h-44 object-contain"
                  />
                </div>
                <p className="text-xs text-slate-600 font-medium mt-2.5">
                  Scans directly to institutional verifier
                </p>
              </div>

              {/* Required QR Details (Requirement 5) */}
              <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-400">Certificate ID:</span>
                  <span className="font-mono font-bold text-slate-900">{qrCert.certificate_number}</span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-400">Student Name:</span>
                  <span className="font-bold text-slate-900">{qrCert.student_name}</span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-400">Register Number:</span>
                  <span className="font-mono font-bold text-indigo-700">{qrCert.register_number}</span>
                </div>
                <div className="flex justify-between items-start gap-2">
                  <span className="text-slate-400 shrink-0">Course / Dept:</span>
                  <span className="font-medium text-slate-800 text-right truncate">
                    {qrCert.course_name} ({qrCert.department_name})
                  </span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-400">Issue Date:</span>
                  <span className="font-medium text-slate-800">
                    {new Date(qrCert.issued_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-400">Current Status:</span>
                  {qrCert.is_valid ? (
                    <span className="text-emerald-700 font-bold uppercase text-[10px] bg-emerald-100/70 px-2 py-0.5 rounded">
                      Authentic & Valid
                    </span>
                  ) : (
                    <span className="text-rose-700 font-bold uppercase text-[10px] bg-rose-100/70 px-2 py-0.5 rounded">
                      Revoked
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-400">Issued By:</span>
                  <span className="font-medium text-slate-800">{qrCert.issued_by_name || 'Administrator'}</span>
                </div>
              </div>
            </div>

            {/* Pinned Action Buttons Footer */}
            <div className="p-4 sm:p-5 pt-3 border-t border-slate-100 bg-slate-50/80 shrink-0 flex items-center justify-between gap-2.5 z-10">
              <Link
                to={`/verify/${qrCert.verification_code}`}
                target="_blank"
                className="flex-1 py-2.5 text-center text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open Public Verifier
              </Link>
              <button
                onClick={() => setQrCert(null)}
                className="px-5 py-2.5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: REVOKE CERTIFICATE (Requirement 2 & 12 - Admin Only)            */}
      {/* ========================================================================= */}
      {revokingCert && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setRevokingCert(null);
          }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-slate-200 my-auto max-h-[calc(100vh-2rem)] overflow-y-auto animate-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Revoke No Due Certificate</h4>
                  <p className="text-[11px] text-slate-400 font-mono">#{revokingCert.certificate_number}</p>
                </div>
              </div>
              <button
                onClick={() => setRevokingCert(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Revoking this certificate will invalidate the cryptographic verification code for student{' '}
              <strong className="text-slate-900">{revokingCert.student_name}</strong> (Reg No:{' '}
              <span className="font-mono font-semibold text-indigo-700">{revokingCert.register_number}</span>). Public verifiers will mark this credential as invalid.
            </p>

            <div className="mb-5">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Official Revocation Reason / Administrative Justification <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="input-revoke-reason"
                rows={3}
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="Specify official justification for revoking this clearance certificate..."
                className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRevokingCert(null)}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-revoke"
                onClick={confirmRevoke}
                disabled={actionLoading || !revokeReason.trim()}
                className="px-4 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {actionLoading ? 'Revoking...' : 'Confirm Revocation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: DELETE CERTIFICATE RECORD                                       */}
      {/* ========================================================================= */}
      {deletingCert && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeletingCert(null);
          }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-slate-200 my-auto max-h-[calc(100vh-2rem)] overflow-y-auto animate-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Delete Certificate Record</h4>
                  <p className="text-[11px] text-slate-400 font-mono">#{deletingCert.certificate_number}</p>
                </div>
              </div>
              <button
                onClick={() => setDeletingCert(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
              Are you sure you want to permanently delete certificate{' '}
              <strong className="text-slate-900 font-mono">#{deletingCert.certificate_number}</strong> issued to{' '}
              <strong className="text-slate-900">{deletingCert.student_name}</strong>? This action will remove the record and cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDeletingCert(null)}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-delete"
                onClick={confirmDelete}
                disabled={actionLoading}
                className="px-4 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {actionLoading ? 'Deleting...' : 'Delete Record'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: QUICK ISSUE CERTIFICATE (Eligible Approved Student Requests)   */}
      {/* ========================================================================= */}
      {showIssueModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowIssueModal(false);
          }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
        >
          <div
            className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 my-auto max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between p-5 sm:p-6 pb-3.5 border-b border-slate-100 shrink-0 bg-white z-10">
              <div>
                <h4 className="font-bold text-slate-900 text-base">Issue New Certificate</h4>
                <p className="text-xs text-slate-500">
                  Select an eligible clearance request where all departments have signed off
                </p>
              </div>
              <button
                onClick={() => setShowIssueModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto flex-1">
              {loadingRequests ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  Checking pending clearance requests...
                </div>
              ) : eligibleRequests.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500 space-y-2">
                  <Award className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="font-bold text-slate-800">No Eligible Requests Pending Issuance</p>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    Certificates can only be issued once all departmental clearance officers approve the student's request.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {eligibleRequests.map((req) => (
                    <div key={req.id} className="py-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-slate-900 text-xs">{req.student_name}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                          <span className="font-mono text-indigo-700 font-semibold">{req.student_reg_no}</span>
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-600">{req.department_name}</span>
                        </div>
                        <span className="inline-block mt-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.2 rounded">
                          All Department Approvals Complete
                        </span>
                      </div>

                      <button
                        onClick={() => handleDirectIssue(req.id)}
                        disabled={issuingRequestId === req.id}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shrink-0 disabled:opacity-50 cursor-pointer shadow-xs"
                      >
                        {issuingRequestId === req.id ? 'Minting...' : 'Issue Certificate'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 sm:p-5 pt-3 border-t border-slate-100 bg-slate-50/80 shrink-0 flex justify-end">
              <button
                onClick={() => setShowIssueModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 bg-white border border-slate-200 rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default AdminCertificatesPage;
