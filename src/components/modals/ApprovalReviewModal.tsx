import React, { useState } from 'react';
import { X, CheckCircle, AlertTriangle, XCircle, ShieldAlert } from 'lucide-react';
import api from '../../services/api';

interface ApprovalReviewModalProps {
  approval: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ApprovalReviewModal: React.FC<ApprovalReviewModalProps> = ({
  approval,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [status, setStatus] = useState<'approved' | 'rejected'>('approved');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !approval) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'rejected' && !remarks.trim()) {
      setError('Please provide a reason for rejecting the clearance.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.patch(`/no-due-approvals/${approval.id}`, {
        status,
        remarks: remarks.trim() || undefined
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update clearance status');
    } finally {
      setLoading(false);
    }
  };

  const hasPendingDues = approval.has_pending_dues;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-display font-bold text-slate-900 text-base">Department Clearance Review</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Student details card */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Student:</span>
              <span className="font-bold text-slate-900">{approval.student_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Register Number:</span>
              <span className="font-mono font-bold text-indigo-700">{approval.student_reg_no}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Program / Year:</span>
              <span className="font-medium text-slate-800">{approval.course_name} ({approval.academic_year})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Department Reviewing:</span>
              <span className="font-semibold text-slate-900">{approval.department_name}</span>
            </div>
          </div>

          {/* Dues Alert */}
          {hasPendingDues ? (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-rose-800">Uncleared Department Dues</p>
                <p className="text-[11px] text-rose-700 mt-0.5">
                  Student has ₹{Number(approval.pending_dues_amount || 0).toFixed(2)} in outstanding dues in this department. Institutional regulations prohibit approving clearance until fully settled.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <p className="text-xs font-medium text-emerald-800">
                Zero dues recorded in this department. Student is eligible for clearance approval.
              </p>
            </div>
          )}

          {/* Decision */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">Clearance Decision</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={hasPendingDues}
                onClick={() => setStatus('approved')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  status === 'approved'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-700 shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                } ${hasPendingDues ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                Approve Clearance
              </button>
              <button
                type="button"
                onClick={() => setStatus('rejected')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  status === 'rejected'
                    ? 'border-rose-600 bg-rose-50 text-rose-700 shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <XCircle className="w-4 h-4 text-rose-600" />
                Reject Clearance
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Remarks {status === 'rejected' && <span className="text-rose-500">* (Required)</span>}
            </label>
            <textarea
              rows={3}
              placeholder={status === 'approved' ? 'Optional verification notes' : 'State reason for rejection...'}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
              required={status === 'rejected'}
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg"
            >
              Cancel
            </button>
            <button
              id="btn-confirm-review"
              type="submit"
              disabled={loading || (status === 'approved' && hasPendingDues)}
              className={`px-5 py-2 text-xs font-bold text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50 ${
                status === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {loading ? 'Submitting...' : status === 'approved' ? 'Confirm Approval' : 'Confirm Rejection'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
