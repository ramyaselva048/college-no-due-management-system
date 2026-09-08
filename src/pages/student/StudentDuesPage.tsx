import React, { useState, useEffect } from 'react';
import {
  Receipt,
  CreditCard,
  CheckCircle2,
  Clock,
  Building2,
  AlertCircle,
  Filter,
  ShieldCheck
} from 'lucide-react';
import api from '../../services/api';
import { DueRecord } from '../../types';
import { PayDueModal } from '../../components/modals/PayDueModal';

export const StudentDuesPage: React.FC = () => {
  const [dues, setDues] = useState<DueRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'cleared'>('all');
  const [selectedDueForPayment, setSelectedDueForPayment] = useState<DueRecord | null>(null);

  const fetchDues = async () => {
    try {
      setLoading(true);
      const res = await api.get('/due-records');
      setDues(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load dues records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDues();
  }, []);

  const filteredDues = dues.filter((d) => {
    if (filter === 'all') return true;
    return d.status === filter;
  });

  const totalPending = dues
    .filter((d) => d.status === 'pending')
    .reduce((sum, d) => sum + d.amount, 0);

  const totalCleared = dues
    .filter((d) => d.status === 'cleared')
    .reduce((sum, d) => sum + d.amount, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-xl text-slate-900">
            Dues & Academic Fee Ledger
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Track and resolve outstanding departmental fines, lab breakage fees, and library charges
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] text-slate-400 font-semibold block">Outstanding Balance</span>
            <span className={`font-display font-bold text-base ${totalPending > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              ₹{totalPending.toFixed(2)}
            </span>
          </div>

          <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] text-slate-400 font-semibold block">Settled Amount</span>
            <span className="font-display font-bold text-base text-slate-900">
              ₹{totalCleared.toFixed(2)}
            </span>
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
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            filter === 'all'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All Records ({dues.length})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            filter === 'pending'
              ? 'bg-rose-600 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Pending Dues ({dues.filter((d) => d.status === 'pending').length})
        </button>
        <button
          onClick={() => setFilter('cleared')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            filter === 'cleared'
              ? 'bg-emerald-600 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Cleared ({dues.filter((d) => d.status === 'cleared').length})
        </button>
      </div>

      {/* Dues Cards / Table */}
      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400">Loading dues registry...</div>
      ) : filteredDues.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="font-display font-bold text-base text-slate-900">
            No Dues in this Category
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {filter === 'pending'
              ? 'Congratulations! You have zero outstanding dues across all college departments.'
              : 'No fee records found.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredDues.map((due) => (
            <div
              key={due.id}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    due.status === 'pending'
                      ? 'bg-rose-50 text-rose-600'
                      : due.status === 'cleared'
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{due.department_name}</span>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                      {due.category_name}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        due.status === 'pending'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : due.status === 'cleared'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {due.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 font-medium mt-1">{due.description}</p>
                  {due.remarks && (
                    <p className="text-[11px] text-slate-400 mt-0.5 italic">
                      Remarks: {due.remarks}
                    </p>
                  )}
                  <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Recorded on {new Date(due.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                <div className="text-left sm:text-right">
                  <span className="text-[10px] text-slate-400 font-semibold block">Fee Amount</span>
                  <span className={`font-display font-extrabold text-lg ${due.status === 'pending' ? 'text-rose-600' : 'text-slate-800'}`}>
                    ₹{due.amount.toFixed(2)}
                  </span>
                </div>

                {due.status === 'pending' && (
                  <button
                    onClick={() => setSelectedDueForPayment(due)}
                    className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    Pay Online
                  </button>
                )}

                {due.status === 'cleared' && (
                  <div className="flex items-center gap-1 text-emerald-700 text-xs font-bold bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                    <ShieldCheck className="w-4 h-4" />
                    Cleared
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pay Online Modal */}
      {selectedDueForPayment && (
        <PayDueModal
          due={selectedDueForPayment}
          isOpen={!!selectedDueForPayment}
          onClose={() => setSelectedDueForPayment(null)}
          onSuccess={fetchDues}
        />
      )}
    </div>
  );
};
