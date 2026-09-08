import React, { useState } from 'react';
import { X, CreditCard, ShieldCheck, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import { DueRecord } from '../../types';

interface PayDueModalProps {
  due: DueRecord;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const PayDueModal: React.FC<PayDueModalProps> = ({ due, isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'netbanking' | 'card'>('upi');
  const [refId, setRefId] = useState(`TXN-${Math.floor(100000 + Math.random() * 900000)}`);

  if (!isOpen) return null;

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.post(`/due-records/${due.id}/pay`, {
        payment_reference: refId
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Payment processing failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-600" />
            <h3 className="font-display font-bold text-slate-900 text-base">Clear Due Online</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handlePay} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Due Info */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Department:</span>
              <span className="font-semibold text-slate-900">{due.department_name}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Particulars:</span>
              <span className="font-semibold text-slate-900">{due.description}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
              <span className="text-xs font-bold text-slate-700">Total Outstanding:</span>
              <span className="font-display font-extrabold text-lg text-indigo-600">₹{due.amount.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">Select Clearance Mode</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('upi')}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all ${
                  paymentMethod === 'upi'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                UPI / QR
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('netbanking')}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all ${
                  paymentMethod === 'netbanking'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Net Banking
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all ${
                  paymentMethod === 'card'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Debit Card
              </button>
            </div>
          </div>

          {/* Transaction Ref */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Generated Transaction Ref</label>
            <input
              type="text"
              value={refId}
              onChange={(e) => setRefId(e.target.value)}
              className="w-full text-xs font-mono px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              required
            />
            <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              Audit-verified institution gateway simulation
            </p>
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
              id="btn-confirm-pay"
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              {loading ? (
                'Processing...'
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Confirm & Clear ₹{due.amount.toFixed(2)}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
