import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  BookOpen,
  FlaskConical,
  Building2,
  Check,
  FileCheck2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Printer,
  Calendar,
  User,
  GraduationCap
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { SasurieSubjectEntry, StudentDuesSummary } from '../../types';

interface ClearanceNodesResponse {
  student: {
    id: number;
    full_name: string;
    register_number: string;
    department_name: string;
    department_code: string;
    course_name: string;
    year: number;
    semester: number;
    section: string;
    student_type: string;
  };
  active_request: {
    id: number;
    status: string;
    exam_type: string;
    academic_year: string;
    submitted_at: string;
    attendance_percentage: number;
  } | null;
  academic_nodes: {
    theory: SasurieSubjectEntry[];
    labs: SasurieSubjectEntry[];
  };
  common_nodes: SasurieSubjectEntry[];
  stats: {
    total_nodes: number;
    cleared_nodes: number;
    pending_nodes: number;
    percentage: number;
    all_cleared: boolean;
  };
  certificate: {
    id: number;
    certificate_number: string;
    verification_code: string;
    issued_at: string;
    is_valid: boolean;
  } | null;
}

export const StudentRequestPage: React.FC = () => {
  const { studentProfile } = useAuth();
  const [data, setData] = useState<ClearanceNodesResponse | null>(null);
  const [summary, setSummary] = useState<StudentDuesSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Application form fields if no active request
  const [purpose, setPurpose] = useState('CIAT - I Examination No Due Clearance');
  const [examType, setExamType] = useState('CIAT - I');
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [studentType, setStudentType] = useState<'day_scholar' | 'hosteller'>(
    studentProfile?.student_type || 'day_scholar'
  );
  const [attendancePercent, setAttendancePercent] = useState<number>(
    studentProfile?.attendance_percentage ?? 98
  );
  const [attendanceMonth, setAttendanceMonth] = useState('August');
  const [remarks, setRemarks] = useState('');

  const loadClearanceData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [nodesRes, sumRes] = await Promise.all([
        api.get('/student/clearance-nodes'),
        api.get('/student/summary').catch(() => null)
      ]);
      setData(nodesRes.data);
      if (sumRes) setSummary(sumRes.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load clearance nodes data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClearanceData();
  }, []);

  const handleClaimCertificate = async () => {
    try {
      setClaiming(true);
      setError(null);
      const res = await api.post('/certificates/my/claim');
      setClaimSuccess(res.data?.message || 'Certificate issued successfully!');
      await loadClearanceData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Unable to issue certificate yet.');
    } finally {
      setClaiming(false);
    }
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const fullRemarks = `${purpose} - ${remarks}`.trim();
      await api.post('/no-due-requests', {
        remarks: fullRemarks,
        exam_type: examType,
        academic_year: academicYear,
        student_type: studentType,
        attendance_percentage: Number(attendancePercent),
        attendance_month: attendanceMonth
      });
      await loadClearanceData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to submit clearance request');
    } finally {
      setSubmitting(false);
    }
  };

  const isCleared = (status?: string) => {
    if (!status) return false;
    const s = status.trim().toLowerCase();
    if (
      s === '-' ||
      s === 'pending review' ||
      s === 'pending verification' ||
      s === 'pending' ||
      s === 'under review' ||
      s.startsWith('due:') ||
      s.includes('unpaid')
    ) {
      return false;
    }
    return (
      s === 'no dues' ||
      s === 'no due' ||
      s === 'cleared' ||
      s === 'waived' ||
      s === 'exempted' ||
      s.startsWith('exempted') ||
      s === 'verified'
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-500">Loading student clearance nodes...</p>
      </div>
    );
  }

  const student = data?.student || {
    full_name: studentProfile?.full_name || 'Student',
    register_number: studentProfile?.register_number || '',
    department_name: studentProfile?.department_name || '',
    course_name: studentProfile?.course_name || '',
    year: studentProfile?.year || 4,
    semester: studentProfile?.semester || 7,
    section: studentProfile?.section || 'A',
    student_type: studentProfile?.student_type || 'day_scholar'
  };

  const theoryNodes = data?.academic_nodes?.theory || [];
  const labNodes = data?.academic_nodes?.labs || [];
  const commonNodes = data?.common_nodes || [];
  const stats = data?.stats || {
    total_nodes: theoryNodes.length + labNodes.length + commonNodes.length,
    cleared_nodes: 0,
    pending_nodes: 0,
    percentage: 0,
    all_cleared: false
  };

  const hasCertificate = Boolean(data?.certificate);
  const activeReq = data?.active_request;
  const pendingDueAmount = Number(summary?.pending_due_amount ?? 0);
  const hasUnpaidLedgerDues = pendingDueAmount > 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-md">
              Student Clearance Dashboard
            </span>
            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
              Year {student.year} • Semester {student.semester}
            </span>
            <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md capitalize">
              {student.student_type?.replace('_', ' ')}
            </span>
          </div>
          <h2 className="font-display font-black text-xl text-slate-900 tracking-tight">
            Academic & Common Clearance Nodes
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {student.full_name} ({student.register_number}) • {student.course_name}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {hasCertificate || stats.all_cleared ? (
            <Link
              to="/student/certificate"
              id="btn-view-certificate"
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors inline-flex items-center gap-2 shadow-sm"
            >
              <Award className="w-4 h-4" /> Download Certificate
            </Link>
          ) : activeReq ? (
            <button
              onClick={handleClaimCertificate}
              disabled={claiming}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors inline-flex items-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" /> {claiming ? 'Checking...' : 'Check & Mint Certificate'}
            </button>
          ) : null}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {claimSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{claimSuccess}</span>
          </div>
          <Link
            to="/student/certificate"
            className="text-xs font-bold text-emerald-700 underline hover:text-emerald-900"
          >
            View Certificate &rarr;
          </Link>
        </div>
      )}

      {/* TOP BANNER: When all academic and common nodes are cleared vs pending */}
      {stats.all_cleared || hasCertificate ? (
        <div className="bg-linear-to-r from-emerald-500 via-teal-600 to-emerald-700 text-white rounded-2xl p-6 sm:p-8 shadow-md relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold backdrop-blur-xs">
                <Sparkles className="w-3.5 h-3.5" /> All Clearance Nodes Cleared (100%)
              </div>
              <h3 className="font-display font-extrabold text-xl sm:text-2xl text-white tracking-tight">
                Your Official No Due Certificate is Ready!
              </h3>
              <p className="text-xs sm:text-sm text-emerald-50 max-w-xl leading-relaxed">
                All HOD-allocated academic courses (Theory & Labs) for Year {student.year} Sem {student.semester} and all universal common institutional nodes have zero outstanding dues. Your verified clearance certificate has been issued!
              </p>
            </div>

            <div className="shrink-0 flex flex-col gap-2.5">
              <Link
                to="/student/certificate"
                className="px-6 py-3 rounded-xl bg-white text-emerald-800 hover:bg-emerald-50 text-xs font-black transition-all shadow-md inline-flex items-center justify-center gap-2 text-center"
              >
                <Award className="w-4 h-4" /> View Verified Certificate
              </Link>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors inline-flex items-center justify-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" /> Print Clearance Summary
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Clearance Progress Card */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-display font-bold text-slate-900 text-base flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-indigo-600" />
                Clearance Progress Status
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Clear these allocated academic and common nodes to unlock your official No Due certificate
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-extrabold text-indigo-700">
                {stats.cleared_nodes} of {stats.total_nodes} Nodes Cleared
              </span>
              <span className="text-xs font-bold text-slate-400 ml-2">
                ({stats.percentage}%)
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5">
            <div
              className="bg-linear-to-r from-indigo-500 to-emerald-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${stats.percentage}%` }}
            ></div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-slate-500 border-t border-slate-100">
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <strong className="text-slate-700">{stats.cleared_nodes}</strong> Cleared Nodes
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <strong className="text-slate-700">{stats.pending_nodes}</strong> Pending Verification
              </span>
            </div>
            <span className="text-[11px] text-slate-400 italic">
              *Only academic courses + common institutional nodes are required for certificate issuance.
            </span>
          </div>
        </div>
      )}

      {/* SECTION 1: Academic Clearance Nodes (Theory Subjects allocated by HOD) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-slate-900 text-sm">
                Academic Clearance: Theory Courses
              </h3>
              <p className="text-[11px] text-slate-500">
                Allocated by HOD for Year {student.year} • Semester {student.semester}
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-slate-600 bg-white px-3 py-1 rounded-lg border border-slate-200 self-start sm:self-auto">
            {theoryNodes.filter((s) => isCleared(s.dues_status)).length} / {theoryNodes.length} Cleared
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/30 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Slot</th>
                <th className="py-3 px-4">Subject & Course Code</th>
                <th className="py-3 px-4">In-Charge Faculty</th>
                <th className="py-3 px-4">Clearance Status</th>
                <th className="py-3 px-4 text-right">Verification Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {theoryNodes.map((sub, idx) => {
                const cleared = isCleared(sub.dues_status);
                return (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-700">
                      {sub.slot}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{sub.name}</div>
                      {sub.code && (
                        <span className="text-[10px] text-slate-400 font-mono">{sub.code}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      <div className="flex items-center gap-1.5 font-medium">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{sub.faculty_name || 'Department Faculty In-Charge'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold ${
                          cleared
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {cleared ? (
                          <>
                            <Check className="w-3 h-3 stroke-[3]" /> No Dues
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3" /> {sub.dues_status || 'Pending Verification'}
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-500 font-mono text-[11px]">
                      {sub.signature_date || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 2: Academic Clearance Nodes (Laboratories & Practicals allocated by HOD) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
              <FlaskConical className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-slate-900 text-sm">
                Academic Clearance: Laboratory & Practical Sessions
              </h3>
              <p className="text-[11px] text-slate-500">
                Allocated by HOD for Year {student.year} • Semester {student.semester}
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-slate-600 bg-white px-3 py-1 rounded-lg border border-slate-200 self-start sm:self-auto">
            {labNodes.filter((l) => isCleared(l.dues_status)).length} / {labNodes.length} Cleared
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/30 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Slot</th>
                <th className="py-3 px-4">Laboratory Course</th>
                <th className="py-3 px-4">Lab In-Charge Faculty</th>
                <th className="py-3 px-4">Clearance Status</th>
                <th className="py-3 px-4 text-right">Verification Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {labNodes.map((lab, idx) => {
                const cleared = isCleared(lab.dues_status);
                return (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-teal-700">
                      {lab.slot}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{lab.name}</div>
                      {lab.code && (
                        <span className="text-[10px] text-slate-400 font-mono">{lab.code}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      <div className="flex items-center gap-1.5 font-medium">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{lab.faculty_name || 'Lab In-Charge'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold ${
                          cleared
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {cleared ? (
                          <>
                            <Check className="w-3 h-3 stroke-[3]" /> No Dues
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3" /> {lab.dues_status || 'Pending Lab Clearance'}
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-500 font-mono text-[11px]">
                      {lab.signature_date || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 3: Common Clearance Nodes (Universal to All Students) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-slate-900 text-sm">
                Common Institutional Clearance Nodes
              </h3>
              <p className="text-[11px] text-slate-500">
                Universal requirements for all students across departments
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-slate-600 bg-white px-3 py-1 rounded-lg border border-slate-200 self-start sm:self-auto">
            {commonNodes.filter((c) => isCleared(c.dues_status)).length} / {commonNodes.length} Cleared
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
          {commonNodes.map((com, idx) => {
            const cleared = isCleared(com.dues_status);
            return (
              <div
                key={idx}
                className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                  cleared
                    ? 'bg-emerald-50/30 border-emerald-200'
                    : 'bg-slate-50/50 border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                        {com.slot}
                      </span>
                      <h4 className="font-bold text-slate-900 text-xs mt-1.5">{com.name}</h4>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                        cleared
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {cleared ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : <Clock className="w-2.5 h-2.5" />}
                      {cleared ? 'No Dues' : (com.dues_status || 'Pending Review')}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 mt-1">
                    {com.requirement_description || 'Standard institutional clearance'}
                  </p>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="font-medium text-slate-700 truncate max-w-[200px]" title={com.faculty_name}>
                    {com.faculty_name || 'Allocated Officer'}
                  </span>
                  <span className="font-mono text-[10px]">
                    {cleared && com.signature_date && com.signature_date !== '-' ? (
                      <span className="text-emerald-700 font-semibold">{com.signature_date}</span>
                    ) : (
                      <span className="text-amber-700 font-medium bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded text-[10px]">
                        Pending Review
                      </span>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* If No Active Application -> Submit No Due Request Wizard */}
      {!activeReq && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="font-display font-bold text-base text-slate-900 mb-1">
              Submit Digital No Due Application
            </h3>
            <p className="text-xs text-slate-500">
              Submit your clearance request. Your allocated academic theory courses, laboratory sessions, and universal common nodes will be submitted for institutional clearance.
            </p>
          </div>

          {hasUnpaidLedgerDues && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  You have ₹{pendingDueAmount.toFixed(2)} in outstanding dues on your fee ledger. You can clear them via the Dues page.
                </span>
              </div>
              <Link
                to="/student/dues"
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs shrink-0"
              >
                Pay Dues
              </Link>
            </div>
          )}

          <form onSubmit={handleApply} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Examination / Clearance Type
                </label>
                <select
                  value={examType}
                  onChange={(e) => setExamType(e.target.value)}
                  disabled={hasUnpaidLedgerDues}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                >
                  <option value="CIAT - I">CIAT - I</option>
                  <option value="CIAT - II">CIAT - II</option>
                  <option value="CIAT - III">CIAT - III</option>
                  <option value="End Semester Examinations">End Semester Examinations</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Academic Year
                </label>
                <input
                  type="text"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  disabled={hasUnpaidLedgerDues}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Student Category
                </label>
                <select
                  value={studentType}
                  onChange={(e) => setStudentType(e.target.value as any)}
                  disabled={hasUnpaidLedgerDues}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                >
                  <option value="day_scholar">Day Scholar</option>
                  <option value="hosteller">Hosteller</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Attendance Percentage (%)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={attendancePercent}
                    onChange={(e) => setAttendancePercent(Number(e.target.value))}
                    disabled={hasUnpaidLedgerDues}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                  />
                  <span
                    className={`text-[11px] px-2.5 py-1 rounded-lg font-bold shrink-0 ${
                      Number(attendancePercent) >= 80
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {Number(attendancePercent) >= 80 ? 'Exempted' : 'Undertaking Req.'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Month of Attendance Review
                </label>
                <input
                  type="text"
                  value={attendanceMonth}
                  onChange={(e) => setAttendanceMonth(e.target.value)}
                  disabled={hasUnpaidLedgerDues}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason / Purpose of Clearance
              </label>
              <input
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                disabled={hasUnpaidLedgerDues}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Additional Remarks (Optional)
              </label>
              <textarea
                rows={2}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                disabled={hasUnpaidLedgerDues}
                placeholder="Any special remarks or elective course details..."
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:ring-1 focus:ring-indigo-500 resize-none disabled:opacity-50"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={hasUnpaidLedgerDues || submitting}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors inline-flex items-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {submitting ? 'Submitting Application...' : (
                  <>
                    <Send className="w-4 h-4" /> Submit Digital Clearance Form
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
