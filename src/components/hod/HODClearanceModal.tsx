import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowLeft,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Check,
  AlertTriangle,
  BookOpen,
  UserCheck,
  Printer,
  FileText,
  Building2
} from 'lucide-react';
import api from '../../services/api';
import { SasurieDueFormView } from '../SasurieDueFormView';

interface HODClearanceModalProps {
  request: any | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export const HODClearanceModal: React.FC<HODClearanceModalProps> = ({
  request,
  isOpen,
  onClose,
  onUpdated
}) => {
  const [activeTab, setActiveTab] = useState<'manage' | 'form'>('manage');
  const [currentRequest, setCurrentRequest] = useState<any>(request);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [hodRemarks, setHodRemarks] = useState(
    'All departmental theory subjects, laboratory records, and equipment clearances verified and approved.'
  );

  useEffect(() => {
    setCurrentRequest(request);
    setActionFeedback(null);
    if (request?.signatories?.hod?.remarks) {
      setHodRemarks(request.signatories.hod.remarks);
    }
  }, [request]);

  // Handle ESC key to exit modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !currentRequest) return null;

  const handleSignOffHOD = async () => {
    try {
      setActionLoading(true);
      const res = await api.post(`/hod/requests/${currentRequest.id}/sign-off`, {
        remarks: hodRemarks
      });
      setActionFeedback('Official HOD Endorsement has been digitally signed and sealed.');
      setCurrentRequest(res.data.request);
      onUpdated();
    } catch (err: any) {
      setActionFeedback(err.response?.data?.detail || 'Failed to sign off endorsement.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClearSubjectDue = async (slot: string) => {
    try {
      setActionLoading(true);
      const res = await api.post(`/hod/requests/${currentRequest.id}/clear-subject`, {
        slot
      });
      setActionFeedback(`Clearance granted for ${slot}.`);
      setCurrentRequest(res.data.request);
      onUpdated();
    } catch (err: any) {
      setActionFeedback(err.response?.data?.detail || 'Failed to clear subject due.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkSubjectDue = async (slot: string) => {
    const amount = window.prompt(`Enter pending fee/breakage amount for ${slot} (in ₹):`, '250');
    if (amount === null) return;

    try {
      setActionLoading(true);
      const res = await api.post(`/hod/requests/${currentRequest.id}/mark-subject-due`, {
        slot,
        amount: Number(amount) || 0,
        description: `Pending ${slot} Due: ₹${amount}`
      });
      setActionFeedback(`Due registered for ${slot}.`);
      setCurrentRequest(res.data.request);
      onUpdated();
    } catch (err: any) {
      setActionFeedback(err.response?.data?.detail || 'Failed to mark due.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      onClick={onClose}
      id="hod-clearance-modal-overlay"
    >
      <div
        className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] my-auto animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
        id="hod-clearance-modal-card"
      >
        {/* Sticky Header with prominent EXIT buttons */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-white rounded-t-2xl flex flex-wrap items-center justify-between gap-3 sticky top-0 z-20 shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors inline-flex items-center gap-1.5 text-xs font-bold shadow-2xs cursor-pointer"
              title="Exit Clearance Form (Esc)"
              id="btn-exit-clearance-top"
            >
              <ArrowLeft className="w-4 h-4 text-slate-600" />
              <span>Exit Form</span>
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-sm sm:text-base text-slate-900">
                  {currentRequest.student_name}
                </h3>
                <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200">
                  {currentRequest.student_reg_no}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Year {currentRequest.year}, Semester {currentRequest.semester} • Section {currentRequest.section || 'A'} ({currentRequest.course_name || 'Engineering'})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab switch */}
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab('manage')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'manage'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Clearance Sign-off
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('form')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'form'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Official Form Sheet
              </button>
            </div>

            {/* Quick Exit X button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Close modal (Esc)"
              id="btn-close-x"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {actionFeedback && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs font-semibold flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{actionFeedback}</span>
              </div>
              <button
                type="button"
                onClick={() => setActionFeedback(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {activeTab === 'form' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <p className="text-xs text-slate-500 font-medium">
                  Official College No Due Certificate Form replica (Tamil Nadu Regulation format).
                </p>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Form
                </button>
              </div>
              <SasurieDueFormView request={currentRequest} />
            </div>
          ) : (
            <div className="space-y-5">
              {/* Theory Subjects Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-amber-600" />
                    Allocated Theory Subjects (Sub 1 - Sub 6)
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Allocated by HOD • Cleared by Assigned Faculty
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase">
                      <tr>
                        <th className="px-3.5 py-2.5">Slot</th>
                        <th className="px-3.5 py-2.5">Subject & Code</th>
                        <th className="px-3.5 py-2.5">In-Charge Faculty</th>
                        <th className="px-3.5 py-2.5">Dues Status</th>
                        <th className="px-3.5 py-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(currentRequest.subjects || []).map((sub: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/60">
                          <td className="px-3.5 py-2.5 font-mono font-bold text-slate-700">
                            {sub.slot}
                          </td>
                          <td className="px-3.5 py-2.5">
                            <div className="font-semibold text-slate-900">
                              {sub.subject_name || sub.title || sub.name}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">{sub.code}</div>
                          </td>
                          <td className="px-3.5 py-2.5 text-slate-600">
                            {sub.faculty_name || 'Staff In-Charge'}
                          </td>
                          <td className="px-3.5 py-2.5">
                            {sub.dues_status === 'No Dues' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                                <Check className="w-3 h-3" /> No Dues
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                {sub.dues_status || 'Pending Dues'}
                              </span>
                            )}
                          </td>
                          <td className="px-3.5 py-2.5 text-right space-x-1">
                            {sub.dues_status === 'No Dues' ? (
                              <button
                                type="button"
                                onClick={() => handleMarkSubjectDue(sub.slot)}
                                disabled={actionLoading}
                                className="text-[10px] text-rose-600 hover:underline font-semibold cursor-pointer"
                              >
                                Mark Due
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleClearSubjectDue(sub.slot)}
                                disabled={actionLoading}
                                className="px-2.5 py-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-md border border-emerald-300 cursor-pointer"
                              >
                                Clear Due
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Practical Labs Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    Allocated Practical Labs (Lab 1 - Lab 4)
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Allocated by HOD • Cleared by Lab In-Charge
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase">
                      <tr>
                        <th className="px-3.5 py-2.5">Slot</th>
                        <th className="px-3.5 py-2.5">Practical Course & Code</th>
                        <th className="px-3.5 py-2.5">Lab In-Charge</th>
                        <th className="px-3.5 py-2.5">Dues Status</th>
                        <th className="px-3.5 py-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(currentRequest.labs || []).map((lab: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/60">
                          <td className="px-3.5 py-2.5 font-mono font-bold text-slate-700">
                            {lab.slot}
                          </td>
                          <td className="px-3.5 py-2.5">
                            <div className="font-semibold text-slate-900">
                              {lab.lab_name || lab.title || lab.name}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">{lab.code}</div>
                          </td>
                          <td className="px-3.5 py-2.5 text-slate-600">
                            {lab.faculty_name || 'Lab Instructor'}
                          </td>
                          <td className="px-3.5 py-2.5">
                            {lab.dues_status === 'No Dues' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                                <Check className="w-3 h-3" /> No Dues
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                {lab.dues_status || 'Pending Dues'}
                              </span>
                            )}
                          </td>
                          <td className="px-3.5 py-2.5 text-right space-x-1">
                            {lab.dues_status === 'No Dues' ? (
                              <button
                                type="button"
                                onClick={() => handleMarkSubjectDue(lab.slot)}
                                disabled={actionLoading}
                                className="text-[10px] text-rose-600 hover:underline font-semibold cursor-pointer"
                              >
                                Mark Due
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleClearSubjectDue(lab.slot)}
                                disabled={actionLoading}
                                className="px-2.5 py-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-md border border-emerald-300 cursor-pointer"
                              >
                                Clear Due
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Head of Department Digital Endorsement Card */}
              <div className="bg-linear-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-5 h-5 text-amber-700" />
                    <div>
                      <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                        Head of Department (HOD) Official Endorsement
                      </h4>
                      <p className="text-[11px] text-amber-800/80">
                        Institutional sign-off certifying department clearance for Anna University / Controller of Examinations
                      </p>
                    </div>
                  </div>

                  {currentRequest.hod_endorsed ? (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1.5 shadow-2xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Endorsed ({currentRequest.signatories?.hod?.date || 'Signed'})
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-200 text-amber-900 border border-amber-300">
                      Awaiting HOD Signature
                    </span>
                  )}
                </div>

                <div className="mt-3">
                  <label className="block text-[11px] font-bold text-amber-900 mb-1">
                    Department Recommendation / Remarks:
                  </label>
                  <input
                    type="text"
                    value={hodRemarks}
                    onChange={(e) => setHodRemarks(e.target.value)}
                    disabled={currentRequest.hod_endorsed}
                    className="w-full text-xs p-2.5 border border-amber-300 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                {!currentRequest.hod_endorsed && (
                  <div className="mt-3.5 flex justify-end">
                    <button
                      type="button"
                      onClick={handleSignOffHOD}
                      disabled={actionLoading}
                      className="px-5 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                      id="btn-hod-sign-endorsement"
                    >
                      <Check className="w-4 h-4" />
                      {actionLoading ? 'Signing Endorsement...' : 'Digitally Endorse Clearance Form'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sticky Footer with Clear Exit & Action Controls */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 rounded-b-2xl flex items-center justify-between sticky bottom-0 z-20">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors shadow-2xs inline-flex items-center gap-1.5 cursor-pointer"
            id="btn-exit-clearance-bottom"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-600" />
            <span>← Exit Clearance Form</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              Press <kbd className="px-1.5 py-0.5 bg-slate-200 rounded text-slate-600 font-mono text-[10px]">Esc</kbd> or click outside to exit
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl transition-colors shadow-xs cursor-pointer"
            >
              Done & Return
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
