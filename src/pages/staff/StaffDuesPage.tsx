import React, { useState, useEffect } from 'react';
import {
  Receipt,
  PlusCircle,
  Search,
  CheckCircle2,
  Clock,
  Ban,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import api from '../../services/api';
import { DueRecord } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { AddDueModal } from '../../components/modals/AddDueModal';

export const StaffDuesPage: React.FC = () => {
  const { staffProfile } = useAuth();
  const [dues, setDues] = useState<DueRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'cleared' | 'waived'>('pending');
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<number>(0);

  const fetchDues = async () => {
    try {
      setLoading(true);
      const res = await api.get('/due-records');
      const data = Array.isArray(res.data)
        ? res.data
        : (Array.isArray(res.data?.records) ? res.data.records : []);
      setDues(data);
    } catch (err) {
      console.error('Failed to load dues', err);
      setDues([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDues();
    api.get('/staff/students').then((res) => {
      const studentList = Array.isArray(res.data)
        ? res.data
        : (Array.isArray(res.data?.students) ? res.data.students : []);
      setStudents(studentList);
      if (studentList.length > 0) setSelectedStudentId(studentList[0].id);
    });
  }, []);

  const handleWaive = async (dueId: number) => {
    const reason = window.prompt('Enter institutional justification to waive this due:');
    if (!reason || !reason.trim()) return;

    try {
      await api.patch(`/due-records/${dueId}`, {
        status: 'waived',
        remarks: `Waived: ${reason.trim()}`
      });
      fetchDues();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to waive due');
    }
  };

  const handleMarkCleared = async (dueId: number) => {
    const ref = window.prompt('Enter counter receipt / offline voucher number:', 'MANUAL-RCPT');
    if (!ref) return;

    try {
      await api.post(`/due-records/${dueId}/pay`, {
        payment_reference: ref.trim()
      });
      fetchDues();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to mark due cleared');
    }
  };

  const safeDues = Array.isArray(dues) ? dues : [];
  const safeStudents = Array.isArray(students) ? students : [];

  const filteredDues = safeDues.filter((d) => {
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
    const matchesSearch =
      search === '' ||
      d.student_name?.toLowerCase().includes(search.toLowerCase()) ||
      d.student_reg_no?.toLowerCase().includes(search.toLowerCase()) ||
      d.description?.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const selectedStudent = safeStudents.find((s) => s.id === selectedStudentId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-xl text-slate-900">
            Department Dues & Fines Ledger
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage recorded student liabilities, fees, and clearance receipts for {staffProfile?.department_name}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search dues or student..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-xs pl-8 pr-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-56"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>

          <button
            onClick={() => setIsAddOpen(true)}
            className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs inline-flex items-center gap-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5" /> Add New Due
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setStatusFilter('pending')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            statusFilter === 'pending'
              ? 'bg-rose-600 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Pending Dues ({dues.filter((d) => d.status === 'pending').length})
        </button>
        <button
          onClick={() => setStatusFilter('cleared')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            statusFilter === 'cleared'
              ? 'bg-emerald-600 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Cleared ({dues.filter((d) => d.status === 'cleared').length})
        </button>
        <button
          onClick={() => setStatusFilter('waived')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            statusFilter === 'waived'
              ? 'bg-slate-700 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Waived ({dues.filter((d) => d.status === 'waived').length})
        </button>
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            statusFilter === 'all'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All ({dues.length})
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400">Loading department dues...</div>
      ) : filteredDues.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
            <Receipt className="w-6 h-6" />
          </div>
          <h3 className="font-display font-bold text-base text-slate-900">No Records Found</h3>
          <p className="text-xs text-slate-500 mt-1">Zero dues matching your selected filter.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Student</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Particulars</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDues.map((due) => (
                  <tr key={due.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{due.student_name}</p>
                      <p className="font-mono text-[11px] text-indigo-700">{due.student_reg_no}</p>
                    </td>

                    <td className="py-3.5 px-4 text-slate-700">
                      <span className="bg-slate-100 px-2 py-0.5 rounded-full text-[10px] font-semibold text-slate-600">
                        {due.category_name}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-700 max-w-xs">
                      <p className="font-medium truncate">{due.description}</p>
                      {due.remarks && (
                        <p className="text-[10px] text-slate-400 italic truncate">"{due.remarks}"</p>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-display font-bold text-slate-900">
                        ₹{Number(due.amount || 0).toFixed(2)}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                          due.status === 'cleared'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : due.status === 'waived'
                            ? 'bg-slate-100 text-slate-600 border border-slate-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {due.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-400">
                      {new Date(due.created_at).toLocaleDateString()}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {due.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleMarkCleared(due.id)}
                            className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors border border-emerald-200"
                          >
                            Mark Paid
                          </button>
                          <button
                            onClick={() => handleWaive(due.id)}
                            className="px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                          >
                            Waive
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">Settled</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Due Modal with student picker */}
      {isAddOpen && students.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <h3 className="font-display font-bold text-slate-900 text-base">Select Student</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Student</label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(Number(e.target.value))}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-800"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name} ({s.register_number})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsAddOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => setIsAddOpen(false)}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
              >
                Continue to Due Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
