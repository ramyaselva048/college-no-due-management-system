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
  Check
} from 'lucide-react';
import api from '../../services/api';
import { NoDueRequest, StudentDuesSummary } from '../../types';

export const StudentRequestPage: React.FC = () => {
  const [summary, setSummary] = useState<StudentDuesSummary | null>(null);
  const [requests, setRequests] = useState<NoDueRequest[]>([]);
  const [remarks, setRemarks] = useState('');
  const [purpose, setPurpose] = useState('Graduation & Course Completion');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sumRes, reqRes] = await Promise.all([
        api.get('/student/summary'),
        api.get('/no-due-requests')
      ]);
      setSummary(sumRes.data);
      setRequests(reqRes.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load request status');
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
      await api.post('/no-due-requests', { remarks: fullRemarks });
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

  const activeRequest = requests.find((r) => r.status !== 'rejected') || requests[0];
  const hasPendingDues = (summary?.pending_due_amount || 0) > 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="font-display font-bold text-xl text-slate-900">
          Institutional Clearance Application
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Submit and track your formal No Due application across all academic & administrative departments
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* If Active Request Exists -> Display Live Progress Tracker */}
      {activeRequest ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-indigo-700">
                  Request #{activeRequest.id}
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
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Submitted on {new Date(activeRequest.submitted_at).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </p>
            </div>

            {(activeRequest.status === 'completed' || activeRequest.status === 'approved') && (
              <Link
                to="/student/certificate"
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-xs inline-flex items-center gap-2"
              >
                <Award className="w-4 h-4" /> Download Certificate
              </Link>
            )}
          </div>

          {activeRequest.remarks && (
            <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700 border border-slate-200">
              <span className="font-semibold text-slate-500">Application Purpose: </span>
              {activeRequest.remarks}
            </div>
          )}

          {/* Department Sign-Off Grid */}
          <div>
            <h4 className="font-display font-bold text-sm text-slate-900 mb-3">
              Department Clearance Sign-offs ({activeRequest.approvals.filter((a) => a.status === 'approved').length} of {activeRequest.approvals.length} Cleared)
            </h4>

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
              Institutional policy requires complete financial clearance across all academic and residential facilities prior to submitting a No Due request.
            </p>

            {hasPendingDues ? (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-rose-800">Clearance Application Blocked</h4>
                  <p className="text-xs text-rose-700 mt-1">
                    You have ₹{summary?.pending_due_amount.toFixed(2)} in outstanding dues across one or more departments. You must settle all dues before your application can be dispatched.
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
                    Zero outstanding dues recorded across all departments. You are fully eligible to apply for clearance.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleApply} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason / Purpose of Clearance
              </label>
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                disabled={hasPendingDues}
                className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
              >
                <option value="Graduation & Final Course Completion">Graduation & Final Course Completion</option>
                <option value="Semester End Clearance">Semester End Clearance</option>
                <option value="College Transfer / Migration">College Transfer / Migration</option>
                <option value="Course Discontinuation">Course Discontinuation</option>
                <option value="Hostel Vacating & Final Exit">Hostel Vacating & Final Exit</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Additional Student Remarks (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="Mention any specific laboratory or library references..."
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
                className="px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm inline-flex items-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  'Dispatching Application...'
                ) : (
                  <>
                    <Send className="w-4 h-4" /> Dispatch Clearance Application
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
