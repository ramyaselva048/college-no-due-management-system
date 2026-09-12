import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileCheck2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Award,
  ArrowRight,
  ShieldAlert,
  Send,
  Building2,
  Check,
  FileText,
  Eye,
  Calendar,
  School,
  UserCheck
} from 'lucide-react';
import api from '../../services/api';
import { NoDueRequest, StudentDuesSummary } from '../../types';
import { SasurieDueFormView } from '../../components/SasurieDueFormView';
import { useAuth } from '../../context/AuthContext';

export const StudentRequestPage: React.FC = () => {
  const { studentProfile } = useAuth();
  const [summary, setSummary] = useState<StudentDuesSummary | null>(null);
  const [requests, setRequests] = useState<NoDueRequest[]>([]);
  const [remarks, setRemarks] = useState('');
  const [purpose, setPurpose] = useState('CIAT - I Examination No Due Form');
  const [examType, setExamType] = useState('CIAT - I');
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [studentType, setStudentType] = useState<'day_scholar' | 'hosteller'>(
    studentProfile?.student_type || 'day_scholar'
  );
  const [attendancePercent, setAttendancePercent] = useState<number>(
    studentProfile?.attendance_percentage ?? 98
  );
  const [attendanceMonth, setAttendanceMonth] = useState('August');
  const [activeTab, setActiveTab] = useState<'matrix' | 'sasurie_form'>('sasurie_form');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [sumRes, reqRes] = await Promise.all([
        api.get('/student/summary'),
        api.get('/no-due-requests').catch(() => api.get('/no-due-requests/my'))
      ]);
      setSummary(sumRes.data);
      const reqList = Array.isArray(reqRes.data)
        ? reqRes.data
        : (Array.isArray(reqRes.data?.requests) ? reqRes.data.requests : []);
      setRequests(reqList);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load request status');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to submit clearance request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-xs text-slate-400">Loading clearance workflow...</div>;
  }

  const safeRequests = Array.isArray(requests) ? requests : [];
  const activeRequest = safeRequests.find((r) => r.status !== 'rejected') || safeRequests[0];
  const pendingDueAmount = Number(summary?.pending_due_amount ?? (summary as any)?.pending_dues_amount ?? 0);
  const hasPendingDues = pendingDueAmount > 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="font-display font-bold text-xl text-slate-900">
          Sasurie Institutional Clearance & No Due Form
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Sasurie College of Engineering (Autonomous) — CIAT / End Semester Clearance System
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* If Active Request Exists -> Display Live Progress Tracker & Sasurie Form */}
      {activeRequest ? (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-indigo-700">
                    Application #{activeRequest.id}
                  </span>
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase ${
                      activeRequest.status === 'completed' || activeRequest.status === 'approved'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : activeRequest.status === 'rejected'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {activeRequest.status.replace('_', ' ')}
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-md">
                    {activeRequest.exam_type || 'CIAT - I'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Submitted on {new Date(activeRequest.submitted_at).toLocaleDateString('en-GB')} • Academic Year: {activeRequest.academic_year || '2025-26'}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {(activeRequest.status === 'completed' || activeRequest.status === 'approved') && (
                  <Link
                    to="/student/certificate"
                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-xs inline-flex items-center gap-2"
                  >
                    <Award className="w-4 h-4" /> Download Certificate
                  </Link>
                )}
              </div>
            </div>

            {/* View Switcher Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <button
                type="button"
                onClick={() => setActiveTab('sasurie_form')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'sasurie_form'
                    ? 'bg-indigo-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 bg-slate-100'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Original Sasurie No Due Form
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('matrix')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'matrix'
                    ? 'bg-indigo-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 bg-slate-100'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                Department Sign-off Matrix ({activeRequest.approvals.filter((a) => a.status === 'approved').length}/{activeRequest.approvals.length})
              </button>
            </div>

            {/* Content for Matrix Tab */}
            {activeTab === 'matrix' && (
              <div className="space-y-4 pt-2">
                {activeRequest.remarks && (
                  <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700 border border-slate-200">
                    <span className="font-semibold text-slate-500">Application Remarks: </span>
                    {activeRequest.remarks}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeRequest.approvals.map((app) => (
                    <div
                      key={app.id}
                      className={`p-4 rounded-xl border flex items-start justify-between transition-all ${
                        app.status === 'approved'
                          ? 'bg-emerald-50/50 border-emerald-200'
                          : app.status === 'rejected'
                          ? 'bg-rose-50/50 border-rose-200'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            app.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-700'
                              : app.status === 'rejected'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-white text-slate-400 border border-slate-200'
                          }`}
                        >
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{app.department_name}</p>
                          <p
                            className={`text-[11px] font-semibold mt-0.5 capitalize ${
                              app.status === 'approved'
                                ? 'text-emerald-700'
                                : app.status === 'rejected'
                                ? 'text-rose-700'
                                : 'text-slate-500'
                            }`}
                          >
                            {app.status === 'approved'
                              ? 'Clearance Granted'
                              : app.status === 'rejected'
                              ? 'Rejected'
                              : 'Pending Review'}
                          </p>
                          {app.remarks && (
                            <p className="text-[10px] text-slate-500 italic mt-1">"{app.remarks}"</p>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0">
                        {app.status === 'approved' ? (
                          <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </span>
                        ) : app.status === 'rejected' ? (
                          <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center">
                            <AlertTriangle className="w-3 h-3" />
                          </span>
                        ) : (
                          <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center">
                            <Clock className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Content for Sasurie Form Tab */}
            {activeTab === 'sasurie_form' && (
              <div className="pt-2">
                <SasurieDueFormView request={activeRequest} student={studentProfile} />
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Clearance Application Wizard */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          {/* Pre-requisite step check */}
          <div className="border-b border-slate-100 pb-6">
            <h3 className="font-display font-bold text-base text-slate-900 mb-2">
              Clearance Pre-requisites Verification
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              Sasurie College institutional policy requires zero outstanding dues across all academic departments, laboratories, library, and accounts before submitting a No Due Form.
            </p>

            {hasPendingDues ? (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-rose-800">Clearance Application Blocked</h4>
                  <p className="text-xs text-rose-700 mt-1">
                    You have ₹{pendingDueAmount.toFixed(2)} in outstanding dues. You must settle all dues before your Sasurie No Due Form can be dispatched to faculty and department heads.
                  </p>
                  <div className="mt-3">
                    <Link
                      to="/student/dues"
                      className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg inline-flex items-center gap-1.5 transition-colors"
                    >
                      Clear Dues Online Now <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-emerald-800">Pre-requisites Satisfied</h4>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Zero outstanding dues recorded! You are fully eligible to apply for your official Sasurie No Due Form.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleApply} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Examination Name
                </label>
                <select
                  value={examType}
                  onChange={(e) => setExamType(e.target.value)}
                  disabled={hasPendingDues}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
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
                  disabled={hasPendingDues}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                  placeholder="2025-26"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Student Category
                </label>
                <select
                  value={studentType}
                  onChange={(e) => setStudentType(e.target.value as any)}
                  disabled={hasPendingDues}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
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
                    disabled={hasPendingDues}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
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
                <p className="text-[10px] text-slate-400 mt-1">
                  Students with attendance ≥ 80% are exempted from Undertaking Form (Clause 4 of Sasurie form).
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Month of Attendance Review
                </label>
                <input
                  type="text"
                  value={attendanceMonth}
                  onChange={(e) => setAttendanceMonth(e.target.value)}
                  disabled={hasPendingDues}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                  placeholder="e.g. August"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason / Purpose of Clearance
              </label>
              <input
                type="text"
                list="student-clearance-purpose-list"
                placeholder="Type reason or purpose of clearance..."
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                disabled={hasPendingDues}
                className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
              />
              <datalist id="student-clearance-purpose-list">
                <option value="CIAT - I Examination No Due Clearance" />
                <option value="CIAT - II Examination No Due Clearance" />
                <option value="End Semester Examinations Hall Ticket" />
                <option value="Final Course Completion & Degree Clearance" />
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Additional Student Remarks (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Mention any specific elective or laboratory details..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                disabled={hasPendingDues}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none disabled:opacity-50"
              />
            </div>

            <div className="pt-2 flex items-center justify-end">
              <button
                id="btn-submit-clearance"
                type="submit"
                disabled={hasPendingDues || submitting}
                className="px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm inline-flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  'Dispatching Application...'
                ) : (
                  <>
                    <Send className="w-4 h-4" /> Submit Official Sasurie No Due Form
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
